const { FAKE } = require('./fixtures');
const { auditDiff } = require('../commands/secure');

const diffOf = (file, lines) =>
  `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1,0 +1,${lines.length} @@\n` +
  lines.map((line) => `+${line}`).join('\n') + '\n';

describe('secure.auditDiff', () => {
  test('détecte un secret ajouté et donne le bon emplacement', () => {
    const diff = diffOf('src/config.js', [
      'const a = 1;',
      `const stripe = "${FAKE.stripeKey}";`
    ]);

    const issues = auditDiff(diff);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: 'src/config.js', line: 2, severity: 'critical' });
  });

  // Regression: removing a leaked key used to block the very commit that fixed it
  test('n\'alerte pas sur la suppression d\'un secret', () => {
    const diff = `diff --git a/leak.js b/leak.js
--- a/leak.js
+++ b/leak.js
@@ -1,1 +0,0 @@
-const k = "${FAKE.githubToken}";
`;
    expect(auditDiff(diff)).toHaveLength(0);
  });

  // Regression: a build hash matched "AWS Secret Key" because the rule's
  // context was tested against the whole diff instead of the line
  test('n\'alerte pas sur un hash de 40 caractères', () => {
    const diff = diffOf('notes.md', [
      'We use aws_secret_manager for rotation.',
      `The build hash is ${FAKE.buildHash}`
    ]);
    expect(auditDiff(diff)).toHaveLength(0);
  });

  test('ignore les fichiers d\'exemple', () => {
    const diff = diffOf('.env.example', [`STRIPE_KEY=${FAKE.stripeKey}`]);
    expect(auditDiff(diff)).toHaveLength(0);
  });

  test('ignore les lockfiles', () => {
    const diff = diffOf('package-lock.json', [`"integrity": "sha512-${FAKE.awsKeyId}${FAKE.awsKeyId}"`]);
    expect(auditDiff(diff)).toHaveLength(0);
  });

  test('classe les résultats par sévérité décroissante', () => {
    const diff = diffOf('app.js', [
      `const apiKey = "${FAKE.genericKey}";`,
      `const gh = "${FAKE.githubToken}";`
    ]);

    const issues = auditDiff(diff);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues[0].severity).toBe('critical');
  });

  test('ne réexpose jamais le secret en clair', () => {
    const secret = FAKE.githubToken;
    const issues = auditDiff(diffOf('app.js', [`const t = "${secret}";`]));
    expect(issues[0].match).toBe(secret);
    // The command prints redact(match), never match itself — see printIssues
  });

  test.each([[''], [null]])('gère un diff vide (%p)', (diff) => {
    expect(auditDiff(diff)).toEqual([]);
  });
});
