#!/usr/bin/env node

const { Command } = require('commander');
const pc = require('picocolors');
const packageJson = require('../package.json');

/**
 * Lazy-load a command module so --version / --help stay fast
 * and a broken optional command does not break the whole CLI boot.
 */
function lazy(modulePath) {
  return (...args) => {
    const handler = require(modulePath);
    return handler(...args);
  };
}

const program = new Command();

program
  .name('flash-dev')
  .description('Copilote intelligent pour votre terminal — Automatisez Git, sécurisez vos commits, analysez vos projets — v3.0.0')
  .version(packageJson.version);

// --- Git ---
program
  .command('push')
  .description('Automatise le workflow Git complet (git add + commit IA + git push)')
  .action(lazy('../src/commands/push'));

program
  .command('sync')
  .description('Synchronise de manière sécurisée la branche locale avec la branche principale')
  .action(lazy('../src/commands/git/sync'));

program
  .command('nuke')
  .description('Nettoie et supprime de façon radicale les branches locales fusionnées')
  .action(lazy('../src/commands/git/nuke'));

// --- Sécurité ---
program
  .command('scan')
  .description('Analyse de sécurité statique du projet et détection de vulnérabilités')
  .action(lazy('../src/commands/scan'));

program
  .command('secure')
  .description('Audit de sécurité pre-commit anti-fuite de secrets (clés API, tokens)')
  .action(lazy('../src/commands/secure'));

program
  .command('env')
  .description('Génère un fichier .env.example assaini et sécurisé à partir du .env local')
  .action(lazy('../src/commands/env'));

// --- Laravel ---
const laravel = program.command('laravel').description('Outils pour l\'écosystème Laravel');

laravel
  .command('make-crud <model>')
  .description('Génère l\'arborescence CRUD complète pour un modèle Laravel')
  .action(lazy('../src/commands/laravel/make-crud'));

laravel
  .command('fresh')
  .description('Nettoie tous les caches de l\'application Laravel et rafraîchit l\'autoloader')
  .action(lazy('../src/commands/laravel/fresh'));

// --- Utilitaires ---
program
  .command('kill-node')
  .description('Libère la RAM et les ports réseaux en tuant les processus Node fantômes')
  .action(lazy('../src/commands/kill-node'));

program
  .command('size')
  .description('Calcule la taille réelle du code source en excluant les fichiers du .gitignore')
  .action(lazy('../src/commands/size'));

program
  .command('sql-dump')
  .description('Sauvegarde la base de données locale (MySQL/PostgreSQL) en lisant le .env')
  .action(lazy('../src/commands/sql-dump'));

program
  .command('scripts')
  .description('Propose un menu interactif pour lancer les scripts du package.json')
  .action(lazy('../src/commands/scripts'));

program
  .command('log-tail')
  .description('Regroupe les logs de plusieurs fichiers dans un seul flux de terminal')
  .action(lazy('../src/commands/log-tail'));

program
  .command('pack [archive-name]')
  .description('Crée une archive tar.gz ou zip propre du projet actuel pour le partage')
  .action(lazy('../src/commands/pack'));

program
  .command('node-switch <version>')
  .description('Change localement la version de Node.js active sans outils tiers')
  .action(lazy('../src/commands/node-switch'));

program
  .command('create [framework] [project-name]')
  .description('Configure un projet de A à Z selon le framework choisi (next, laravel, vue)')
  .action(lazy('../src/commands/create'));

// --- Diagnostic & Analyse ---
program
  .command('doctor')
  .description('Diagnostic complet de l\'environnement de développement (Git, Node, Docker, DB, Framework)')
  .action(lazy('../src/commands/doctor'));

program
  .command('analyze')
  .description('Audit complet du projet (Architecture, Stack, Poids, Dépendances, Qualité, Sécurité)')
  .action(lazy('../src/commands/analyze'));

program
  .command('deps')
  .option('--fix', 'Appliquer automatiquement les corrections')
  .description('Analyse les dépendances (Unused, Deprecated, Vulnerabilities, Duplicates)')
  .action(lazy('../src/commands/deps'));

program
  .command('explain [error]')
  .description('Explique une erreur avec IA (Gemini) ou fallback local')
  .action(lazy('../src/commands/explain'));

program
  .command('fix')
  .description('Auto-correction: ESLint, TypeScript, imports, formatting')
  .action(lazy('../src/commands/fix'));

program
  .command('cache [action]')
  .description('Gestion des caches (list, stats, clean)')
  .action(lazy('../src/commands/cache'));

program
  .command('clean')
  .description('Libère l\'espace disque en nettoyant les dossiers lourds et caches (node_modules, build...)')
  .action(lazy('../src/commands/clean'));

program
  .command('config [section] [action] [value]')
  .description('Configure flash-dev (monetization opt-out, etc.)')
  .action(lazy('../src/commands/config'));

program
  .command('status')
  .description('Affiche l\'état du système, configurations et version')
  .action(lazy('../src/commands/version'));

program
  .command('version')
  .option('--check', 'Check for updates on npm')
  .description('Affiche l\'état du système, configurations et version')
  .action(lazy('../src/commands/version'));

program.action(() => {
  console.log(pc.cyan('===================================================================='));
  console.log(pc.cyan(`⚡  flash-dev v${packageJson.version} — Boîte à Outils d'Automatisation Intelligente  ⚡`));
  console.log(pc.cyan('====================================================================\n'));

  console.log(pc.white('Commandes disponibles :\n'));

  console.log(pc.bold(pc.yellow('🔄  Workflow Git & Caches')));
  console.log(pc.green('  flash-dev push              ') + pc.white('Automatise le workflow Git (IA + commit + push)'));
  console.log(pc.green('  flash-dev sync              ') + pc.white('Synchronise de manière sécurisée avec main/master'));
  console.log(pc.green('  flash-dev nuke              ') + pc.white('Nettoie et supprime les branches locales fusionnées'));
  console.log(pc.green('  flash-dev clean             ') + pc.white('Nettoie les dossiers de build et caches lourds'));

  console.log(pc.bold(pc.yellow('\n🛡️  Sécurité & Secrets')));
  console.log(pc.green('  flash-dev scan              ') + pc.white('Analyse la sécurité et détecte les vulnérabilités'));
  console.log(pc.green('  flash-dev secure            ') + pc.white('Audit anti-fuite de secrets avant commit'));
  console.log(pc.green('  flash-dev env               ') + pc.white('Génère un fichier .env.example assaini'));

  console.log(pc.bold(pc.yellow('\n⚙️  Utilitaires Système Génériques')));
  console.log(pc.green('  flash-dev doctor            ') + pc.white('Diagnostic complet de l\'environnement (v3.0.0)'));
  console.log(pc.green('  flash-dev analyze           ') + pc.white('Audit complet du projet (Architecture, Stack, Dépendances)'));
  console.log(pc.green('  flash-dev deps [--fix]      ') + pc.white('Analyse les dépendances (Unused, Vulnérabilités)'));
  console.log(pc.green('  flash-dev explain [error]   ') + pc.white('Explique une erreur avec IA (Gemini)'));
  console.log(pc.green('  flash-dev fix               ') + pc.white('Auto-correction: ESLint, TypeScript, formatting'));
  console.log(pc.green('  flash-dev cache [list/stats/clean] ') + pc.white('Gestion des caches (npm, pnpm, yarn, docker)'));
  console.log(pc.green('  flash-dev create            ') + pc.white('Configure un projet standardisé (next, laravel, vue)'));
  console.log(pc.green('  flash-dev size              ') + pc.white('Calcule le poids réel du code source (sans .gitignore)'));
  console.log(pc.green('  flash-dev scripts           ') + pc.white('Menu interactif pour lancer les scripts package.json'));
  console.log(pc.green('  flash-dev kill-node         ') + pc.white('Tue les processus Node fantômes en RAM'));
  console.log(pc.green('  flash-dev sql-dump          ') + pc.white('Sauvegarde la base de données locale (lit le .env)'));
  console.log(pc.green('  flash-dev log-tail          ') + pc.white('Regroupe et affiche les logs de fichiers en direct'));
  console.log(pc.green('  flash-dev pack [name]       ') + pc.white('Compresse proprement le projet (respecte .gitignore)'));
  console.log(pc.green('  flash-dev node-switch <ver> ') + pc.white('Bascule la version locale/globale active de Node.js'));

  console.log(pc.bold(pc.yellow('\n🐘 Écosystème Laravel')));
  console.log(pc.green('  flash-dev laravel make-crud ') + pc.white('Génère l\'arborescence CRUD d\'un modèle Laravel'));
  console.log(pc.green('  flash-dev laravel fresh     ') + pc.white('Nettoie tous les caches de l\'application Laravel'));

  console.log(pc.bold(pc.yellow('\nℹ️  Infos Système')));
  console.log(pc.green('  flash-dev version           ') + pc.white('Affiche l\'état du système et configurations'));
  console.log(pc.green('  flash-dev config            ') + pc.white('Configure la monétisation (opt-out inclus)'));
  console.log(pc.green('  flash-dev --help            ') + pc.white('Affiche l\'aide globale de Commander\n'));

  console.log(pc.cyan('Pour commencer, tapez : ') + pc.bold(pc.white('flash-dev doctor')) + pc.cyan(' ou ') + pc.bold(pc.white('flash-dev push')) + '\n');
});

program.parse(process.argv);
