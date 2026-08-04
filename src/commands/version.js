const pc = require('picocolors');
const { getApiKey } = require('../utils/config');
const { isGitRepository, getCurrentBranch } = require('../utils/git');

/**
 * Affiche l'état et la version du CLI
 */
function versionCommand() {
  try {
    let VERSION = '2.0.0';
    try {
      const packageJson = require('../../package.json');
      VERSION = packageJson.version;
    } catch (error) {
      // Si package.json n'est pas lisible, utiliser la version par défaut
    }

    console.log(pc.cyan('===================================================================='));
    console.log(pc.cyan('⚡  flash-dev — État du système & Configuration  ⚡'));
    console.log(pc.cyan('====================================================================\n'));
    
    console.log(pc.green('Version:'), pc.white(VERSION));
    console.log(pc.green('Description:'), pc.white('Boîte à outils d\'automatisation intelligente en ligne de commande'));
    
    // État de la clé API
    const apiKey = getApiKey();
    if (apiKey) {
      console.log(pc.green('Clé API Gemini:'), pc.white('Configurée (IA active)'));
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
    
    console.log(pc.cyan('\n===================================================================='));
    console.log(pc.cyan('📚  Toutes les fonctionnalités disponibles (v2.0.0)'));
    console.log(pc.cyan('===================================================================='));

    console.log(pc.bold(pc.yellow('\n🔄  Workflow Git & Caches')));
    console.log(pc.green('  push              ') + pc.white('Automatise le workflow Git (IA + commit + push)'));
    console.log(pc.green('  sync              ') + pc.white('Synchronise de manière sécurisée avec main/master'));
    console.log(pc.green('  nuke              ') + pc.white('Nettoie et supprime les branches locales fusionnées'));
    console.log(pc.green('  clean             ') + pc.white('Nettoie les dossiers de build et caches lourds'));
    
    console.log(pc.bold(pc.yellow('\n🛡️  Sécurité & Secrets')));
    console.log(pc.green('  scan              ') + pc.white('Analyse la sécurité et détecte les vulnérabilités'));
    console.log(pc.green('  secure            ') + pc.white('Audit anti-fuite de secrets avant commit'));
    console.log(pc.green('  env               ') + pc.white('Génère un fichier .env.example assaini'));
    
    console.log(pc.bold(pc.yellow('\n⚙️  Utilitaires Système Génériques')));
    console.log(pc.green('  create            ') + pc.white('Configure un projet standardisé (next, laravel, vue)'));
    console.log(pc.green('  size              ') + pc.white('Calcule le poids réel du code source (sans .gitignore)'));
    console.log(pc.green('  scripts           ') + pc.white('Menu interactif pour lancer les scripts package.json'));
    console.log(pc.green('  kill-node         ') + pc.white('Tue les processus Node fantômes en RAM'));
    console.log(pc.green('  sql-dump          ') + pc.white('Sauvegarde la base de données locale (lit le .env)'));
    console.log(pc.green('  log-tail          ') + pc.white('Regroupe et affiche les logs de fichiers en direct'));
    console.log(pc.green('  pack [name]       ') + pc.white('Compresse proprement le projet (respecte .gitignore)'));
    console.log(pc.green('  node-switch <ver> ') + pc.white('Bascule la version locale/globale active de Node.js'));
    
    console.log(pc.bold(pc.yellow('\n🐘 Écosystème Laravel')));
    console.log(pc.green('  laravel make-crud ') + pc.white('Génère l\'arborescence CRUD d\'un modèle Laravel'));
    console.log(pc.green('  laravel fresh     ') + pc.white('Nettoie tous les caches de l\'application Laravel'));
    
    console.log(pc.cyan('\nUtilisez "flash-dev --help" pour afficher plus de détails.\n'));
  } catch (error) {
    console.log(pc.red(`\nErreur lors de l'affichage du statut: ${error.message}\n`));
  }
}

module.exports = versionCommand;