const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../utils/exec');
const hooksCommand = require('../commands/hooks');
const { inspectHooks, resolveHooksDir, runHook, MARKER } = require('../commands/hooks');

/**
 * Canonical, comparable form of a path.
 * On Windows, mkdtemp may return an 8.3 short path ("RUNNER~1") while git
 * reports the long form, so both sides must be normalised before comparison.
 * @param {string} target
 * @returns {string}
 */
function canonical(target) {
  try {
    return fs.realpathSync.native(target).toLowerCase();
  } catch {
    return String(target).toLowerCase();
  }
}

let repoDir;
let previousCwd;
let logSpy;

beforeEach(() => {
  previousCwd = process.cwd();
  repoDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fd-hooks-')));

  run('git', ['init', '-q', '-b', 'main'], { cwd: repoDir });
  process.chdir(repoDir);

  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  process.chdir(previousCwd);
  fs.rmSync(repoDir, { recursive: true, force: true });
  process.exitCode = 0;
});

describe('hooks', () => {
  test('résout le répertoire des hooks', () => {
    expect(canonical(resolveHooksDir())).toBe(canonical(path.join(repoDir, '.git', 'hooks')));
  });

  test('rapporte les hooks absents avant installation', () => {
    const state = inspectHooks(resolveHooksDir());
    expect(state.every((hook) => hook.state === 'absent')).toBe(true);
  });

  test('installe les trois hooks et les marque comme gérés', async () => {
    await hooksCommand('install');

    const state = inspectHooks(resolveHooksDir());
    expect(state.map((hook) => hook.name).sort()).toEqual(['commit-msg', 'pre-commit', 'pre-push']);
    expect(state.every((hook) => hook.state === 'managed')).toBe(true);
  });

  test('les hooks installés sont exécutables et portent le marqueur', async () => {
    await hooksCommand('install');

    const hookPath = path.join(resolveHooksDir(), 'pre-commit');
    expect(fs.readFileSync(hookPath, 'utf8')).toContain(MARKER);
    if (process.platform !== 'win32') {
      expect(fs.statSync(hookPath).mode & 0o111).toBeTruthy();
    }
  });

  // A missing binary must warn, never make the repository un-committable
  const posixOnly = process.platform === 'win32' ? test.skip : test;

  posixOnly('le hook sort en 0 si flash-dev est introuvable', async () => {
    await hooksCommand('install');

    const hookPath = path.join(resolveHooksDir(), 'pre-commit');
    // An empty PATH directory: sh still resolves (absolute), flash-dev does not
    const emptyBin = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-emptybin-'));
    const result = run('/bin/sh', [hookPath], { cwd: repoDir, env: { PATH: emptyBin } });
    fs.rmSync(emptyBin, { recursive: true, force: true });

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/introuvable/);
  });

  test('ne remplace pas un hook externe sans --force', async () => {
    const hooksDir = resolveHooksDir();
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\necho custom\n', { mode: 0o755 });

    expect(inspectHooks(hooksDir).find((h) => h.name === 'pre-commit').state).toBe('foreign');

    await hooksCommand('install', undefined, { force: true });

    expect(fs.existsSync(path.join(hooksDir, 'pre-commit.bak'))).toBe(true);
    expect(fs.readFileSync(path.join(hooksDir, 'pre-commit.bak'), 'utf8')).toContain('echo custom');
  });

  test('uninstall restaure la sauvegarde', async () => {
    const hooksDir = resolveHooksDir();
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\necho custom\n', { mode: 0o755 });

    await hooksCommand('install', undefined, { force: true });
    await hooksCommand('uninstall');

    expect(fs.readFileSync(path.join(hooksDir, 'pre-commit'), 'utf8')).toContain('echo custom');
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit.bak'))).toBe(false);
  });

  test('uninstall retire les hooks gérés', async () => {
    await hooksCommand('install');
    await hooksCommand('uninstall');

    expect(inspectHooks(resolveHooksDir()).every((hook) => hook.state === 'absent')).toBe(true);
  });

  describe('runHook commit-msg', () => {
    const writeMessage = (content) => {
      const file = path.join(repoDir, 'COMMIT_EDITMSG');
      fs.writeFileSync(file, content);
      return file;
    };

    test('accepte un message conforme', () => {
      expect(runHook('commit-msg', writeMessage('feat(auth): add login'))).toBe(0);
    });

    test('rejette un message libre', () => {
      expect(runHook('commit-msg', writeMessage('mauvais message'))).toBe(1);
    });

    test('rejette un fichier inexistant', () => {
      expect(runHook('commit-msg', path.join(repoDir, 'absent'))).toBe(1);
    });

    test('rejette un hook inconnu', () => {
      expect(runHook('pre-rebase', writeMessage('feat: x'))).toBe(1);
    });
  });

  test('échoue hors dépôt Git', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-nogit-'));
    process.chdir(outside);

    await expect(hooksCommand('status')).resolves.toBe(1);

    process.chdir(repoDir);
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
