const os = require('os');
const path = require('path');
const fs = require('fs');
const { run, capture, ok, tokenize } = require('../utils/exec');

describe('utils/exec', () => {
  test('capture retourne stdout', () => {
    expect(capture(process.execPath, ['-e', 'console.log("hello")'])).toBe('hello');
  });

  test('ok reflète le code de sortie', () => {
    expect(ok(process.execPath, ['-e', 'process.exit(0)'])).toBe(true);
    expect(ok(process.execPath, ['-e', 'process.exit(3)'])).toBe(false);
  });

  test('capture retourne null en cas d\'échec', () => {
    expect(capture(process.execPath, ['-e', 'process.exit(1)'])).toBeNull();
  });

  test('un binaire inexistant ne lève pas', () => {
    const result = run('flash-dev-binaire-inexistant-xyz', []);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // The core security property: arguments are never re-parsed by a shell
  test('les métacaractères shell restent des données', () => {
    const payload = '; touch /tmp/flash-dev-should-not-exist ;';
    const output = capture(process.execPath, ['-e', 'console.log(process.argv[1])', payload]);
    expect(output).toBe(payload);
    expect(fs.existsSync('/tmp/flash-dev-should-not-exist')).toBe(false);
  });

  test('l\'expansion $(...) n\'a pas lieu', () => {
    const output = capture(process.execPath, ['-e', 'console.log(process.argv[1])', '$(id)']);
    expect(output).toBe('$(id)');
  });

  test('respecte le timeout', () => {
    const result = run(process.execPath, ['-e', 'setTimeout(()=>{}, 5000)'], { timeout: 300 });
    expect(result.ok).toBe(false);
  });

  test('transmet les variables d\'environnement', () => {
    const output = capture(process.execPath, ['-e', 'console.log(process.env.FD_TEST)'], {
      env: { ...process.env, FD_TEST: 'valeur' }
    });
    expect(output).toBe('valeur');
  });

  test('respecte le répertoire de travail', () => {
    const tmp = fs.realpathSync(os.tmpdir());
    const output = capture(process.execPath, ['-e', 'console.log(process.cwd())'], { cwd: tmp });
    expect(fs.realpathSync(output)).toBe(tmp);
  });

  describe('tokenize (compatibilité chaîne)', () => {
    test.each([
      ['git status --short', ['git', 'status', '--short']],
      ['tasklist /FI "IMAGENAME eq node.exe"', ['tasklist', '/FI', 'IMAGENAME eq node.exe']],
      ["pgrep -f 'Docker Desktop'", ['pgrep', '-f', 'Docker Desktop']],
      ['', []]
    ])('découpe %p', (input, expected) => {
      expect(tokenize(input)).toEqual(expected);
    });
  });
});
