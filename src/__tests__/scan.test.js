const fs = require('fs');
const os = require('os');
const path = require('path');
const { FAKE } = require('./fixtures');
const { runScan, analyzeFile, isBelowVersion } = require('../commands/scan');

let workDir;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-scan-'));
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

const write = (name, content) => {
  const filePath = path.join(workDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
};

describe('scan', () => {
  test('ne signale rien sur un projet sain', () => {
    write('app.js', 'const sum = (a, b) => a + b;\nmodule.exports = sum;\n');
    write('package.json', '{"name":"clean","version":"1.0.0"}');

    expect(runScan(workDir).issues).toHaveLength(0);
  });

  // Regression: the /g flag made .test() skip every second occurrence
  test('signale les quatre occurrences identiques', () => {
    write('vuln.js', [
      'const q1 = `SELECT * FROM users WHERE id = ${a}`;',
      'const q2 = `SELECT * FROM users WHERE id = ${b}`;',
      'const q3 = `SELECT * FROM users WHERE id = ${c}`;',
      'const q4 = `SELECT * FROM users WHERE id = ${d}`;'
    ].join('\n'));

    const sqlIssues = runScan(workDir).issues.filter((i) => i.rule === 'sql-injection');
    expect(sqlIssues).toHaveLength(4);
    expect(sqlIssues.map((i) => i.line)).toEqual([1, 2, 3, 4]);
  });

  test('détecte un secret en dur dans un fichier source', () => {
    write('config.js', `const k = "${FAKE.githubToken}";`);

    const issues = runScan(workDir).issues;
    expect(issues.some((i) => i.rule === 'hardcoded-secret')).toBe(true);
  });

  test('ignore node_modules', () => {
    write('node_modules/evil/index.js', 'execSync(`rm -rf ${x}`);');
    expect(runScan(workDir).issues).toHaveLength(0);
  });

  test('respecte .flashdevignore', () => {
    write('generated.js', 'const q = `SELECT * FROM t WHERE id = ${id}`;');
    write('.flashdevignore', 'generated.js\n');
    expect(runScan(workDir).issues).toHaveLength(0);
  });

  test('détecte une dépendance vulnérable déclarée', () => {
    write('package.json', '{"name":"x","dependencies":{"lodash":"^4.17.15"}}');

    const issues = runScan(workDir).issues.filter((i) => i.rule === 'vulnerable-dependency');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/lodash/);
  });

  test('ne signale pas une dépendance à jour', () => {
    write('package.json', '{"name":"x","dependencies":{"lodash":"^4.17.21"}}');
    expect(runScan(workDir).issues.filter((i) => i.rule === 'vulnerable-dependency')).toHaveLength(0);
  });

  test('analyzeFile retourne des emplacements exacts', () => {
    const filePath = write('a.js', 'line1\nconst r = eval(x);\nline3\n');
    const issues = analyzeFile(filePath, 'a.js');
    expect(issues[0]).toMatchObject({ file: 'a.js', line: 2 });
  });

  describe('isBelowVersion', () => {
    test.each([
      ['^4.17.15', '4.17.21', true],
      ['^4.17.21', '4.17.21', false],
      ['^5.0.0', '4.17.21', false],
      ['~1.2.0', '1.2.6', true],
      ['0.21.0', '1.6.0', true],
      ['2.0.0', '1.6.0', false]
    ])('%s < %s = %s', (declared, minimum, expected) => {
      expect(isBelowVersion(declared, minimum)).toBe(expected);
    });
  });
});
