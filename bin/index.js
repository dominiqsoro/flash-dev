#!/usr/bin/env node

const { Command } = require('commander');
const pc = require('picocolors');
const pushCommand = require('../src/commands/push');
const versionCommand = require('../src/commands/version');
const scanCommand = require('../src/commands/scan');
const envCommand = require('../src/commands/env');
const secureCommand = require('../src/commands/secure');
const cleanCommand = require('../src/commands/clean');
const syncCommand = require('../src/commands/git/sync');
const nukeCommand = require('../src/commands/git/nuke');

const packageJson = require('../package.json');

const program = new Command();

program
  .name('flash-dev')
  .description('Boîte à outils d\'automatisation intelligente en ligne de commande (CLI) pour développeurs')
  .version(packageJson.version);

program
  .command('push')
  .description('Automatise le workflow Git (add + commit IA + push)')
  .action(pushCommand);

program
  .command('status')
  .description('Affiche l\'état et la version du CLI')
  .action(versionCommand);

program
  .command('version')
  .description('Affiche l\'état et la version du CLI')
  .action(versionCommand);

program
  .command('scan')
  .description('Analyse la sécurité du projet et détecte les vulnérabilités')
  .action(scanCommand);

program
  .command('env')
  .description('Génère un fichier .env.example sécurisé')
  .action(envCommand);

program
  .command('secure')
  .description('Audit anti-fuite de secrets avant commit')
  .action(secureCommand);

program
  .command('clean')
  .description('Libère l\'espace disque en nettoyant les caches')
  .action(cleanCommand);

program
  .command('sync')
  .description('Synchronise la branche locale avec la branche principale')
  .action(syncCommand);

program
  .command('nuke')
  .description('Nettoie les branches locales fusionnées')
  .action(nukeCommand);

// Commande par défaut si aucune sous-commande n'est fournie
program.action(() => {
  console.log(pc.cyan('flash-dev - Automatisation Git intelligente & Sécurité\n'));
  console.log(pc.white('Commandes disponibles:'));
  console.log(pc.green('  flash-dev push   ') + pc.white('Automatise le workflow Git (add + commit IA + push)'));
  console.log(pc.green('  flash-dev scan   ') + pc.white('Analyse la sécurité du projet'));
  console.log(pc.green('  flash-dev env     ') + pc.white('Génère .env.example sécurisé'));
  console.log(pc.green('  flash-dev secure ') + pc.white('Audit anti-fuite de secrets'));
  console.log(pc.green('  flash-dev clean   ') + pc.white('Libère l\'espace disque'));
  console.log(pc.green('  flash-dev sync    ') + pc.white('Synchronise avec la branche principale'));
  console.log(pc.green('  flash-dev nuke    ') + pc.white('Nettoie les branches fusionnées'));
  console.log(pc.green('  flash-dev status ') + pc.white('Affiche l\'état et la version du CLI'));
  console.log(pc.green('  flash-dev --help ') + pc.white('Affiche l\'aide\n'));
  console.log(pc.cyan('Commencez avec: flash-dev push ou flash-dev scan\n'));
});

program.parse(process.argv);
