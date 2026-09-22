#!/usr/bin/env node

const { Command } = require('commander');
const pc = require('picocolors');
const packageJson = require('../package.json');
const config = require('../src/core/config');
const { FlashDevError } = require('../src/core/errors');

/**
 * Lazy-load a command module so --version / --help stay fast
 * and a broken optional command does not break the whole CLI boot.
 * Global flags are applied before the handler runs.
 */
function lazy(modulePath) {
  return async (...args) => {
    config.applyFlags(program.opts());

    try {
      const handler = require(modulePath);
      const result = await handler(...args);
      if (typeof result === 'number' && result !== 0) {
        process.exitCode = result;
      }
      return result;
    } catch (error) {
      if (config.isJson()) {
        console.log(JSON.stringify({
          ok: false,
          code: error.code || 'UNEXPECTED_ERROR',
          error: error.message,
          solution: error.solution || null
        }));
      } else if (error instanceof FlashDevError) {
        // Solution-oriented rendering, defined once in src/core/errors.js
        error.display();
        if (config.isVerbose()) console.error(pc.gray(error.stack));
      } else {
        console.error(pc.red(`\n❌ ${error.message}\n`));
        if (config.isVerbose()) console.error(pc.gray(error.stack));
      }
      process.exitCode = 1;
      return 1;
    }
  };
}

const program = new Command();

program
  .name('flash-dev')
  .description(`Copilote intelligent pour votre terminal — v${packageJson.version}`)
  .version(packageJson.version)
  .option('--json', 'Sortie machine (JSON) pour l\'automatisation et la CI')
  .option('--verbose', 'Affiche les détails et les traces d\'erreur')
  .option('--quiet', 'Réduit la sortie aux erreurs');

// --- Git ---
program
  .command('push')
  .description('Automatise le workflow Git complet (audit + git add + commit IA + git push)')
  .option('--no-secure', 'Ne pas auditer les secrets avant le commit')
  .option('-y, --yes', 'Ne pas demander de confirmation')
  .action(lazy('../src/commands/push'));

program
  .command('sync')
  .description('Synchronise de manière sécurisée la branche locale avec la branche principale')
  .action(lazy('../src/commands/git/sync'));

program
  .command('nuke')
  .description('Nettoie et supprime les branches locales fusionnées')
  .option('--force', 'Supprimer aussi les branches NON fusionnées (destructif)')
  .option('-y, --yes', 'Ne pas demander de confirmation')
  .action(lazy('../src/commands/git/nuke'));

program
  .command('hooks [action] [argument]')
  .description('Installe les garde-fous Git (secrets, Conventional Commits, scan)')
  .option('--force', 'Remplacer les hooks existants (sauvegarde en .bak)')
  .action(lazy('../src/commands/hooks'));

program
  .command('changelog [version]')
  .description('Génère le CHANGELOG à partir des Conventional Commits')
  .option('--since <ref>', 'Point de départ (tag ou commit)')
  .option('--dry-run', 'Afficher sans écrire de fichier')
  .option('--all', 'Inclure aussi chore, ci, build, style et test')
  .option('-y, --yes', 'Ne pas demander de confirmation')
  .action(lazy('../src/commands/changelog'));

// --- Sécurité ---
program
  .command('scan')
  .description('Analyse de sécurité statique du projet (secrets, injections, crypto)')
  .action(lazy('../src/commands/scan'));

program
  .command('secure')
  .description('Audit pre-commit anti-fuite de secrets (clés API, tokens)')
  .option('--all', 'Auditer tout le code suivi, pas seulement l\'index')
  .action(lazy('../src/commands/secure'));

program
  .command('env')
  .description('Génère un fichier .env.example assaini à partir du .env local')
  .option('-f, --force', 'Écraser un .env.example existant sans demander')
  .action(lazy('../src/commands/env'));

program
  .command('licenses')
  .description('Audit de conformité des licences de dépendances')
  .option('--fail-on <niveau>', 'Échouer si des licences strong|weak|unknown sont présentes')
  .action(lazy('../src/commands/licenses'));

// --- Laravel ---
const laravel = program.command('laravel').description('Outils pour l\'écosystème Laravel');

laravel
  .command('make-crud <model>')
  .description('Génère l\'arborescence CRUD complète pour un modèle Laravel')
  .action(lazy('../src/commands/laravel/make-crud'));

laravel
  .command('fresh')
  .description('Nettoie tous les caches Laravel et rafraîchit l\'autoloader')
  .action(lazy('../src/commands/laravel/fresh'));

// --- Utilitaires ---
program
  .command('kill-node')
  .description('Arrête les processus Node fantômes (avec revue et confirmation)')
  .option('-y, --yes', 'Ne pas demander de confirmation')
  .option('--all', 'Inclure les processus protégés (éditeurs, LSP)')
  .action(lazy('../src/commands/kill-node'));

program
  .command('ports [port]')
  .description('Inspecte les ports TCP en écoute et libère un port occupé')
  .option('-y, --yes', 'Ne pas demander de confirmation')
  .action(lazy('../src/commands/ports'));

program
  .command('size')
  .description('Calcule la taille réelle du code source en excluant le .gitignore')
  .action(lazy('../src/commands/size'));

program
  .command('sql-dump')
  .description('Sauvegarde la base de données locale (MySQL/PostgreSQL) en lisant le .env')
  .option('-o, --output <fichier>', 'Chemin du fichier de dump')
  .option('--service <nom>', 'Service Docker Compose hébergeant la base')
  .action(lazy('../src/commands/sql-dump'));

program
  .command('scripts')
  .description('Menu interactif pour lancer les scripts du package.json')
  .action(lazy('../src/commands/scripts'));

program
  .command('log-tail')
  .description('Regroupe les logs de plusieurs fichiers dans un seul flux')
  .action(lazy('../src/commands/log-tail'));

program
  .command('pack [archive-name]')
  .description('Crée une archive tar.gz propre du projet actuel')
  .action(lazy('../src/commands/pack'));

program
  .command('node-switch <version>')
  .description('Change la version de Node.js active (téléchargement vérifié SHA-256)')
  .action(lazy('../src/commands/node-switch'));

program
  .command('create [framework] [project-name]')
  .description('Configure un projet de A à Z (next, laravel, vue)')
  .action(lazy('../src/commands/create'));

// --- Diagnostic & Analyse ---
program
  .command('doctor')
  .description('Diagnostic complet de l\'environnement (Git, Node, Docker, DB, Framework)')
  .action(lazy('../src/commands/doctor'));

program
  .command('analyze')
  .description('Audit complet du projet (Architecture, Stack, Dépendances, Sécurité)')
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
  .description('Auto-correction: ESLint, Prettier, TypeScript')
  .action(lazy('../src/commands/fix'));

program
  .command('cache [action]')
  .description('Gestion des caches (list, stats, clean)')
  .action(lazy('../src/commands/cache'));

program
  .command('clean')
  .description('Libère l\'espace disque (node_modules, build, caches...)')
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
  .option('--check', 'Vérifier les mises à jour sur npm')
  .description('Affiche l\'état du système, configurations et version')
  .action(lazy('../src/commands/version'));

/** Grouped overview printed when flash-dev runs with no command. */
const COMMAND_GROUPS = [
  {
    title: '🔄  Workflow Git',
    items: [
      ['push', 'Audit + commit IA + push en une commande'],
      ['sync', 'Rebase sûr sur main/master (stash préservé)'],
      ['nuke', 'Supprime les branches locales fusionnées'],
      ['hooks install', 'Installe les garde-fous Git automatiques'],
      ['changelog', 'Génère le CHANGELOG depuis les commits']
    ]
  },
  {
    title: '🛡️  Sécurité & Conformité',
    items: [
      ['scan', 'Analyse statique (secrets, injections, crypto)'],
      ['secure', 'Audit anti-fuite de secrets avant commit'],
      ['env', 'Génère un .env.example assaini'],
      ['licenses', 'Audit des licences de dépendances']
    ]
  },
  {
    title: '🩺  Diagnostic & Analyse',
    items: [
      ['doctor', 'Diagnostic complet de l\'environnement'],
      ['analyze', 'Audit projet (stack, poids, deps, sécurité)'],
      ['deps [--fix]', 'Dépendances inutilisées et vulnérables'],
      ['explain [erreur]', 'Explique une erreur (IA ou base locale)'],
      ['fix', 'Auto-correction ESLint / Prettier / TS']
    ]
  },
  {
    title: '⚙️  Utilitaires système',
    items: [
      ['ports [port]', 'Inspecte et libère les ports TCP'],
      ['kill-node', 'Arrête les processus Node fantômes'],
      ['clean', 'Libère l\'espace disque'],
      ['cache [action]', 'Gestion des caches npm/pnpm/yarn/docker'],
      ['size', 'Poids réel du code source'],
      ['scripts', 'Menu interactif des scripts npm'],
      ['sql-dump', 'Sauvegarde la base locale depuis le .env'],
      ['log-tail', 'Agrège les logs en direct'],
      ['pack [nom]', 'Archive propre du projet'],
      ['node-switch <v>', 'Bascule de version Node (vérifiée)'],
      ['create', 'Bootstrap next / laravel / vue']
    ]
  },
  {
    title: '🐘  Écosystème Laravel',
    items: [
      ['laravel make-crud', 'Génère le CRUD complet d\'un modèle'],
      ['laravel fresh', 'Nettoie tous les caches Laravel']
    ]
  }
];

program.action(() => {
  const line = '='.repeat(68);
  console.log(pc.cyan(line));
  console.log(pc.cyan(`⚡  flash-dev v${packageJson.version} — Boîte à outils d'automatisation intelligente  ⚡`));
  console.log(pc.cyan(line));

  for (const group of COMMAND_GROUPS) {
    console.log(pc.bold(pc.yellow(`\n${group.title}`)));
    for (const [command, description] of group.items) {
      console.log(pc.green(`  ${command.padEnd(20)}`) + pc.white(description));
    }
  }

  console.log(pc.bold(pc.yellow('\nℹ️  Infos & options globales')));
  console.log(pc.green('  version --check     ') + pc.white('Vérifie les mises à jour npm'));
  console.log(pc.green('  config              ') + pc.white('Monétisation (opt-out inclus)'));
  console.log(pc.green('  --json              ') + pc.white('Sortie machine pour la CI'));
  console.log(pc.green('  --verbose           ') + pc.white('Détails et traces d\'erreur'));
  console.log(pc.green('  --help              ') + pc.white('Aide complète\n'));

  console.log(pc.cyan('Pour commencer : ') + pc.bold(pc.white('flash-dev doctor')) + pc.cyan(' ou ') + pc.bold(pc.white('flash-dev hooks install')) + '\n');
});

program.parse(process.argv);
