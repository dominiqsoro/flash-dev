const pc = require('picocolors');
const prompts = require('prompts');
const { getApiKey, saveApiKey, promptForApiKey } = require('../utils/config');
const { 
  isGitRepository, 
  gitAddAll, 
  getStagedDiff, 
  hasStagedChanges, 
  gitCommit, 
  gitPush,
  displayGitError 
} = require('../utils/git');
const { 
  initGeminiClient, 
  generateCommitMessage, 
  generateBasicCommitMessage,
  displayCommitMessage 
} = require('../utils/ai');
const { displayEthicalMonetization } = require('../utils/monetization');

/**
 * Commande principale: flash-dev push
 * Orchestre le workflow complet d'automatisation Git
 */
async function pushCommand() {
  try {
    console.log(pc.cyan('flash-dev push - Automatisation Git intelligente\n'));

    // Étape 1: Vérification du dépôt Git
    if (!isGitRepository()) {
      console.log(pc.red('Oups ! Ce dossier n\'est pas un dépôt Git valide.'));
      console.log(pc.cyan('Initialisez un dépôt avec: git init\n'));
      return;
    }

    // Étape 2: Vérification de la clé API (optionnelle)
    let apiKey = getApiKey();
    let useAI = true;
    
    if (!apiKey) {
      console.log(pc.yellow('Aucune clé API Gemini détectée.'));
      console.log(pc.cyan('Vous pouvez utiliser flash-dev sans IA (mode basique) ou configurer une clé API.'));
      
      const { setupKey } = await prompts({
        type: 'confirm',
        name: 'setupKey',
        message: 'Voulez-vous configurer une clé API Gemini pour des messages de commit intelligents?',
        initial: false
      });

      if (setupKey) {
        apiKey = await promptForApiKey(prompts);
        saveApiKey(apiKey);
        console.log(pc.green('Clé API sauvegardée localement!\n'));
      } else {
        useAI = false;
        console.log(pc.yellow('Mode basique activé - Messages de commit générés sans IA\n'));
      }
    }

    // Étape 3: Indexation des fichiers
    console.log(pc.yellow('Indexation des fichiers...'));
    gitAddAll();
    console.log(pc.green('Fichiers indexés\n'));

    // Étape 4: Vérification des modifications
    if (!hasStagedChanges()) {
      console.log(pc.red('Oups ! Aucun changement n\'a été détecté.'));
      console.log(pc.cyan('Modifiez ou ajoutez un fichier avant de lancer: flash-dev push\n'));
      return;
    }

    // Étape 5: Extraction du diff
    console.log(pc.yellow('Analyse des modifications...'));
    const diff = getStagedDiff();
    console.log(pc.green('Modifications détectées\n'));

    // Étape 6: Génération du message de commit
    let commitMessage;
    if (useAI) {
      console.log(pc.yellow('Génération du message de commit avec Gemini...'));
      const client = initGeminiClient(apiKey);
      commitMessage = await generateCommitMessage(client, diff);
    } else {
      console.log(pc.yellow('Génération du message de commit (mode basique)...'));
      commitMessage = generateBasicCommitMessage(diff);
    }
    displayCommitMessage(commitMessage);

    // Étape 7: Validation utilisateur
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Confirmer ce commit?',
      initial: true
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée par l\'utilisateur.\n'));
      return;
    }

    // Étape 8: Commit
    console.log(pc.yellow('\nCommit en cours...'));
    gitCommit(commitMessage);
    console.log(pc.green('Commit réussi!\n'));

    // Étape 9: Push
    console.log(pc.yellow('Push vers le dépôt distant...'));
    try {
      gitPush();
      console.log(pc.green('Push réussi!\n'));
      console.log(pc.cyan('Votre code a été publié avec succès!'));
      
      // Message éthique de monétisation
      displayEthicalMonetization();
      
      console.log();
    } catch (error) {
      console.log(pc.yellow('Push échoué (mais commit réussi)'));
      console.log(pc.cyan('Vérifiez votre connexion ou la configuration du dépôt distant\n'));
      throw error;
    }

  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    if (error.message.includes('Git')) {
      displayGitError(error.message);
    }
    throw error;
  }
}

module.exports = pushCommand;
