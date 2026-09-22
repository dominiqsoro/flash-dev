const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const os = require('os');
const { run } = require('../utils/exec');
const { formatBytes } = require('../utils/fs-helpers');

/**
 * flash-dev pack [archive-name]
 * Create a clean tar.gz archive of the project (respects .gitignore exclusions).
 */
function packCommand(archiveNameArg) {
  try {
    console.log(pc.cyan('\n📦 Création d\'une archive propre du projet...\n'));

    let archiveName = archiveNameArg;
    if (!archiveName) {
      const folderName = path.basename(process.cwd());
      archiveName = `pack_${folderName}_${Date.now()}`;
    }

    if (!archiveName.endsWith('.tar.gz') && !archiveName.endsWith('.tgz')) {
      archiveName += '.tar.gz';
    }

    // Keep archive name filesystem-safe
    archiveName = archiveName.replace(/[<>:"|?*]/g, '_');

    console.log(pc.yellow('Analyse de .gitignore pour exclure les répertoires lourds...'));

    const excludes = ['.git', 'node_modules', 'dist', 'build', '.cache', 'vendor'];
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const lines = fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/);
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#') || line.startsWith('!')) continue;

        let cleanLine = line;
        if (cleanLine.startsWith('/')) cleanLine = cleanLine.slice(1);
        if (cleanLine.endsWith('/')) cleanLine = cleanLine.slice(0, -1);
        if (cleanLine && !excludes.includes(cleanLine)) {
          excludes.push(cleanLine);
        }
      }
    }

    console.log(pc.cyan('Exclusions configurées :'));
    console.log(pc.gray(`  ${excludes.join(', ')}`));

    const args = ['-czf'];

    // Write the archive OUTSIDE the tree being read. Creating it in place made
    // tar report "file changed as we read it" and exit 1 on every run.
    const stagingPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'flash-dev-pack-')),
      path.basename(archiveName)
    );
    args.push(stagingPath);

    for (const exclude of excludes) {
      args.push(`--exclude=${exclude}`);
    }
    args.push('.');

    console.log(pc.yellow(`\n⏳ Compression en cours vers : ${pc.bold(archiveName)}...`));

    const result = run('tar', args, { timeout: 600000 });

    const filePath = path.resolve(process.cwd(), archiveName);

    if (!result.ok || !fs.existsSync(stagingPath)) {
      try { fs.rmSync(path.dirname(stagingPath), { recursive: true, force: true }); } catch { /* best effort */ }

      console.log(pc.red('\n❌ Échec de la compression via l\'utilitaire système "tar".'));
      console.log(pc.yellow('Vérifiez que "tar" est installé (standard sur macOS, Linux et Windows 10/11).'));
      if (result.stderr) console.log(pc.gray(result.stderr.trim()));
      process.exitCode = 1;
      return 1;
    }

    fs.copyFileSync(stagingPath, filePath);
    try { fs.rmSync(path.dirname(stagingPath), { recursive: true, force: true }); } catch { /* best effort */ }

    const stats = fs.statSync(filePath);
    console.log(pc.green(`\n✨ Archive créée avec succès !`));
    console.log(pc.green(`📁 Fichier    : ${pc.bold(archiveName)}`));
    console.log(pc.green(`⚖️  Taille     : ${pc.bold(formatBytes(stats.size))}\n`));
    return 0;
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exitCode = 1;
    return 1;
  }
}

module.exports = packCommand;
