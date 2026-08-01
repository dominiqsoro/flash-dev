const pc = require('picocolors');
const { getApiKey } = require('../utils/config');
const { isGitRepository, getCurrentBranch } = require('../utils/git');

const VERSION = '1.0.0';

/**
 * Affiche l'état et la version du CLI
 */
function versionCommand() {
  console.log(pc.cyan('flash-dev - État du système\n'));
  
  console.log(pc.green('Version:'), pc.white(VERSION));
  console.log(pc.green('Description:'), pc.white('Boîte à outils d\'automatisation intelligente en ligne de commande'));
  
  // État de la clé API
  const apiKey = getApiKey();
  if (apiKey) {
    console.log(pc.green('Clé API Gemini:'), pc.white('Configurée'));
  } else {
    console.log(pc.green('Clé API Gemini:'), pc.yellow('Non configurée (mode basique disponible)'));
  }
  
  // État du dépôt Git
  if (isGitRepository()) {
    try {
      const branch = getCurrentBranch();
      console.log(pc.green('Dépôt Git:'), pc.white(`Actif (branche: ${branch})`));
    } catch (error) {
      console.log(pc.green('Dépôt Git:'), pc.white('Actif'));
    }
  } else {
    console.log(pc.green('Dépôt Git:'), pc.yellow('Non détecté'));
  }
  
  console.log(pc.green('Node.js:'), pc.white(process.version));
  console.log(pc.green('Plateforme:'), pc.white(process.platform));
  
  console.log(pc.cyan('\nUtilisez "flash-dev push" pour automatiser votre workflow Git!'));
  console.log(pc.cyan('Utilisez "flash-dev scan" pour analyser la sécurité de votre projet!\n'));
}

module.exports = versionCommand;
