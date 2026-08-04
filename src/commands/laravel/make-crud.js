const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { execSync } = require('child_process');

/**
 * Commande: laravel make-crud <model>
 * Génère le CRUD complet pour un modèle Laravel
 */
function makeCrudCommand(modelArg) {
  try {
    if (!modelArg) {
      console.log(pc.red('Erreur : Aucun nom de modèle fourni.'));
      process.exit(1);
    }

    // Vérifie si le fichier 'artisan' existe à la racine du projet
    const artisanPath = path.join(process.cwd(), 'artisan');
    if (!fs.existsSync(artisanPath)) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Ce dossier n\'est pas un projet Laravel valide (fichier artisan introuvable).'));
      process.exit(1);
    }

    // Capitalise la première lettre du modèle pour forcer StudlyCase
    const model = modelArg.charAt(0).toUpperCase() + modelArg.slice(1);

    console.log(pc.cyan(`\n🚀 Génération du CRUD complet pour le modèle : ${pc.bold(model)}\n`));

    const commands = [
      { cmd: `php artisan make:model ${model} -m`, desc: 'Création du modèle et de la migration...' },
      { cmd: `php artisan make:controller ${model}Controller --api`, desc: 'Création du contrôleur API...' },
      { cmd: `php artisan make:request Store${model}Request`, desc: 'Création de la requête Store...' },
      { cmd: `php artisan make:request Update${model}Request`, desc: 'Création de la requête Update...' },
      { cmd: `php artisan make:resource ${model}Resource`, desc: 'Création de la ressource API...' }
    ];

    for (const step of commands) {
      console.log(pc.yellow(`🔹 ${step.desc}`));
      try {
        execSync(step.cmd, { stdio: 'inherit' });
      } catch (err) {
        console.log(pc.red(`\n❌ Échec lors de l'exécution de la commande: ${step.cmd}`));
        console.log(pc.red(`Détails: ${err.message}`));
        process.exit(1);
      }
    }

    console.log(pc.green(`\n✨ CRUD pour ${pc.bold(model)} généré avec succès ! 🚀\n`));
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}`));
    process.exit(1);
  }
}

module.exports = makeCrudCommand;
