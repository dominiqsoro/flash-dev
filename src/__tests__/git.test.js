const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../utils/exec');
const {
  isGitRepository,
  getRepoRoot,
  getCurrentBranch,
  getMainBranch,
  listBranches,
  hasStagedChanges,
  hasLocalChanges,
  tryGit
} = require('../utils/git');

let repoDir;
let previousCwd;

const git = (...args) => run('git', args, { cwd: repoDir, timeout: 15000 });

beforeEach(() => {
  previousCwd = process.cwd();
  repoDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fd-git-')));

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');

  fs.writeFileSync(path.join(repoDir, 'a.txt'), 'a\n');
  git('add', '-A');
  git('commit', '-qm', 'init');

  process.chdir(repoDir);
});

afterEach(() => {
  process.chdir(previousCwd);
  fs.rmSync(repoDir, { recursive: true, force: true });
});

describe('utils/git', () => {
  test('reconnaît un dépôt Git', () => {
    expect(isGitRepository()).toBe(true);
  });

  test('getRepoRoot fonctionne depuis un sous-répertoire', () => {
    const subDir = path.join(repoDir, 'src', 'deep');
    fs.mkdirSync(subDir, { recursive: true });
    process.chdir(subDir);

    // Regression: sync used existsSync('.git') and failed in subdirectories
    expect(fs.realpathSync(getRepoRoot())).toBe(repoDir);
    expect(isGitRepository()).toBe(true);
  });

  test('getCurrentBranch', () => {
    expect(getCurrentBranch()).toBe('main');
  });

  test('getMainBranch préfère main', () => {
    expect(getMainBranch()).toBe('main');
  });

  test('getMainBranch retombe sur master', () => {
    git('branch', '-m', 'main', 'master');
    expect(getMainBranch()).toBe('master');
  });

  test('hasStagedChanges reflète l\'index', () => {
    expect(hasStagedChanges()).toBe(false);
    fs.writeFileSync(path.join(repoDir, 'b.txt'), 'b\n');
    git('add', '-A');
    expect(hasStagedChanges()).toBe(true);
  });

  test('hasLocalChanges voit aussi les fichiers non suivis', () => {
    expect(hasLocalChanges()).toBe(false);
    fs.writeFileSync(path.join(repoDir, 'untracked.txt'), 'x\n');
    expect(hasLocalChanges()).toBe(true);
  });

  // Regression: nuke matched branch names with String.includes(), so an
  // unmerged "fea" was reported as merged whenever "feature-done" was merged.
  test('listBranches retourne des noms exacts', () => {
    git('branch', 'feature-done');
    git('checkout', '-q', '-b', 'fea');
    fs.writeFileSync(path.join(repoDir, 'c.txt'), 'c\n');
    git('add', '-A');
    git('commit', '-qm', 'wip');
    git('checkout', '-q', 'main');

    const merged = listBranches(['--merged', 'main']);
    expect(merged).toContain('feature-done');
    expect(merged).not.toContain('fea');
    expect(listBranches().sort()).toEqual(['fea', 'feature-done', 'main']);
  });

  test('tryGit ne lève pas sur une commande invalide', () => {
    const result = tryGit(['rev-parse', '--verify', 'branche-inexistante']);
    expect(result.ok).toBe(false);
    expect(typeof result.stderr).toBe('string');
  });

  test('les noms de branche hostiles restent inertes', () => {
    const hostile = 'feat/; touch /tmp/fd-git-pwned ;';
    tryGit(['rev-parse', '--verify', hostile]);
    expect(fs.existsSync('/tmp/fd-git-pwned')).toBe(false);
  });
});

describe('sync — préservation du stash', () => {
  const syncModule = require('../commands/git/sync');

  test('ne consomme pas un stash préexistant sur un arbre propre', async () => {
    // Regression: sync popped ANY stash, dumping unrelated work into the branch
    fs.writeFileSync(path.join(repoDir, 'precious.txt'), 'travail important\n');
    git('add', 'precious.txt');
    git('stash', 'push', '-q', '-m', 'mon stash personnel');

    git('checkout', '-q', '-b', 'feature');
    fs.writeFileSync(path.join(repoDir, 'f.txt'), 'f\n');
    git('add', '-A');
    git('commit', '-qm', 'feat');

    const before = git('stash', 'list').stdout.trim();
    expect(before).toContain('mon stash personnel');

    const originalLog = console.log;
    console.log = () => {};
    try {
      await syncModule();
    } finally {
      console.log = originalLog;
    }

    const after = git('stash', 'list').stdout.trim();
    expect(after).toContain('mon stash personnel');
    expect(git('status', '--porcelain').stdout.trim()).toBe('');
  });

  test('expose un label de stash identifiable', () => {
    expect(syncModule.STASH_LABEL).toBe('flash-dev-sync');
  });
});
