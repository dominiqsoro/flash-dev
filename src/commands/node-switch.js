const fs = require('fs');
const path = require('path');
const os = require('os');
const pc = require('picocolors');
const { execSync } = require('child_process');

const CACHE_DIR = path.join(os.homedir(), '.flash-dev', 'node-versions');
const BIN_DIR = path.join(os.homedir(), '.flash-dev', 'bin');

/**
 * Assure l'existence des répertoires de gestion de version
 */
function ensureDirs() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
}

/**
 * Commande: node-switch <version>
 * Gère et bascule localement la version de Node.js active
 */
function nodeSwitchCommand(versionArg) {
  try {
    console.log(pc.cyan('\n⚡  Basculeur de version Node.js local...\n'));

    if (!versionArg) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Veuillez spécifier la version de Node.js souhaitée (ex: 18.16.0, 20.11.0).'));
      process.exit(1);
    }

    // Normaliser la version (enlever un éventuel 'v' initial)
    const version = versionArg.startsWith('v') ? versionArg.slice(1) : versionArg;
    
    ensureDirs();

    const isWin = process.platform === 'win32';
    const arch = process.arch === 'x64' ? 'x64' : (process.arch === 'arm64' ? 'arm64' : 'x86');
    
    // Déterminer le dossier spécifique à cette version dans le cache
    const versionDir = path.join(CACHE_DIR, `v${version}`);
    const nodeBinaryPath = isWin 
      ? path.join(versionDir, 'node.exe') 
      : path.join(versionDir, 'bin', 'node');

    if (fs.existsSync(nodeBinaryPath)) {
      console.log(pc.green(`✨ La version v${version} de Node.js est déjà présente dans le cache.`));
    } else {
      console.log(pc.yellow(`📦 La version v${version} n'est pas présente dans le cache. Téléchargement depuis nodejs.org...`));
      
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
      }

      if (isWin) {
        // Téléchargement du binaire node.exe directement pour Windows
        const downloadUrl = `https://nodejs.org/dist/v${version}/win-${arch}/node.exe`;
        const tempPath = path.join(versionDir, 'node.exe');
        
        console.log(pc.gray(`  Téléchargement : ${downloadUrl}`));
        try {
          execSync(`powershell.exe -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${tempPath}'"`, { stdio: 'pipe' });
          console.log(pc.green('✅ Téléchargement du binaire Windows terminé.'));
        } catch (err) {
          console.log(pc.red(`\n❌ Échec du téléchargement. Veuillez vérifier la validité de la version "${version}".`));
          console.log(pc.gray(`Détails: ${err.message}`));
          // Nettoyer
          try { fs.rmSync(versionDir, { recursive: true, force: true }); } catch (e) {}
          process.exit(1);
        }
      } else {
        // macOS ou Linux - Téléchargement et extraction de l'archive tar.gz
        const platformName = process.platform === 'darwin' ? 'osx' : 'linux';
        const archiveName = `node-v${version}-${platformName}-${arch}.tar.gz`;
        const downloadUrl = `https://nodejs.org/dist/v${version}/${archiveName}`;
        const archivePath = path.join(CACHE_DIR, archiveName);

        console.log(pc.gray(`  Téléchargement : ${downloadUrl}`));
        try {
          execSync(`curl -sSL "${downloadUrl}" -o "${archivePath}"`, { stdio: 'pipe' });
          console.log(pc.green('✅ Téléchargement de l\'archive terminé.'));
          
          console.log(pc.yellow('⏳ Extraction de l\'archive...'));
          // Extraire l'archive directement dans le sous-dossier versionDir
          execSync(`tar -xzf "${archivePath}" -C "${versionDir}" --strip-components=1`, { stdio: 'pipe' });
          console.log(pc.green('✅ Extraction terminée.'));
          
          // Nettoyer l'archive compressée
          fs.unlinkSync(archivePath);
        } catch (err) {
          console.log(pc.red(`\n❌ Échec du téléchargement ou de l'extraction. Veuillez vérifier que 'curl' et 'tar' sont disponibles et que la version "${version}" existe.`));
          console.log(pc.gray(`Détails: ${err.message}`));
          // Nettoyer
          try { fs.rmSync(versionDir, { recursive: true, force: true }); } catch (e) {}
          process.exit(1);
        }
      }
    }

    // Configurer le commutateur de version dans ~/.flash-dev/bin/
    console.log(pc.yellow('\n⚙️  Mise à jour de la liaison locale de Node.js...'));

    if (isWin) {
      // Écriture d'un script wrapper .cmd qui ne requiert aucun privilège admin
      const nodeCmdPath = path.join(BIN_DIR, 'node.cmd');
      const npmCmdPath = path.join(BIN_DIR, 'npm.cmd');

      const nodeCmdContent = `@echo off\n"${nodeBinaryPath}" %*`;
      fs.writeFileSync(nodeCmdPath, nodeCmdContent, 'utf8');

      // npm wrapper pointant vers le npm de la bonne version si disponible, sinon en s'appuyant sur l'exécutable node
      const npmCliPath = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (fs.existsSync(npmCliPath)) {
        const npmCmdContent = `@echo off\n"${nodeBinaryPath}" "${npmCliPath}" %*`;
        fs.writeFileSync(npmCmdPath, npmCmdContent, 'utf8');
      }

      console.log(pc.green('✅ Liaisons Windows créées.'));
      console.log(pc.cyan('\n💡 Pour activer cette version de manière permanente dans votre terminal actuel :'));
      console.log(pc.white(`  $env:PATH = "${BIN_DIR};" + $env:PATH`));
      console.log(pc.cyan('\n💡 Pour l\'ajouter de manière permanente à votre compte utilisateur Windows (PowerShell) :'));
      console.log(pc.white(`  [Environment]::SetEnvironmentVariable("Path", "${BIN_DIR};" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")`));
    } else {
      // Unix - Création d'un wrapper bash exécutable
      const nodeShPath = path.join(BIN_DIR, 'node');
      const shContent = `#!/bin/sh\nexec "${nodeBinaryPath}" "$@"`;
      
      fs.writeFileSync(nodeShPath, shContent, { encoding: 'utf8', mode: 0o755 });

      console.log(pc.green('✅ Liaisons Unix créées.'));
      console.log(pc.cyan('\n💡 Pour activer cette version de manière permanente, ajoutez cette ligne à votre ~/.bashrc ou ~/.zshrc :'));
      console.log(pc.white(`  export PATH="${BIN_DIR}:$PATH"`));
    }

    console.log(pc.green(`\n🚀 flash-dev est configuré pour rediriger 'node' vers la version v${version} ! ✨\n`));

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = nodeSwitchCommand;