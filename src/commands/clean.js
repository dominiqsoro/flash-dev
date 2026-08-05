const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');


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


function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}


async function cleanCommand() {
  try {
    console.log(pc.cyan('flash-dev clean - Libérateur d\'espace disque universel\n'));
    
    const currentDir = process.cwd();
    console.log(pc.yellow(`Analyse du répertoire: ${currentDir}\n`));
    
    const targetDirs = [];
    let totalSize = 0;
    
    
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            
      }
    }
    
    await scanDirectory(currentDir);
    
    if (targetDirs.length === 0) {
      console.log(pc.green('Aucun dossier cible trouvé à nettoyer.\n'));
      process.exit(0);
    }
    
    
    console.log(pc.cyan('Dossiers trouvés:'));
    console.log(pc.gray('-------------------'));
    
    targetDirs.forEach(dir => {
      const ageIndicator = dir.isOld ? '(old)' : '';
      console.log(pc.gray(`  ${formatSize(dir.size).padEnd(10)} ${dir.name} ${ageIndicator}`));
    });
    
    console.log(pc.gray('-------------------'));
    console.log(pc.cyan(`Espace total à libérer: ${formatSize(totalSize)}\n`));
    
    
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
