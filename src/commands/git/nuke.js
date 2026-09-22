const pc = require('picocolors');
const prompts = require('prompts');
const {
  isGitRepository,
  getCurrentBranch,
  getMainBranch,
  listBranches,
  tryGit
} = require('../../utils/git');

const PROTECTED_BRANCHES = new Set([
  'main', 'master', 'dev', 'develop', 'development',
  'staging', 'preprod', 'production', 'prod', 'release', 'trunk'
]);

/**
 * flash-dev nuke — delete local branches already merged into the main branch.
 * @param {object} [options]
 * @param {boolean} [options.force] also delete branches Git considers unmerged
 * @param {boolean} [options.yes] skip the confirmation prompt
 * @returns {Promise<number>} exit code
 */
async function nukeCommand(options = {}) {
  console.log(pc.cyan('flash-dev nuke - Nettoyage des branches locales fusionnées\n'));

  if (!isGitRepository()) {
    console.log(pc.red('Ce dossier n\'est pas un dépôt Git.'));
    console.log(pc.cyan('Initialisez avec: git init\n'));
    process.exitCode = 1;
    return 1;
  }

  let currentBranch;
  try {
    currentBranch = getCurrentBranch();
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exitCode = 1;
    return 1;
  }

  const mainBranch = getMainBranch();

  console.log(pc.yellow(`Branche actuelle   : ${currentBranch}`));
  console.log(pc.yellow(`Branche principale : ${mainBranch}\n`));

  if (!tryGit(['rev-parse', '--verify', '--quiet', mainBranch]).ok) {
    console.log(pc.red(`La branche principale "${mainBranch}" est introuvable.`));
    console.log(pc.cyan('Impossible de déterminer ce qui est fusionné.\n'));
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.yellow('Analyse des branches locales...'));

  // Single git call, exact names — the previous version ran one call per
  // branch and matched with String.includes(), which flagged "fea" as merged
  // whenever "feature-done" was merged.
  const mergedBranches = new Set(listBranches(['--merged', mainBranch]));
  const allBranches = listBranches();

  const candidates = allBranches.filter((branch) => {
    if (branch === currentBranch) return false;
    if (branch === mainBranch) return false;
    if (PROTECTED_BRANCHES.has(branch)) return false;
    return options.force ? true : mergedBranches.has(branch);
  });

  if (candidates.length === 0) {
    console.log(pc.green('\nAucune branche fusionnée à supprimer.\n'));
    return 0;
  }

  console.log(pc.cyan(`\n${candidates.length} branche(s) candidate(s) :\n`));
  for (const branch of candidates) {
    const marker = mergedBranches.has(branch) ? pc.gray('(fusionnée)') : pc.yellow('(NON fusionnée)');
    console.log(`  - ${branch} ${marker}`);
  }

  if (options.force) {
    console.log(pc.red('\n⚠️  Mode --force : des commits non fusionnés seront définitivement perdus.'));
  }

  if (!options.yes) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Supprimer ces ${candidates.length} branche(s) locale(s) ?`,
      initial: false
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return 0;
    }
  }

  let deleted = 0;
  let failed = 0;

  for (const branch of candidates) {
    // -d refuses to drop unmerged work; -D only with an explicit --force
    const result = tryGit(['branch', options.force ? '-D' : '-d', branch]);

    if (result.ok) {
      deleted += 1;
      console.log(pc.green(`  Supprimée : ${branch}`));
    } else {
      failed += 1;
      console.log(pc.yellow(`  Conservée : ${branch}`));
      console.log(pc.gray(`    ${result.stderr.split('\n')[0]}`));
    }
  }

  console.log(pc.cyan(`\nTerminé : ${deleted} supprimée(s), ${failed} conservée(s).\n`));
  return 0;
}

module.exports = nukeCommand;
