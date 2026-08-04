const fs = require('fs').promises;
const path = require('path');
const pc = require('picocolors');

/**
 * Convertit un pattern gitignore en objet avec regex de correspondance
 */
function compilePattern(pattern) {
  let clean = pattern.trim();
  if (clean.startsWith('/')) clean = clean.slice(1);
  if (clean.endsWith('/')) clean = clean.slice(0, -1);
  
  // Échappe les caractères regex spéciaux sauf l'astérisque *
  const escaped = clean
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  
  // Match le pattern en tant que segment complet du chemin (ex: au début, au milieu ou à la fin)
  const regex = new RegExp('(?:^|/)' + escaped + '(?:$|/)');
  
  return { pattern: clean, regex };
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
 * Calculer la taille d'un dossier de manière asynchrone
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignorer les erreurs de permission
  }
  return totalSize;
}

/**
 * Commande: size
 * Analyse et affiche la taille du code source et des fichiers ignorés (asynchrone)
 */
async function sizeCommand() {
  try {
    console.log(pc.cyan('\n📊 Analyse de la taille du projet...\n'));
    
    const rootDir = process.cwd();
    const gitignorePath = path.join(rootDir, '.gitignore');
    const rawPatterns = [];
    
    try {
      const content = await fs.readFile(gitignorePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          rawPatterns.push(line);
        }
      }
    } catch (err) {
      // .gitignore inexistant, continuer avec les exclusions par défaut
    }
    
    // Ajout des exclusions par défaut communes
    const defaultExcludes = ['.git', 'node_modules', 'dist', 'build', '.cache'];
    for (const ext of defaultExcludes) {
      if (!rawPatterns.includes(ext)) {
        rawPatterns.push(ext);
      }
    }
    
    const compiledPatterns = rawPatterns.map(compilePattern);
    
    let sourceSize = 0;
    let ignoredSize = 0;
    let sourceFileCount = 0;
    let ignoredFileCount = 0;
    
    async function scan(currentPath) {
      try {
        const items = await fs.readdir(currentPath);
        
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const relativePath = path.relative(rootDir, itemPath).replace(/\\/g, '/');
          const stats = await fs.stat(itemPath);
          
          // Vérifie si le fichier ou dossier correspond à l'un des patterns d'exclusion
          const isExcluded = compiledPatterns.some(cp => cp.regex.test(relativePath) || cp.regex.test(item));
          
          if (stats.isDirectory()) {
            if (isExcluded) {
              const size = await getDirectorySize(itemPath);
              ignoredSize += size;
              ignoredFileCount++;
            } else {
              await scan(itemPath);
            }
          } else if (stats.isFile()) {
            if (isExcluded) {
              ignoredSize += stats.size;
              ignoredFileCount++;
            } else {
              sourceSize += stats.size;
              sourceFileCount++;
            }
          }
        }
      } catch (err) {
        // Ignorer les erreurs d'accès ou permissions
      }
    }
    
    await scan(rootDir);
    
    const totalSize = sourceSize + ignoredSize;
    
    console.log(pc.cyan('Rapport détaillé de l\'espace disque :'));
    console.log(pc.gray('=============================================='));
    console.log(`${pc.green('  Taille du code source :')}  ${pc.bold(formatSize(sourceSize))} (${sourceFileCount} fichiers)`);
    console.log(`${pc.yellow('  Taille ignorée        :')}  ${pc.bold(formatSize(ignoredSize))} (${ignoredFileCount} éléments/dossiers)`);
    console.log(pc.gray('----------------------------------------------'));
    console.log(`${pc.blue('  Taille totale du projet :')} ${pc.bold(formatSize(totalSize))}`);
    console.log(pc.gray('==============================================\n'));
    
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur est survenue lors de l'analyse : ${error.message}\n`));
  }
}

module.exports = sizeCommand;
