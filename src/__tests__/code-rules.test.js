const { matchCodeLine, CODE_RULES } = require('../core/code-rules');

const ids = (line, ext = '.js') => matchCodeLine(line, ext).map((f) => f.id);

describe('code-rules', () => {
  describe('injection SQL', () => {
    test.each([
      ['SELECT interpolé', 'const q = `SELECT * FROM users WHERE id = ${userId}`;'],
      ['concaténation', 'const q = "SELECT * FROM users WHERE id = " + userId;'],
      ['DELETE', 'db.query(`DELETE FROM sessions WHERE token = ${t}`)'],
      ['UPDATE', 'db.query(`UPDATE users SET name = ${name} WHERE id = 1`)']
    ])('détecte %s', (_label, line) => {
      expect(ids(line)).toContain('sql-injection');
    });

    // Regression: plain concatenation was reported as CRITICAL SQL injection
    test.each([
      ['const full = "Hello, " + "world";'],
      ['const a = "x" + "y";'],
      ['const message = prefix + suffix;']
    ])('ne signale pas la concaténation ordinaire: %s', (line) => {
      expect(ids(line)).not.toContain('sql-injection');
    });

    // Regression: `array.join(', ')` matched the bare SQL keyword JOIN
    test.each([
      ['console.log(`Commande : ${file} ${args.join(\' \')}`);'],
      ['const list = `${items.join(", ")}`;'],
      ['store.update(`${key}`);']
    ])('ne confond pas une méthode homonyme: %s', (line) => {
      expect(ids(line)).not.toContain('sql-injection');
    });

    test('ne signale pas une requête paramétrée', () => {
      expect(ids('db.query("SELECT * FROM users WHERE id = $1", [userId]);')).not.toContain('sql-injection');
    });
  });

  describe('injection shell', () => {
    test('détecte une interpolation dans execSync', () => {
      expect(ids('execSync(`rm -rf ${userPath}`);')).toContain('shell-injection');
    });

    test('ne signale pas une forme argv', () => {
      expect(ids("spawnSync('rm', ['-rf', userPath]);")).not.toContain('shell-injection');
    });

    test('ne signale pas une commande statique', () => {
      expect(ids("execSync('npm install');")).not.toContain('shell-injection');
    });
  });

  describe('autres règles', () => {
    test('détecte eval', () => {
      expect(ids('const r = eval(input);')).toContain('eval-usage');
    });

    test('ne confond pas une propriété nommée eval', () => {
      expect(ids('const r = obj.evaluate(input);')).not.toContain('eval-usage');
    });

    test('détecte md5', () => {
      expect(ids("crypto.createHash('md5').update(p)")).toContain('weak-crypto');
    });

    test('détecte Math.random pour un token', () => {
      expect(ids('const token = Math.random().toString(36);')).toContain('insecure-random');
    });

    test('ne signale pas Math.random hors contexte de secret', () => {
      expect(ids('const jitter = Math.random() * 100;')).not.toContain('insecure-random');
    });

    test('détecte une vérification TLS désactivée', () => {
      expect(ids('const opts = { rejectUnauthorized: false };')).toContain('tls-disabled');
    });

    test('détecte une URL http externe', () => {
      expect(ids('const api = "http://api.example.com/v1";')).toContain('insecure-http');
    });

    test.each([
      ['const dev = "http://localhost:3000";'],
      ['const dev = "http://127.0.0.1:8080";']
    ])('ne signale pas une URL locale: %s', (line) => {
      expect(ids(line)).not.toContain('insecure-http');
    });
  });

  describe('robustesse du moteur', () => {
    // Regression: /g regexes kept lastIndex between calls and skipped every
    // second occurrence of an identical line.
    test('signale toutes les occurrences identiques', () => {
      const line = 'const q = `SELECT * FROM t WHERE id = ${id}`;';
      for (let i = 0; i < 6; i += 1) {
        expect(ids(line)).toContain('sql-injection');
      }
    });

    test('respecte le filtrage par extension', () => {
      expect(ids('execSync(`ls ${dir}`)', '.md')).toEqual([]);
    });

    test('n\'active pas les règles désactivées par défaut', () => {
      expect(ids('debugger;')).not.toContain('debug-statement');
    });

    test('active une règle désactivée sur demande', () => {
      const found = matchCodeLine('debugger;', '.js', { includeDisabled: true });
      expect(found.map((f) => f.id)).toContain('debug-statement');
    });

    test('chaque règle expose un correctif actionnable', () => {
      for (const rule of CODE_RULES) {
        expect(typeof rule.fix).toBe('string');
        expect(rule.fix.length).toBeGreaterThan(10);
        expect(['critical', 'high', 'medium', 'low']).toContain(rule.severity);
      }
    });

    test.each([[''], [null], [undefined]])('gère une ligne vide (%p)', (line) => {
      expect(matchCodeLine(line, '.js')).toEqual([]);
    });
  });
});
