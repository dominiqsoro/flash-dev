const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

/**
 * Recherche récursivement les fichiers .log
 */
function findLogFiles(dir, maxFiles = 10, foundFiles = []) {
  if (foundFiles.length >= maxFiles) return foundFiles;

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Ignorer les dossiers lourds ou non pertinents
        if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'vendor') {
          findLogFiles(fullPath, maxFiles, foundFiles);
        }
      } else if (item.isFile() && item.name.endsWith('.log')) {
        foundFiles.push(fullPath);
        if (foundFiles.length >= maxFiles) break;
      }
    }
  } catch (error) {
    // Ignorer les répertoires inaccessibles
  }

  return foundFiles;
}

/**
 * Commande: log-tail
 * Regroupe les logs de plusieurs fichiers dans un seul flux de terminal
 */
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
    
    // Palette de couleurs pour différencier les fichiers de logs
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

        // Si le fichier a diminué (ex: vidé ou tronqué), on réinitialise la taille de référence
        if (curr.size < prev.size) {
          state.size = curr.size;
          console.log(state.color(`[${state.shortName}] (Fichier de log tronqué / vidé)`));
          return;
        }

        // S'il y a du nouveau contenu
        if (curr.size > state.size) {
          const newContentSize = curr.size - state.size;
          const buffer = Buffer.alloc(newContentSize);
          
          try {
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, newContentSize, state.size);
            fs.closeSync(fd);
            
            state.size = curr.size; // Mettre à jour la taille traitée

            const text = buffer.toString('utf8');
            const lines = text.split(/\r?\n/).filter(line => line.length > 0);
            
            lines.forEach(line => {
              console.log(`${state.color(`[${state.shortName}]`)} ${line}`);
            });
          } catch (err) {
            // Ignorer les erreurs d'accès temporaires pendant l'écriture
          }
        }
      });
    });

    // Nettoyage lors de la fermeture
    process.on('SIGINT', () => {
      console.log(pc.yellow('\nArrêt de la surveillance des logs...'));
      logFiles.forEach(filePath => {
        fs.unwatchFile(filePath);
      });
      console.log(pc.green('Surveillance arrêtée. À bientôt !\n'));
      process.exit(0);
    });

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = logTailCommand;