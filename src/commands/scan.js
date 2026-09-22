const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const config = require('../core/config');
const { walkFiles } = require('../utils/walk');
const { matchCodeLine } = require('../core/code-rules');
const { matchLine, isIgnoredPath, redact } = require('../core/secret-patterns');
const { displayMonetizationMessage } = require('../utils/monetization');

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_COLOR = {
  critical: pc.red,
  high: pc.yellow,
  medium: pc.yellow,
  low: pc.cyan
};

const SCANNED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.php', '.py', '.rb', '.go', '.java',
  '.json', '.yml', '.yaml', '.env', '.sh', '.tf'
];

/**
 * Analyse one file line by line.
 * @param {string} filePath absolute path
 * @param {string} relativePath path shown in the report
 * @returns {Array<object>} issues
 */
function analyzeFile(filePath, relativePath) {
  const issues = [];
  const ext = path.extname(filePath);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return issues;
  }

  const lines = content.split(/\r?\n/);
  const skipSecrets = isIgnoredPath(relativePath);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const finding of matchCodeLine(line, ext)) {
      issues.push({
        file: relativePath,
        line: lineNumber,
        rule: finding.id,
        name: finding.name,
        severity: finding.severity,
        message: finding.explain,
        fix: finding.fix
      });
    }

    if (skipSecrets) return;

    for (const finding of matchLine(line)) {
      issues.push({
        file: relativePath,
        line: lineNumber,
        rule: 'hardcoded-secret',
        name: finding.rule,
        severity: finding.severity,
        message: `Secret potentiel en dur (${redact(finding.match)})`,
        fix: 'Déplacez la valeur dans une variable d\'environnement et révoquez la clé.'
      });
    }
  });

  return issues;
}

/**
 * Compare a semver-ish range against a minimum safe version.
 * @param {string} declared e.g. "^4.17.15"
 * @param {string} minimum e.g. "4.17.21"
 * @returns {boolean} true when declared may resolve below minimum
 */
function isBelowVersion(declared, minimum) {
  const clean = String(declared).replace(/^[\^~>=<\s]*/, '');
  const parse = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);

  const [dMajor, dMinor, dPatch] = parse(clean);
  const [mMajor, mMinor, mPatch] = parse(minimum);

  if (dMajor !== mMajor) return dMajor < mMajor;
  if (dMinor !== mMinor) return dMinor < mMinor;
  return dPatch < mPatch;
}

const KNOWN_VULNERABLE = [
  { name: 'lodash', minimum: '4.17.21', note: 'prototype pollution (CVE-2021-23337)' },
  { name: 'axios', minimum: '1.6.0', note: 'SSRF / redirection (CVE-2023-45857)' },
  { name: 'express', minimum: '4.19.2', note: 'open redirect (CVE-2024-29041)' },
  { name: 'minimist', minimum: '1.2.6', note: 'prototype pollution (CVE-2021-44906)' },
  { name: 'node-fetch', minimum: '2.6.7', note: 'fuite d\'en-têtes (CVE-2022-0235)' },
  { name: 'semver', minimum: '7.5.2', note: 'ReDoS (CVE-2022-25883)' },
  { name: 'ws', minimum: '8.17.1', note: 'DoS par en-têtes (CVE-2024-37890)' },
  { name: 'tar', minimum: '6.2.1', note: 'traversée de chemin (CVE-2024-28863)' }
];

/**
 * Check declared dependency versions against a small curated advisory list.
 * @param {string} packageJsonPath
 * @returns {Array<object>}
 */
function checkDependencies(packageJsonPath) {
  const issues = [];

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch {
    return issues;
  }

  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  for (const advisory of KNOWN_VULNERABLE) {
    const declared = allDeps[advisory.name];
    if (!declared || typeof declared !== 'string') continue;
    if (!/^[\^~>=<\d]/.test(declared)) continue; // skip "workspace:*", git urls…

    if (isBelowVersion(declared, advisory.minimum)) {
      issues.push({
        file: 'package.json',
        line: 0,
        rule: 'vulnerable-dependency',
        name: 'Dépendance vulnérable',
        severity: 'high',
        message: `${advisory.name}@${declared} — ${advisory.note}`,
        fix: `Mettez à jour ${advisory.name} vers >= ${advisory.minimum}`
      });
    }
  }

  return issues;
}

/**
 * Run the full static security scan on a directory.
 * @param {string} rootDir
 * @returns {{issues: Array<object>, fileCount: number}}
 */
function runScan(rootDir) {
  const issues = [];
  let fileCount = 0;

  for (const filePath of walkFiles(rootDir, { extensions: SCANNED_EXTENSIONS })) {
    fileCount += 1;
    const relativePath = path.relative(rootDir, filePath) || path.basename(filePath);
    issues.push(...analyzeFile(filePath, relativePath));
  }

  const packageJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    issues.push(...checkDependencies(packageJsonPath));
  }

  issues.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
  );

  return { issues, fileCount };
}

/**
 * flash-dev scan — static security analysis of the project.
 * @param {object} [options]
 * @returns {Promise<number>} exit code
 */
async function scanCommand(options = {}) {
  const asJson = Boolean(options.json) || config.isJson();
  const rootDir = process.cwd();

  if (!asJson) {
    console.log(pc.cyan('flash-dev scan - Analyse de sécurité statique\n'));
    console.log(pc.yellow(`Répertoire: ${rootDir}\n`));
  }

  const { issues, fileCount } = runScan(rootDir);

  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length
  };

  if (asJson) {
    console.log(JSON.stringify({ filesScanned: fileCount, counts, issues }, null, 2));
    process.exitCode = counts.critical > 0 ? 1 : 0;
    return process.exitCode;
  }

  console.log(pc.green(`${fileCount} fichier(s) analysé(s)\n`));

  if (issues.length === 0) {
    console.log(pc.green('Aucun problème détecté.'));
    console.log(pc.cyan('Votre projet passe l\'analyse statique.\n'));
    displayMonetizationMessage();
    return 0;
  }

  console.log(pc.bold('Résumé:'));
  console.log(pc.red(`  Critique : ${counts.critical}`));
  console.log(pc.yellow(`  Élevé    : ${counts.high}`));
  console.log(pc.yellow(`  Moyen    : ${counts.medium}`));
  console.log(pc.cyan(`  Faible   : ${counts.low}\n`));

  // Group by rule so a repeated pattern is one block, not 200 lines of noise
  const byRule = new Map();
  for (const issue of issues) {
    if (!byRule.has(issue.rule)) byRule.set(issue.rule, []);
    byRule.get(issue.rule).push(issue);
  }

  for (const [, group] of byRule) {
    const first = group[0];
    const color = SEVERITY_COLOR[first.severity] || pc.white;
    const uniformMessage = group.every((issue) => issue.message === first.message);

    console.log(color(`${first.severity.toUpperCase()} · ${first.name} (${group.length})`));
    if (uniformMessage) {
      console.log(pc.gray(`  ${first.message}`));
    }

    for (const issue of group.slice(0, 5)) {
      const location = issue.line > 0 ? `${issue.file}:${issue.line}` : issue.file;
      console.log(color(`    ${location}`));
      if (!uniformMessage) {
        console.log(pc.gray(`      ${issue.message}`));
        console.log(pc.cyan(`      → ${issue.fix}`));
      }
    }

    if (group.length > 5) {
      console.log(pc.gray(`    … et ${group.length - 5} autre(s)`));
    }

    console.log(uniformMessage ? pc.cyan(`  → ${first.fix}\n`) : '');
  }

  console.log(pc.gray('Sortie machine: flash-dev scan --json\n'));
  displayMonetizationMessage();

  process.exitCode = counts.critical > 0 ? 1 : 0;
  return process.exitCode;
}

module.exports = scanCommand;
module.exports.runScan = runScan;
module.exports.analyzeFile = analyzeFile;
module.exports.isBelowVersion = isBelowVersion;
