const pc = require('picocolors');
const https = require('https');
const { getApiKey } = require('../utils/config');
const { isGitRepository, getCurrentBranch } = require('../utils/git');

async function checkForUpdates(currentVersion) {
  return new Promise((resolve) => {
    https.get('https://registry.npmjs.org/flash-dev', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const packageInfo = JSON.parse(data);
          const latestVersion = packageInfo['dist-tags'].latest;
          resolve(latestVersion);
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function versionCommand(options = {}) {
  try {
    let VERSION = '3.0.0';
    try {
      const packageJson = require('../../package.json');
      VERSION = packageJson.version;
    } catch (error) {
    }

    if (options.check) {
      console.log(pc.cyan('Checking for updates...\n'));
      const latestVersion = await checkForUpdates(VERSION);
      
      if (latestVersion) {
        if (latestVersion !== VERSION) {
          console.log(pc.green(`Current version: ${VERSION}`));
          console.log(pc.yellow(`Latest version: ${latestVersion}`));
          console.log(pc.cyan('\nUpdate available! Run:'));
          console.log(pc.white('  npm install -g flash-dev@latest\n'));
        } else {
          console.log(pc.green(`You're on the latest version: ${VERSION}\n`));
        }
      } else {
        console.log(pc.yellow('Unable to check for updates. Please try again later.\n'));
      }
      return;
    }

    console.log(pc.cyan('===================================================================='));
    console.log(pc.cyan('⚡  flash-dev — État du système & Configuration  ⚡'));
    console.log(pc.cyan('====================================================================\n'));
    
    console.log(pc.green('Version:'), pc.white(VERSION));
    console.log(pc.green('Description:'), pc.white('Copilote intelligent pour votre terminal'));
    
    const apiKey = getApiKey();
    if (apiKey) {
      console.log(pc.green('Clé API Gemini:'), pc.white('Configurée (IA active)'));
    } else {
      console.log(pc.green('Clé API Gemini:'), pc.yellow('Non configurée (mode basique disponible)'));
    }
    
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
    console.log(pc.cyan('📚  Toutes les fonctionnalités disponibles (v3.0.0)'));
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
    console.log(pc.green('  doctor            ') + pc.white('Diagnostic complet de l\'environnement'));
    console.log(pc.green('  analyze           ') + pc.white('Audit complet du projet (Architecture, Stack, Dépendances)'));
    console.log(pc.green('  deps [--fix]      ') + pc.white('Analyse les dépendances (Unused, Vulnérabilités)'));
    console.log(pc.green('  explain [error]   ') + pc.white('Explique une erreur avec IA (Gemini)'));
    console.log(pc.green('  fix               ') + pc.white('Auto-correction: ESLint, TypeScript, formatting'));
    console.log(pc.green('  cache [list/stats/clean] ') + pc.white('Gestion des caches (npm, pnpm, yarn, docker)'));
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