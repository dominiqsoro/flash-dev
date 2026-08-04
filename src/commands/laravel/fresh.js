const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { execSync } = require('child_process');

/**
 * Commande: laravel fresh
 * Nettoie et optimise l'application Laravel
 */
function freshCommand() {
  try {
    // Vérifie si le fichier 'artisan' existe à la racine du projet
    const artisanPath = path.join(process.cwd(), 'artisan');
    if (!fs.existsSync(artisanPath)) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Ce dossier n\'est pas un projet Laravel valide (fichier artisan introuvable).'));
      process.exit(1);
    }

    console.log(pc.cyan(`\n🧹 Nettoyage et optimisation de l'application Laravel...\n`));

    const commands = [
      'php artisan cache:clear',
      'php artisan config:clear',
      'php artisan route:clear',
      'php artisan view:clear',
      'composer dump-autoload'
    ];

    const totalSteps = commands.length;
    
    // Barre de progression simple
    for (let i = 0; i < totalSteps; i++) {
      const progress = Math.round(((i + 1) / totalSteps) * 100);
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      process.stdout.write(`\r${pc.cyan('Progression:')} ${pc.green(bar)} ${progress}%`);
      
      try {
        execSync(commands[i], { stdio: 'ignore' });
      } catch (err) {
        process.stdout.write('\n');
        console.log(pc.red(`\n❌ Échec de l'étape : ${commands[i]}`));
        console.log(pc.red(`Détails: ${err.message}`));
        process.exit(1);
      }
    }

    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log(pc.green(`\n✨ Application Laravel nettoyée et optimisée avec succès ! ✨\n`));
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}`));
    process.exit(1);
  }
}

module.exports = freshCommand;
