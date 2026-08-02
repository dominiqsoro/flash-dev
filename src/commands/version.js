const pc = require('picocolors');
const { getApiKey } = require('../utils/config');
const { isGitRepository, getCurrentBranch } = require('../utils/git');
const packageJson = require('../../package.json');

const VERSION = packageJson.version;

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
  
  console.log(pc.cyan('\nCommandes disponibles:'));
  console.log(pc.cyan('  flash-dev push   ') + pc.white('- Automatiser le workflow Git (IA + commit + push)'));
  console.log(pc.cyan('  flash-dev scan   ') + pc.white('- Analyser la sécurité et détecter les vulnérabilités'));
  console.log(pc.cyan('  flash-dev env    ') + pc.white('- Générer un fichier .env.example assaini et sécurisé'));
  console.log(pc.cyan('  flash-dev secure ') + pc.white('- Audit anti-fuite de secrets (recherche de clés privées/tokens)'));
  console.log(pc.cyan('  flash-dev clean  ') + pc.white('- Libérer de l\'espace disque (nettoyage caches et node_modules)'));
  console.log(pc.cyan('  flash-dev sync   ') + pc.white('- Synchroniser la branche de travail avec la branche principale'));
  console.log(pc.cyan('  flash-dev nuke   ') + pc.white('- Nettoyer et supprimer les branches locales fusionnées'));
  console.log(pc.cyan('\nUtilisez "flash-dev --help" pour afficher plus de détails.\n'));
}

module.exports = versionCommand;
