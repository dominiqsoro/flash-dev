const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { execSync } = require('child_process');

/**
 * Commande: pack <archive-name>
 * Compresse le projet actuel dans une archive tar.gz propre en excluant les fichiers du .gitignore
 */
function packCommand(archiveNameArg) {
  try {
    console.log(pc.cyan('\n📦 Création d\'une archive propre du projet...\n'));

    let archiveName = archiveNameArg;
    if (!archiveName) {
      // Nom par défaut si non spécifié
      const folderName = path.basename(process.cwd());
      archiveName = `pack_${folderName}_${Date.now()}`;
    }

    // S'assurer de l'extension .tar.gz
    if (!archiveName.endsWith('.tar.gz') && !archiveName.endsWith('.tgz')) {
      archiveName += '.tar.gz';
    }

    console.log(pc.yellow(`Analyse de .gitignore pour exclure les répertoires lourds...`));

    const excludes = ['.git', 'node_modules', 'dist', 'build', '.cache', 'vendor'];
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const lines = gitignoreContent.split(/\r?\n/);
      for (let line of lines) {
        line = line.trim();
        // Garder uniquement les lignes non vides, non commentées, et exclure les lignes complexes/fichiers spécifiques
        if (line && !line.startsWith('#') && !line.startsWith('!')) {
          // Normaliser l'exclusion pour tar (retirer les slashs de début/fin)
          let cleanLine = line;
          if (cleanLine.startsWith('/')) cleanLine = cleanLine.slice(1);
          if (cleanLine.endsWith('/')) cleanLine = cleanLine.slice(0, -1);
          if (cleanLine && !excludes.includes(cleanLine)) {
            excludes.push(cleanLine);
          }
        }
      }
    }

    console.log(pc.cyan('Exclusions configurées :'));
    console.log(pc.gray(`  ${excludes.join(', ')}`));

    // Construction de la commande tar native (compatible Windows 10+, macOS et Linux)
    const excludeArgs = excludes.map(exc => {
      // Gérer la compatibilité des guillemets selon l'OS
      return `--exclude="${exc}"`;
    }).join(' ');

    const tarCommand = `tar -czf "${archiveName}" ${excludeArgs} .`;

    console.log(pc.yellow(`\n⏳ Compression en cours vers : ${pc.bold(archiveName)}...`));
    
    try {
      execSync(tarCommand, { stdio: 'ignore', shell: true });
      
      const filePath = path.join(process.cwd(), archiveName);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeFormatted = parseFloat((stats.size / (1024 * 1024)).toFixed(2)) + ' MB';
        
        console.log(pc.green(`\n✨ Archive créée avec succès !`));
        console.log(pc.green(`📁 Fichier    : ${pc.bold(archiveName)}`));
        console.log(pc.green(`⚖️  Taille     : ${pc.bold(sizeFormatted)}\n`));
      } else {
        throw new Error('Le fichier archive n\'a pas été généré.');
      }
    } catch (err) {
      console.log(pc.red(`\n❌ Échec de la compression via l'utilitaire système 'tar'.`));
      console.log(pc.yellow('Vérifiez que l\'exécutable "tar" est installé sur votre système (standard sur macOS, Linux et Windows 10/11).'));
      console.log(pc.gray(`Détails de l'erreur: ${err.message}\n`));
      process.exit(1);
    }

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = packCommand;