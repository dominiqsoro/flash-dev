const { execSync } = require('child_process');
const pc = require('picocolors');
const prompts = require('prompts');

/**
 * Branches à conserver (jamais supprimer)
 */
const PROTECTED_BRANCHES = ['main', 'master', 'dev', 'develop', 'staging', 'production'];

/**
 * Commande: flash-dev nuke
 * Nettoyer radicalement les branches locales fusionnées
 */
async function nukeCommand() {
  try {
    console.log(pc.cyan('flash-dev nuke - Nettoyage des branches locales fusionnées\n'));
    
    // Vérifier si c'est un dépôt Git
    try {
      execSync('git rev-parse --git-dir', { encoding: 'utf-8' });
    } catch (error) {
      console.log(pc.red('Erreur: Ce dossier n\'est pas un dépôt Git.'));
      console.log(pc.cyan('Initialisez avec: git init\n'));
      process.exit(1);
    }
    
    // Obtenir la branche actuelle
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const mainBranch = getMainBranch();
    
    console.log(pc.yellow(`Branche actuelle: ${currentBranch}`));
    console.log(pc.yellow(`Branche principale: ${mainBranch}\n`));
    
    // Lister toutes les branches locales
    console.log(pc.yellow('Analyse des branches locales...'));
    const allBranches = execSync('git branch', { encoding: 'utf-8' }).trim().split('\n');
    
    // Nettoyer les noms de branches (enlever le préfixe *)
    const branchNames = allBranches.map(branch => branch.replace(/^\*\s+/, '').trim());
    
    // Filtrer les branches fusionnées
    const mergedBranches = [];
    
    branchNames.forEach(branch => {
      // Ne pas inclure la branche actuelle ou les branches protégées
      if (branch === currentBranch || PROTECTED_BRANCHES.includes(branch)) {
        return;
      }
      
      try {
        // Vérifier si la branche est fusionnée
        execSync(`git branch --merged ${branch}`, { encoding: 'utf-8', stdio: 'pipe' });
        mergedBranches.push(branch);
      } catch (error) {
        // La branche n'est pas fusionnée
      }
    });
    
    if (mergedBranches.length === 0) {
      console.log(pc.green('Aucune branche fusionnée à supprimer.\n'));
      process.exit(0);
    }
    
    console.log(pc.cyan(`Branches fusionnées trouvées: ${mergedBranches.length}\n`));
    
    // Afficher les branches à supprimer
    console.log(pc.cyan('Branches à supprimer:'));
    console.log(pc.gray('-------------------'));
    mergedBranches.forEach(branch => {
      console.log(pc.gray(`  - ${branch}`));
    });
    console.log(pc.gray('-------------------\n'));
    
    // Demander confirmation
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Voulez-vous supprimer ces branches?',
      initial: false
    });
    
    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      process.exit(0);
    }
    
    // Supprimer les branches
    console.log(pc.yellow('Suppression en cours...\n'));
    
    let deletedCount = 0;
    let failedCount = 0;
    
    mergedBranches.forEach(branch => {
      try {
        execSync(`git branch -d ${branch}`, { encoding: 'utf-8' });
        console.log(pc.green(`  Supprimé: ${branch}`));
        deletedCount++;
      } catch (error) {
        console.log(pc.yellow(`  Échec: ${branch}`));
        failedCount++;
      }
    });
    
    console.log(pc.cyan(`\nTerminé: ${deletedCount} branches supprimées, ${failedCount} échecs`));
    console.log(pc.green('Historique local allégé!\n'));
    
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Déterminer le nom de la branche principale
 */
function getMainBranch() {
  try {
    // Essayer 'main' d'abord
    execSync('git rev-parse --verify main', { encoding: 'utf-8', stdio: 'pipe' });
    return 'main';
  } catch (error) {
    // Si 'main' n'existe pas, utiliser 'master'
    return 'master';
  }
}

module.exports = nukeCommand;
