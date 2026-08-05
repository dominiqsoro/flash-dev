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
        const downloadUrl = `https://nodejs.org/dist/v${version}/node-v${version}-win-${arch}.zip`;
        const nodeCmdPath = path.join(BIN_DIR, 'node.cmd');
        const npmCmdPath = path.join(BIN_DIR, 'npm.cmd');

        const nodeCmdContent = `@echo off\n"${nodeBinaryPath}" %*`;
        fs.writeFileSync(nodeCmdPath, nodeCmdContent, 'utf8');

        const npmCliPath = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
        if (fs.existsSync(npmCliPath)) {
          const npmCmdContent = `@echo off\n"${nodeBinaryPath}" "${npmCliPath}" %*`;
          fs.writeFileSync(npmCmdPath, npmCmdContent, 'utf8');
        }
      
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
      
    process.exit(1);
  }
}

module.exports = nodeSwitchCommand;