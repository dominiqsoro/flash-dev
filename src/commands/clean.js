const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');

/**
 * Dossiers cibles pour le nettoyage
 */
const TARGET_DIRECTORIES = [
  'node_modules',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.turbo',
  'venv',
  'env',
  '__pycache__',
  '.pytest_cache'
];

/**
 * Calculer la taille d'un dossier de manière asynchrone
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  async function calculateSize(currentPath) {
    try {
      const stats = await fs.stat(currentPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(currentPath);
        for (const file of files) {
          const filePath = path.join(currentPath, file);
          await calculateSize(filePath);
        }
      } else {
        totalSize += stats.size;
      }
    } catch (error) {
      // Ignorer les erreurs d'accès (fichiers système, permissions)
    }
  }
  
  await calculateSize(dirPath);
  return totalSize;
}

/**
 * Formater la taille en unités lisibles
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Vérifier si un dossier n'a pas été modifié depuis 3 mois
 */
async function isOldDirectory(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    return stats.mtimeMs < threeMonthsAgo;
  } catch (error) {
    return false;
  }
}

/**
 * Supprimer un dossier de manière récursive
 */
async function deleteDirectory(dirPath) {
  try {
    if (fsSync.existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.log(pc.yellow(`  Impossible de supprimer: ${dirPath}`));
    return false;
  }
}

/**
 * Commande: flash-dev clean
 * Libérateur d'espace disque universel (asynchrone)
 */
async function cleanCommand() {
  try {
    console.log(pc.cyan('flash-dev clean - Libérateur d\'espace disque universel\n'));
    
    const currentDir = process.cwd();
    console.log(pc.yellow(`Analyse du répertoire: ${currentDir}\n`));
    
    const targetDirs = [];
    let totalSize = 0;
    
    // Scanner récursivement les sous-dossiers
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            // Vérifier si c'est un dossier cible
            if (TARGET_DIRECTORIES.includes(item)) {
              const size = await getDirectorySize(itemPath);
              const isOld = await isOldDirectory(itemPath);
              
              if (size > 0) {
                targetDirs.push({
                  path: itemPath,
                  name: item,
                  size: size,
                  isOld: isOld
                });
                totalSize += size;
              }
            }
            
            // Continuer le scan récursif
            await scanDirectory(itemPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs d'accès
      }
    }
    
    await scanDirectory(currentDir);
    
    if (targetDirs.length === 0) {
      console.log(pc.green('Aucun dossier cible trouvé à nettoyer.\n'));
      process.exit(0);
    }
    
    // Afficher le récapitulatif
    console.log(pc.cyan('Dossiers trouvés:'));
    console.log(pc.gray('-------------------'));
    
    targetDirs.forEach(dir => {
      const ageIndicator = dir.isOld ? '(old)' : '';
      console.log(pc.gray(`  ${formatSize(dir.size).padEnd(10)} ${dir.name} ${ageIndicator}`));
    });
    
    console.log(pc.gray('-------------------'));
    console.log(pc.cyan(`Espace total à libérer: ${formatSize(totalSize)}\n`));
    
    // Demander confirmation
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Voulez-vous supprimer ces dossiers?',
      initial: false
    });
    
    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      process.exit(0);
    }
    
    // Supprimer les dossiers
    console.log(pc.yellow('Suppression en cours...\n'));
    
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const dir of targetDirs) {
      if (await deleteDirectory(dir.path)) {
        deletedCount++;
        console.log(pc.green(`  Supprimé: ${dir.name}`));
      } else {
        failedCount++;
      }
    }
    
    console.log(pc.cyan(`\nTerminé: ${deletedCount} dossiers supprimés, ${failedCount} échecs`));
    console.log(pc.cyan(`Espace libéré: ${formatSize(totalSize)}\n`));
    
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = cleanCommand;
