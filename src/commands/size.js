const fs = require('fs').promises;
const path = require('path');
const pc = require('picocolors');
const { formatBytes, getDirectorySize } = require('../utils/fs-helpers');

function compilePattern(pattern) {
  let clean = pattern.trim();

  if (clean.startsWith('/')) clean = clean.slice(1);
  if (clean.endsWith('/')) clean = clean.slice(0, -1);

  clean = clean.replace(/\./g, '\\.').replace(/\*/g, '.*');

  return {
    regex: new RegExp(`(^|/)${clean}(/|$)`),
    pattern
  };
}

/**
 * flash-dev size — measure real source size excluding .gitignore paths
 */
async function sizeCommand() {
  try {
    console.log(pc.cyan('\n📊 Analyse de la taille du projet...\n'));

    const rootDir = process.cwd();
    const gitignorePath = path.join(rootDir, '.gitignore');
    const rawPatterns = [];

    try {
      const content = await fs.readFile(gitignorePath, 'utf8');
      for (let line of content.split(/\r?\n/)) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          rawPatterns.push(line);
        }
      }
    } catch {
      // No .gitignore — use defaults only
    }

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
      let items;
      try {
        items = await fs.readdir(currentPath);
      } catch {
        return;
      }

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const relativePath = path.relative(rootDir, itemPath).replace(/\\/g, '/');

        let stats;
        try {
          stats = await fs.stat(itemPath);
        } catch {
          continue;
        }

        const isExcluded = compiledPatterns.some(
          (cp) => cp.regex.test(relativePath) || cp.regex.test(item)
        );

        if (stats.isDirectory()) {
          if (isExcluded) {
            ignoredSize += await getDirectorySize(itemPath);
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
    }

    await scan(rootDir);

    const totalSize = sourceSize + ignoredSize;

    console.log(pc.gray('=============================================='));
    console.log(`${pc.green('  Taille du code source :')}  ${pc.bold(formatBytes(sourceSize))} (${sourceFileCount} fichiers)`);
    console.log(`${pc.yellow('  Taille ignorée        :')}  ${pc.bold(formatBytes(ignoredSize))} (${ignoredFileCount} éléments/dossiers)`);
    console.log(pc.gray('----------------------------------------------'));
    console.log(`${pc.blue('  Taille totale du projet :')} ${pc.bold(formatBytes(totalSize))}`);
    console.log(pc.gray('==============================================\n'));
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur est survenue lors de l'analyse : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = sizeCommand;
