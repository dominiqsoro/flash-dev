const { execSync } = require('child_process');
const pc = require('picocolors');

/**
 * Exécute une commande Git de manière sécurisée avec try/catch
 * @param {string} command - La commande Git à exécuter
 * @param {Object} options - Options pour execSync
 * @returns {string} La sortie de la commande
 * @throws {Error} Si la commande échoue
 */
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
 * Vérifie si le dossier actuel est un dépôt Git valide
 * @returns {boolean} True si c'est un dépôt Git, false sinon
 */
function isGitRepository() {
  try {
    execGitCommand('git rev-parse --git-dir');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Exécute git add . pour indexer tous les fichiers modifiés/créés
 * @returns {string} La sortie de la commande
 */
function gitAddAll() {
  return execGitCommand('git add .');
}

/**
 * Récupère le diff des fichiers indexés (staged)
 * @returns {string} Le diff des modifications
 */
function getStagedDiff() {
  try {
    return execGitCommand('git diff --cached');
  } catch (error) {
    throw new Error('Impossible de récupérer le diff des fichiers indexés');
  }
}

/**
 * Vérifie s'il y a des modifications indexées
 * @returns {boolean} True si des modifications sont indexées, false sinon
 */
function hasStagedChanges() {
  try {
    const diff = getStagedDiff();
    return diff.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Exécute git commit avec le message fourni
 * @param {string} message - Le message de commit
 * @returns {string} La sortie de la commande
 */
function gitCommit(message) {
  try {
    return execGitCommand(`git commit -m "${message}"`);
  } catch (error) {
    throw new Error(`Échec du commit: ${error.message}`);
  }
}

/**
 * Récupère le nom de la branche courante
 * @returns {string} Le nom de la branche
 */
function getCurrentBranch() {
  try {
    return execGitCommand('git rev-parse --abbrev-ref HEAD');
  } catch (error) {
    throw new Error('Impossible de récupérer la branche courante');
  }
}

/**
 * Exécute git push vers la branche courante
 * @param {string} branch - Le nom de la branche (optionnel, détecté automatiquement si non fourni)
 * @returns {string} La sortie de la commande
 */
function gitPush(branch = null) {
  try {
    const targetBranch = branch || getCurrentBranch();
    return execGitCommand(`git push origin ${targetBranch}`);
  } catch (error) {
    throw new Error(`Échec du push: ${error.message}`);
  }
}

/**
 * Récupère le statut Git actuel
 * @returns {string} La sortie de git status
 */
function gitStatus() {
  try {
    return execGitCommand('git status --short');
  } catch (error) {
    throw new Error('Impossible de récupérer le statut Git');
  }
}

/**
 * Affiche un message d'erreur Git vulgarisé
 * @param {string} errorMessage - Le message d'erreur original
 */
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
  isGitRepository,
  gitAddAll,
  getStagedDiff,
  hasStagedChanges,
  gitCommit,
  getCurrentBranch,
  gitPush,
  gitStatus,
  displayGitError
};
