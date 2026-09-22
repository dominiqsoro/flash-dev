const { FAKE } = require('./fixtures');
const {
  matchLine,
  shannonEntropy,
  isPlaceholder,
  isIgnoredPath,
  redact
} = require('../core/secret-patterns');

describe('secret-patterns', () => {
  describe('matchLine — vrais positifs', () => {
    const REAL_SECRETS = [
      ['AWS Access Key ID', `const k = "${FAKE.awsKeyId}";`],
      ['Clé secrète Stripe', `stripe = "${FAKE.stripeKey}"`],
      ['Token GitHub', `token: "${FAKE.githubToken}"`],
      ['Clé API Google', `key = "${FAKE.googleKey}"`],
      ['URL de connexion avec mot de passe', `DB="${FAKE.dbUrl}"`],
      ['Clé privée (PEM)', FAKE.pemHeader]
    ];

    test.each(REAL_SECRETS)('détecte %s', (expectedRule, line) => {
      const findings = matchLine(line);
      expect(findings.map((f) => f.rule)).toContain(expectedRule);
    });
  });

  describe('matchLine — faux positifs à ne pas produire', () => {
    const BENIGN = [
      'const greeting = "hello world, this is a normal string";',
      'const total = price + tax;',
      '// password: see the internal wiki for the rotation policy',
      'const apiKey = process.env.API_KEY;',
      'const placeholder = "your_api_key_here";',
      'password = "${DB_PASSWORD}"',
      'api_key: "<your-token>"'
    ];

    test.each(BENIGN)('ignore %s', (line) => {
      expect(matchLine(line)).toHaveLength(0);
    });

    // Regression: a 40-char build hash was reported as an AWS secret whenever
    // the word "aws_secret" appeared anywhere else in the diff.
    test('n\'utilise pas un contexte hors de la ligne courante', () => {
      expect(matchLine(`The build hash is ${FAKE.buildHash}`)).toHaveLength(0);
    });

    test('respecte le marqueur inline flash-dev-ignore-secret', () => {
      expect(matchLine(`const k = "${FAKE.stripeKey}"; // flash-dev-ignore-secret`)).toHaveLength(0);
    });

    test('ignore les identifiants d\'exemple documentés', () => {
      expect(matchLine(`const k = "${FAKE.awsDocSample}";`)).toHaveLength(0);
    });
  });

  describe('shannonEntropy', () => {
    test('est nulle pour un caractère répété', () => {
      expect(shannonEntropy('aaaaaaaa')).toBe(0);
    });

    test('est plus élevée pour une chaîne aléatoire que pour un mot', () => {
      expect(shannonEntropy(FAKE.genericKey)).toBeGreaterThan(shannonEntropy('password'));
    });

    test('gère une entrée vide', () => {
      expect(shannonEntropy('')).toBe(0);
    });
  });

  describe('isPlaceholder', () => {
    test.each([['changeme'], ['${TOKEN}'], ['<your-key>'], ['xxxxxxxx'], ['00000000']])(
      'reconnaît %s',
      (value) => expect(isPlaceholder(value)).toBe(true)
    );

    test('ne marque pas une vraie valeur', () => {
      expect(isPlaceholder(FAKE.genericKey)).toBe(false);
    });
  });

  describe('isIgnoredPath', () => {
    test.each([
      ['.env.example'],
      ['config/.env.sample'],
      ['package-lock.json'],
      ['node_modules/foo/index.js'],
      ['dist/app.min.js']
    ])('ignore %s', (file) => expect(isIgnoredPath(file)).toBe(true));

    test('n\'ignore pas un fichier source', () => {
      expect(isIgnoredPath('src/config.js')).toBe(false);
    });
  });

  describe('redact', () => {
    test('masque le cœur de la valeur', () => {
      const masked = redact(FAKE.stripeKey);
      expect(masked).toContain('*');
      expect(masked).not.toContain(FAKE.stripeKey.slice(8, 20));
    });

    test('masque aussi les valeurs courtes', () => {
      expect(redact('abc')).not.toBe('abc');
    });
  });
});
