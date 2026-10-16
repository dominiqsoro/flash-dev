const pc = require('picocolors');
const prompts = require('prompts');
const config = require('../core/config');
const { getApiKey, saveApiKey, promptForApiKey } = require('../utils/config');
const {
  isGitRepository,
  gitAddAll,
  getStagedDiff,
  hasStagedChanges,
  gitCommit,
  gitPush,
  getCurrentBranch,
  displayGitError
} = require('../utils/git');
const {
  initGeminiClient,
  generateCommitMessage,
  generateBasicCommitMessage,
  displayCommitMessage
} = require('../utils/ai');
const { auditDiff } = require('./secure');
const { redact } = require('../core/secret-patterns');
const { displayMonetizationMessage } = require('../utils/monetization');

/**
 * flash-dev push — audit, stage, commit with an AI message, then push.
 * @param {object} [options]
 * @param {boolean} [options.secure=true] run the secret audit before committing
 * @param {boolean} [options.yes] skip confirmations
 * @returns {Promise<number>} exit code
 */
async function pushCommand(options = {}) {
  const runSecureAudit = options.secure !== false;

  try {
    console.log(pc.cyan('flash-dev push - Automatisation Git intelligente\n'));

    if (!isGitRepository()) {
      console.log(pc.red('Ce dossier n\'est pas un dépôt Git valide.'));
      console.log(pc.cyan('Initialisez un dépôt avec: git init\n'));
      process.exitCode = 1;
      return 1;
    }

    // --- API key -------------------------------------------------------------
    let apiKey = getApiKey();
    let useAI = true;

    if (!apiKey) {
      console.log(pc.yellow('Aucune clé API Gemini détectée.'));
      console.log(pc.cyan('flash-dev fonctionne sans IA (mode basique) ou avec une clé API.'));

      const { setupKey } = await prompts({
        type: 'confirm',
        name: 'setupKey',
        message: 'Configurer une clé API Gemini pour des messages de commit intelligents ?',
        initial: false
      });

      if (setupKey) {
        apiKey = await promptForApiKey(prompts);
        saveApiKey(apiKey);
        console.log(pc.green('Clé API sauvegardée localement.\n'));
      } else {
        useAI = false;
        console.log(pc.yellow('Mode basique activé — messages générés sans IA.\n'));
      }
    }

    // --- Stage ---------------------------------------------------------------
    console.log(pc.yellow('Indexation des fichiers...'));
    gitAddAll();

    if (!hasStagedChanges()) {
      console.log(pc.red('\nAucun changement détecté.'));
      console.log(pc.cyan('Modifiez un fichier avant de lancer: flash-dev push\n'));
      return 0;
    }

    console.log(pc.green('Fichiers indexés\n'));

    console.log(pc.yellow('Analyse des modifications...'));
    const diff = getStagedDiff();
    console.log(pc.green('Modifications détectées\n'));

    // --- Secret audit (the whole point of "sécurisez vos commits") -----------
    if (runSecureAudit) {
      console.log(pc.yellow('Audit anti-fuite de secrets...'));
      const issues = auditDiff(diff);

      if (issues.length > 0) {
        console.log(pc.red(`\n⛔ ${issues.length} secret(s) potentiel(s) détecté(s) — push interrompu.\n`));

        for (const issue of issues) {
          const color = issue.severity === 'critical' ? pc.red : pc.yellow;
          console.log(color(`  ${issue.file}:${issue.line}  ${issue.rule}`));
          console.log(pc.gray(`    valeur: ${redact(issue.match)}`));
        }

        console.log(pc.cyan('\nActions :'));
        console.log(pc.cyan('  1. Déplacez la valeur dans un .env (et vérifiez votre .gitignore)'));
        console.log(pc.cyan('  2. Si la clé existe déjà en ligne, RÉVOQUEZ-LA'));
        console.log(pc.gray('\n  Détail   : flash-dev secure'));
        console.log(pc.gray('  Ignorer  : flash-dev push --no-secure (déconseillé)\n'));

        process.exitCode = 1;
        return 1;
      }

      console.log(pc.green('Aucun secret détecté\n'));
    }

    // --- Commit message ------------------------------------------------------
    let commitMessage;

    if (useAI) {
      console.log(pc.yellow('Génération du message de commit avec Gemini...'));
      try {
        commitMessage = await generateCommitMessage(initGeminiClient(apiKey), diff);
      } catch (aiError) {
        console.log(pc.yellow('IA indisponible — passage en mode basique.'));
        if (config.isVerbose()) console.log(pc.gray(aiError.message));
        commitMessage = generateBasicCommitMessage(diff);
      }
    } else {
      console.log(pc.yellow('Génération du message de commit (mode basique)...'));
      commitMessage = generateBasicCommitMessage(diff);
    }

    displayCommitMessage(commitMessage);

    if (!options.yes) {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Confirmer ce commit ?',
        initial: true
      });

      if (!confirm) {
        console.log(pc.yellow('\nOpération annulée — vos fichiers restent indexés.\n'));
        return 0;
      }
    }

    // --- Commit + push -------------------------------------------------------
    console.log(pc.yellow('\nCommit en cours...'));
    gitCommit(commitMessage);
    console.log(pc.green('Commit réussi\n'));

    console.log(pc.yellow('Push vers le dépôt distant...'));

    try {
      gitPush();
    } catch (pushError) {
      const branch = (() => {
        try { return getCurrentBranch(); } catch { return '<branche>'; }
      })();

      console.log(pc.yellow('\n⚠️  Push échoué — mais votre commit est bien enregistré localement.'));
      console.log(pc.gray(pushError.message.split('\n').slice(0, 3).join('\n')));
      console.log(pc.cyan(`\nRéessayez avec : git push -u origin ${branch}\n`));

      process.exitCode = 1;
      return 1;
    }

    console.log(pc.green('Push réussi\n'));
    console.log(pc.cyan('Votre code a été publié avec succès.'));

    displayMonetizationMessage();
    console.log();

    return 0;
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    if (/Git command failed/.test(error.message)) {
      displayGitError(error.message);
    }
    process.exitCode = 1;
    return 1;
  }
}

module.exports = pushCommand;
