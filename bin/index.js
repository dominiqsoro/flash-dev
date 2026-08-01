#!/usr/bin/env node

const { Command } = require('commander');
const pc = require('picocolors');
const pushCommand = require('../src/commands/push');
const versionCommand = require('../src/commands/version');
const scanCommand = require('../src/commands/scan');

const program = new Command();

program
  .name('flash-dev')
  .description('Boîte à outils d\'automatisation intelligente en ligne de commande (CLI) pour développeurs')
  .version('1.0.0');

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

// Commande par défaut si aucune sous-commande n'est fournie
program.action(() => {
  console.log(pc.cyan('flash-dev - Automatisation Git intelligente & Sécurité\n'));
  console.log(pc.white('Commandes disponibles:'));
  console.log(pc.green('  flash-dev push   ') + pc.white('Automatise le workflow Git (add + commit IA + push)'));
  console.log(pc.green('  flash-dev scan   ') + pc.white('Analyse la sécurité du projet'));
  console.log(pc.green('  flash-dev status ') + pc.white('Affiche l\'état et la version du CLI'));
  console.log(pc.green('  flash-dev --help ') + pc.white('Affiche l\'aide\n'));
  console.log(pc.cyan('Commencez avec: flash-dev push ou flash-dev scan\n'));
});

program.parse(process.argv);
