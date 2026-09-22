const pc = require('picocolors');
const { run, capture } = require('./exec');

const GIT_TIMEOUT_MS = 20000;

/**
 * Run git with a discrete argv array (no shell, no injection surface).
 * @param {string[]} args
 * @param {object} [options]
 * @returns {string} trimmed stdout
 * @throws {Error} when git exits non-zero
 */
function execGitArgs(args, options = {}) {
  const result = run('git', args, { timeout: GIT_TIMEOUT_MS, ...options });

  if (result.error) {
    throw new Error(`Git command failed: git ${args.join(' ')}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Git command failed: git ${args.join(' ')}\n${detail}`);
  }

  return result.stdout.trim();
}

/**
 * Run git and report success without throwing.
 * @param {string[]} args
 * @param {object} [options]
 * @returns {{ok: boolean, stdout: string, stderr: string}}
 */
function tryGit(args, options = {}) {
  const result = run('git', args, { timeout: GIT_TIMEOUT_MS, ...options });
  return {
    ok: result.ok,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

/**
 * @deprecated Kept for backward compatibility — prefer execGitArgs.
 * Accepts a "git ..." string, tokenizes it and runs it without a shell.
 * @param {string} command
 * @returns {string}
 */
function execGitCommand(command) {
  const parts = command.trim().split(/\s+/);
  if (parts[0] === 'git') parts.shift();
  return execGitArgs(parts);
}

function isGitRepository() {
  return tryGit(['rev-parse', '--is-inside-work-tree']).ok;
}

/**
 * Absolute path to the repository root, or null outside a repo.
 * Works from any subdirectory, unlike an existsSync('.git') check.
 * @returns {string|null}
 */
function getRepoRoot() {
  const root = capture('git', ['rev-parse', '--show-toplevel'], { timeout: GIT_TIMEOUT_MS });
  return root || null;
}

function gitAddAll() {
  try {
    return execGitArgs(['add', '.']);
  } catch (error) {
    throw new Error(`Échec de l'indexation: ${error.message}`);
  }
}

function getStagedDiff() {
  try {
    return execGitArgs(['diff', '--cached']);
  } catch (error) {
    throw new Error(`Échec de la récupération du diff: ${error.message}`);
  }
}

function hasStagedChanges() {
  return !tryGit(['diff', '--cached', '--quiet']).ok;
}

/**
 * True when the working tree or index holds anything uncommitted.
 * @returns {boolean}
 */
function hasLocalChanges() {
  const status = tryGit(['status', '--porcelain']);
  return status.ok && status.stdout.length > 0;
}

function gitCommit(message) {
  try {
    return execGitArgs(['commit', '-m', String(message)]);
  } catch (error) {
    throw new Error(`Échec du commit: ${error.message}`);
  }
}

/**
 * Resolve the repository main branch.
 * Prefers the remote HEAD, then main, then master.
 * @returns {string}
 */
function getMainBranch() {
  const remoteHead = capture('git', ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'], {
    timeout: GIT_TIMEOUT_MS
  });

  if (remoteHead) {
    const name = remoteHead.replace('refs/remotes/origin/', '').trim();
    if (name && tryGit(['rev-parse', '--verify', '--quiet', name]).ok) {
      return name;
    }
  }

  for (const candidate of ['main', 'master']) {
    if (tryGit(['rev-parse', '--verify', '--quiet', candidate]).ok) {
      return candidate;
    }
  }

  return 'main';
}

function getCurrentBranch() {
  try {
    return execGitArgs(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    throw new Error('Impossible de récupérer la branche courante');
  }
}

/**
 * List local branch names exactly (no substring matching, no decoration).
 * @param {string[]} [extraArgs] e.g. ['--merged', 'main']
 * @returns {string[]}
 */
function listBranches(extraArgs = []) {
  const output = capture('git', ['branch', '--format=%(refname:short)', ...extraArgs], {
    timeout: GIT_TIMEOUT_MS
  });

  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitPush(branch = null) {
  try {
    const targetBranch = branch || getCurrentBranch();
    return execGitArgs(['push', 'origin', targetBranch], { timeout: 120000 });
  } catch (error) {
    throw new Error(`Échec du push: ${error.message}`);
  }
}

function gitStatus() {
  try {
    return execGitArgs(['status', '--short']);
  } catch {
    throw new Error('Impossible de récupérer le statut Git');
  }
}

function displayGitError(errorMessage) {
  console.log(pc.red('\n❌ Oups ! Une erreur Git est survenue:'));
  console.log(pc.yellow(errorMessage));
  console.log(pc.cyan('\n💡 Vérifiez que:'));
  console.log(pc.cyan('  - Vous êtes dans un dépôt Git valide'));
  console.log(pc.cyan('  - Vous avez des modifications à commit'));
  console.log(pc.cyan('  - La branche distante existe et est configurée\n'));
}

module.exports = {
  execGitCommand,
  execGitArgs,
  tryGit,
  isGitRepository,
  getRepoRoot,
  gitAddAll,
  getStagedDiff,
  hasStagedChanges,
  hasLocalChanges,
  gitCommit,
  getMainBranch,
  getCurrentBranch,
  listBranches,
  gitPush,
  gitStatus,
  displayGitError
};
