const { execSync, spawnSync } = require('child_process');
const pc = require('picocolors');


function execGitCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options
    });
    return result.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${command}\n${error.message}`);
  }
}

/**
 * Run git with discrete argv (avoids shell injection).
 * @param {string[]} args
 * @returns {string}
 */
function execGitArgs(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw new Error(`Git command failed: git ${args.join(' ')}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Git command failed: git ${args.join(' ')}\n${detail}`);
  }

  return (result.stdout || '').trim();
}


function isGitRepository() {
  try {
    execGitCommand('git rev-parse --is-inside-work-tree');
    return true;
  } catch (error) {
    return false;
  }
}


function gitAddAll() {
  try {
    return execGitCommand('git add .');
  } catch (error) {
    throw new Error(`Échec de l'indexation: ${error.message}`);
  }
}


function getStagedDiff() {
  try {
    return execGitCommand('git diff --cached');
  } catch (error) {
    throw new Error(`Échec de la récupération du diff: ${error.message}`);
  }
}


function hasStagedChanges() {
  try {
    const diff = getStagedDiff();
    return diff.length > 0;
  } catch (error) {
    return false;
  }
}


function gitCommit(message) {
  try {
    return execGitArgs(['commit', '-m', String(message)]);
  } catch (error) {
    throw new Error(`Échec du commit: ${error.message}`);
  }
}

/**
 * Resolve the repository main branch (main preferred, then master).
 * @returns {string}
 */
function getMainBranch() {
  try {
    execGitArgs(['rev-parse', '--verify', 'main']);
    return 'main';
  } catch {
    try {
      execGitArgs(['rev-parse', '--verify', 'master']);
      return 'master';
    } catch {
      return 'main';
    }
  }
}


function getCurrentBranch() {
  try {
    return execGitCommand('git rev-parse --abbrev-ref HEAD');
  } catch (error) {
    throw new Error('Impossible de récupérer la branche courante');
  }
}


function gitPush(branch = null) {
  try {
    const targetBranch = branch || getCurrentBranch();
    return execGitCommand(`git push origin ${targetBranch}`);
  } catch (error) {
    throw new Error(`Échec du push: ${error.message}`);
  }
}


function gitStatus() {
  try {
    return execGitCommand('git status --short');
  } catch (error) {
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
  isGitRepository,
  gitAddAll,
  getStagedDiff,
  hasStagedChanges,
  gitCommit,
  getMainBranch,
  getCurrentBranch,
  gitPush,
  gitStatus,
  displayGitError
};
