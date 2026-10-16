const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const { inherit } = require('../utils/exec');


async function scriptsCommand() {
  try {
    console.log(pc.cyan('\n📜 Exécuteur de scripts package.json...\n'));

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Fichier package.json introuvable dans le dossier actuel.'));
      console.log(pc.cyan('Cette commande doit être lancée à la racine d\'un projet Node.js.'));
      process.exit(1);
    }

    const content = fs.readFileSync(packageJsonPath, 'utf8');
    let packageJson;
    try {
      packageJson = JSON.parse(content);
    } catch (e) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Le fichier package.json est mal formé.'));
      process.exit(1);
    }

    const scripts = packageJson.scripts;
    if (!scripts || Object.keys(scripts).length === 0) {
      console.log(pc.yellow('Aucun script défini dans la section "scripts" du package.json.'));
      process.exit(0);
    }

    const choices = Object.entries(scripts).map(([name, cmd]) => ({
      title: name,
      description: cmd,
      value: name
    }));

    const response = await prompts({
      type: 'select',
      name: 'scriptName',
      message: 'Choisissez le script à exécuter :',
      choices: choices,
      initial: 0
    });

    if (!response.scriptName) {
      console.log(pc.yellow('\nOpération annulée par l\'utilisateur.\n'));
      process.exit(0);
    }

    const selectedScript = response.scriptName;
    console.log(pc.cyan(`\n🚀 Lancement de : ${pc.bold('npm run ' + selectedScript)}\n`));

    // argv form: a script name containing shell metacharacters stays inert
    const result = inherit('npm', ['run', selectedScript]);

    if (result.ok) {
      console.log(pc.green(`\n✅ Script "${selectedScript}" exécuté avec succès !\n`));
    } else {
      console.log(pc.red(`\n❌ Le script "${selectedScript}" a échoué (code ${result.status}).\n`));
      process.exitCode = result.status || 1;
    }
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = scriptsCommand;