const fs = require('fs').promises;
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const {
  formatBytes,
  getDirectorySize,
  deleteDirectory,
  isOlderThan
} = require('../utils/fs-helpers');

const TARGET_DIRECTORIES = new Set([
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
]);

const SKIP_DIRECTORIES = new Set(['.git', '.svn', '.hg']);

/**
 * flash-dev clean — free disk space by removing heavy build/cache folders
 */
async function cleanCommand() {
  try {
    console.log(pc.cyan('flash-dev clean - Libérateur d\'espace disque universel\n'));

    const currentDir = process.cwd();
    console.log(pc.yellow(`Analyse du répertoire: ${currentDir}\n`));

    const targetDirs = [];
    let totalSize = 0;

    async function scanDirectory(dir) {
      let items;
      try {
        items = await fs.readdir(dir);
      } catch {
        return;
      }

      for (const item of items) {
        if (SKIP_DIRECTORIES.has(item)) continue;

        const itemPath = path.join(dir, item);
        let stats;
        try {
          stats = await fs.stat(itemPath);
        } catch {
          continue;
        }

        if (!stats.isDirectory()) continue;

        if (TARGET_DIRECTORIES.has(item)) {
          const size = await getDirectorySize(itemPath);
          if (size > 0) {
            targetDirs.push({
              path: itemPath,
              name: item,
              size,
              isOld: await isOlderThan(itemPath)
            });
            totalSize += size;
          }
          // Do not recurse into heavy target folders
          continue;
        }

        await scanDirectory(itemPath);
      }
    }

    await scanDirectory(currentDir);

    if (targetDirs.length === 0) {
      console.log(pc.green('Aucun dossier cible trouvé à nettoyer.\n'));
      return;
    }

    console.log(pc.cyan('Dossiers trouvés:'));
    console.log(pc.gray('-------------------'));

    for (const dir of targetDirs) {
      const ageIndicator = dir.isOld ? '(old)' : '';
      console.log(pc.gray(`  ${formatBytes(dir.size).padEnd(10)} ${dir.name} ${ageIndicator}`));
    }

    console.log(pc.gray('-------------------'));
    console.log(pc.cyan(`Espace total à libérer: ${formatBytes(totalSize)}\n`));

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Voulez-vous supprimer ces dossiers?',
      initial: false
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return;
    }

    console.log(pc.yellow('Suppression en cours...\n'));

    let deletedCount = 0;
    let failedCount = 0;
    let freedSize = 0;

    for (const dir of targetDirs) {
      if (await deleteDirectory(dir.path)) {
        deletedCount++;
        freedSize += dir.size;
        console.log(pc.green(`  Supprimé: ${dir.name}`));
      } else {
        failedCount++;
        console.log(pc.yellow(`  Impossible de supprimer: ${dir.path}`));
      }
    }

    console.log(pc.cyan(`\nTerminé: ${deletedCount} dossiers supprimés, ${failedCount} échecs`));
    console.log(pc.cyan(`Espace libéré: ${formatBytes(freedSize)}\n`));
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = cleanCommand;
