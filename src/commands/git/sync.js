const pc = require('picocolors');
const {
  isGitRepository,
  getCurrentBranch,
  getMainBranch,
  hasLocalChanges,
  tryGit,
  execGitArgs
} = require('../../utils/git');

const STASH_LABEL = 'flash-dev-sync';

/**
 * Locate the stash entry this command created, by its exact label.
 * Returns null when it is absent, so we never pop someone else's stash.
 * @returns {string|null} e.g. "stash@{0}"
 */
function findOwnStash() {
  const list = tryGit(['stash', 'list', '--format=%gd %gs']);
  if (!list.ok || !list.stdout) return null;

  for (const line of list.stdout.split(/\r?\n/)) {
    const [ref, ...rest] = line.trim().split(/\s+/);
    if (ref && rest.join(' ').includes(STASH_LABEL)) {
      return ref;
    }
  }

  return null;
}

function fail(message, hint) {
  console.log(pc.red(`\n${message}`));
  if (hint) console.log(pc.cyan(hint));
  console.log();
  process.exitCode = 1;
  return 1;
}

/**
 * flash-dev sync — rebase the current branch on top of the main branch.
 * @returns {Promise<number>} exit code
 */
async function syncCommand() {
  console.log(pc.cyan('flash-dev sync - Synchronisation avec la branche principale\n'));

  if (!isGitRepository()) {
    return fail('Ce dossier n\'est pas un dépôt Git.', 'Initialisez avec: git init');
  }

  let currentBranch;
  try {
    currentBranch = getCurrentBranch();
  } catch (error) {
    return fail(`Impossible de lire la branche courante: ${error.message}`);
  }

  if (currentBranch === 'HEAD') {
    return fail(
      'HEAD est détachée — aucune branche à synchroniser.',
      'Revenez sur une branche avec: git checkout <branche>'
    );
  }

  if (tryGit(['rev-parse', '--verify', '--quiet', 'REBASE_HEAD']).ok ||
      tryGit(['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']).ok) {
    return fail(
      'Un rebase ou un merge est déjà en cours.',
      'Terminez-le (git rebase --continue) ou annulez-le (git rebase --abort).'
    );
  }

  const mainBranch = getMainBranch();
  console.log(pc.yellow(`Branche actuelle   : ${currentBranch}`));
  console.log(pc.yellow(`Branche principale : ${mainBranch}\n`));

  // --- Case 1: already on the main branch -----------------------------------
  if (currentBranch === mainBranch) {
    console.log(pc.cyan('Déjà sur la branche principale — récupération des derniers changements...'));
    const pull = tryGit(['pull', '--rebase'], { timeout: 120000 });

    if (!pull.ok) {
      return fail('Erreur lors du pull.', `${pull.stderr}\nRésolvez les conflits manuellement.`);
    }

    console.log(pc.green('Branche principale synchronisée.\n'));
    return 0;
  }

  // --- Case 2: stash only what we actually own -------------------------------
  const needsStash = hasLocalChanges();
  let stashed = false;

  if (needsStash) {
    console.log(pc.yellow('Mise de côté des modifications locales...'));
    const stash = tryGit(['stash', 'push', '--include-untracked', '-m', STASH_LABEL]);

    if (!stash.ok) {
      return fail('Impossible de mettre les modifications de côté.', stash.stderr);
    }

    stashed = Boolean(findOwnStash());
    console.log(pc.green(stashed ? 'Modifications sauvegardées.\n' : 'Rien à sauvegarder.\n'));
  } else {
    console.log(pc.gray('Arbre de travail propre — aucun stash nécessaire.\n'));
  }

  /**
   * Restore our stash, and only ours. Never touches a pre-existing entry.
   * @returns {boolean}
   */
  const restoreStash = () => {
    if (!stashed) return true;

    const ref = findOwnStash();
    if (!ref) {
      console.log(pc.yellow('Stash flash-dev introuvable — restauration ignorée.'));
      return false;
    }

    const pop = tryGit(['stash', 'pop', ref]);
    if (!pop.ok) {
      console.log(pc.yellow('\nConflit lors de la restauration du stash.'));
      console.log(pc.cyan(`Vos modifications sont intactes dans: git stash show -p ${ref}`));
      console.log(pc.cyan(`Restaurez-les avec: git stash pop ${ref}`));
      return false;
    }

    stashed = false;
    console.log(pc.green('Modifications locales restaurées.'));
    return true;
  };

  // --- Fetch the main branch without switching branches ----------------------
  console.log(pc.yellow(`Récupération de ${mainBranch} depuis origin...`));
  const hasRemote = tryGit(['remote', 'get-url', 'origin']).ok;

  if (hasRemote) {
    const fetch = tryGit(['fetch', 'origin', mainBranch], { timeout: 120000 });
    if (!fetch.ok) {
      console.log(pc.yellow('Fetch impossible — rebase sur la copie locale.'));
      console.log(pc.gray(fetch.stderr));
    } else {
      // Fast-forward the local main ref without checking it out
      const update = tryGit(['update-ref', `refs/heads/${mainBranch}`, `refs/remotes/origin/${mainBranch}`]);
      if (update.ok) {
        console.log(pc.green(`${mainBranch} mise à jour.\n`));
      }
    }
  } else {
    console.log(pc.yellow('Aucun remote "origin" — rebase sur la branche locale.\n'));
  }

  // --- Rebase ----------------------------------------------------------------
  console.log(pc.yellow(`Rebase de ${currentBranch} sur ${mainBranch}...`));
  const rebase = tryGit(['rebase', mainBranch], { timeout: 120000 });

  if (!rebase.ok) {
    console.log(pc.red('\nConflit durant le rebase.'));
    console.log(pc.gray(rebase.stderr || rebase.stdout));
    console.log(pc.cyan('\nRésolvez les conflits puis: git rebase --continue'));
    console.log(pc.cyan('Ou annulez tout avec  : git rebase --abort'));

    if (stashed) {
      console.log(pc.yellow(`\nVos modifications locales restent dans le stash "${STASH_LABEL}".`));
      console.log(pc.cyan('Restaurez-les APRÈS le rebase avec: git stash pop'));
    }

    console.log();
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.green('Rebase réussi.\n'));

  restoreStash();

  console.log(pc.green('\nSynchronisation terminée.'));
  console.log(pc.cyan(`${currentBranch} est à jour avec ${mainBranch}.\n`));
  return 0;
}

module.exports = syncCommand;
module.exports.STASH_LABEL = STASH_LABEL;
