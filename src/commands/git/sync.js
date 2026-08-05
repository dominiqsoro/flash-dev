const { execSync } = require('child_process');
const pc = require('picocolors');


async function syncCommand() {
  try {
    console.log(pc.cyan('flash-dev sync - Synchronisation avec la branche principale\n'));
    
    
      console.log(pc.cyan('Initialisez avec: git init\n'));
      process.exit(1);
    }
    
    
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const mainBranch = getMainBranch();
    
    console.log(pc.yellow(`Branche actuelle: ${currentBranch}`));
    console.log(pc.yellow(`Branche principale: ${mainBranch}\n`));
    
    if (currentBranch === mainBranch) {
      console.log(pc.yellow('Vous êtes déjà sur la branche principale.'));
      console.log(pc.cyan('Pulling latest changes...\n'));
      
      try {
        execSync('git pull --rebase', { encoding: 'utf-8' });
        console.log(pc.green('Branche principale synchronisée avec succès!\n'));
      } catch (error) {
        console.log(pc.red('Erreur lors du pull:'));
        console.log(pc.gray(error.message));
        console.log(pc.cyan('\nTentez de résoudre les conflits manuellement.\n'));
        process.exit(1);
      }
      
      process.exit(0);
    }
    
    console.log(pc.yellow('Sauvegarde des modifications locales...'));
    
    
    try {
      execSync('git stash push -m "flash-dev sync: auto-stash"', { encoding: 'utf-8' });
      console.log(pc.green('Modifications sauvegardées\n'));
    } catch (error) {
      console.log(pc.yellow('Aucune modification à sauvegarder ou stash échoué\n'));
    }
    
    
    console.log(pc.yellow(`Switch vers ${mainBranch}...`));
    try {
      execSync(`git checkout ${mainBranch}`, { encoding: 'utf-8' });
      console.log(pc.green(`Switché sur ${mainBranch}\n`));
    } catch (error) {
      console.log(pc.red('Erreur lors du switch de branche'));
      console.log(pc.gray(error.message));
      process.exit(1);
    }
    
    
    console.log(pc.yellow('Pull des derniers changements...'));
    try {
      execSync('git pull --rebase', { encoding: 'utf-8' });
      console.log(pc.green('Changements récupérés\n'));
    } catch (error) {
      console.log(pc.red('Erreur lors du pull'));
      console.log(pc.gray(error.message));
      console.log(pc.cyan('\nRésolvez les conflits et relancez flash-dev sync\n'));
      process.exit(1);
    }
    
    
    console.log(pc.yellow(`Retour sur ${currentBranch}...`));
    try {
      execSync(`git checkout ${currentBranch}`, { encoding: 'utf-8' });
      console.log(pc.green(`Retour sur ${currentBranch}\n`));
    } catch (error) {
      console.log(pc.red('Erreur lors du retour sur la branche'));
      console.log(pc.gray(error.message));
      process.exit(1);
    }
    
    
    console.log(pc.yellow(`Rebase sur ${mainBranch}...`));
    try {
      execSync(`git rebase ${mainBranch}`, { encoding: 'utf-8' });
      console.log(pc.green('Rebase réussi\n'));
    } catch (error) {
      console.log(pc.red('Erreur lors du rebase'));
      console.log(pc.gray(error.message));
      console.log(pc.cyan('\nRésolvez les conflits et terminez avec: git rebase --continue\n'));
      
      
      try {
        execSync('git stash pop', { encoding: 'utf-8' });
        console.log(pc.yellow('Modifications locales restaurées\n'));
      } catch (error) {
        console.log(pc.yellow('Impossible de restaurer le stash\n'));
      }
      
      process.exit(1);
    }
    
    
    console.log(pc.yellow('Restauration des modifications locales...'));
    try {
      execSync('git stash pop', { encoding: 'utf-8' });
      console.log(pc.green('Modifications restaurées\n'));
    } catch (error) {
      console.log(pc.yellow('Aucune modification à restaurer ou stash déjà appliqué\n'));
    }
    
    console.log(pc.green('Synchronisation terminée avec succès!'));
    console.log(pc.cyan(`Votre branche ${currentBranch} est maintenant à jour avec ${mainBranch}\n`));
    
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}


function getMainBranch() {
  try {
    
    return 'master';
  }
}

module.exports = syncCommand;
