const fs = require('fs');
const path = require('path');
const pc = require('picocolors');


function findLogFiles(dir, maxFiles = 10, foundFiles = []) {
  if (foundFiles.length >= maxFiles) return foundFiles;

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        
        if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'vendor') {
          findLogFiles(fullPath, maxFiles, foundFiles);
        }
      } else if (item.isFile() && item.name.endsWith('.log')) {
        foundFiles.push(fullPath);
        if (foundFiles.length >= maxFiles) break;
      }
    }
  } catch (error) {
    
  }

  return foundFiles;
}


function logTailCommand() {
  try {
    console.log(pc.cyan('\n🪵  Agrégateur et surveillance des logs en direct...\n'));

    const currentDir = process.cwd();
    console.log(pc.yellow('Recherche des fichiers .log...'));
    const logFiles = findLogFiles(currentDir, 8);

    if (logFiles.length === 0) {
      console.log(pc.yellow('Aucun fichier .log détecté dans le projet actuel.'));
      process.exit(0);
    }

    console.log(pc.green(`Détection de ${logFiles.length} fichier(s) de log(s) :\n`));
    
    
    const colors = [pc.cyan, pc.green, pc.yellow, pc.magenta, pc.blue, pc.red];
    const fileStates = {};

    logFiles.forEach((filePath, idx) => {
      const relativePath = path.relative(currentDir, filePath);
      const color = colors[idx % colors.length];
      
      console.log(color(`  [Fichier ${idx + 1}] : ${relativePath}`));
      
      const stats = fs.statSync(filePath);
      fileStates[filePath] = {
        size: stats.size,
        color: color,
        shortName: path.basename(filePath)
      };
    });

    console.log(pc.gray('\n---------------------------------------------------------'));
    console.log(pc.cyan('👀 Surveillance active... Appuyez sur Ctrl+C pour quitter.'));
    console.log(pc.gray('---------------------------------------------------------\n'));

    logFiles.forEach(filePath => {
      fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
        const state = fileStates[filePath];
        if (!state) return;

        
        if (curr.size < prev.size) {
          state.size = curr.size;
          console.log(state.color(`[${state.shortName}] (Fichier de log tronqué / vidé)`));
          return;
        }

        
      process.exit(0);
    });

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = logTailCommand;