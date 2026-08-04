/**
 * Commande: flash-dev cache
 * Gestion des caches (npm, pnpm, yarn, composer, docker, vite, next)
 */

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const prompts = require('prompts');

async function cacheCommand(action = 'list') {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    console.log(pc.cyan('\n🗑️  Flash-dev Cache - Gestion des caches\n'));

    const caches = await detectCaches();

    if (config.isJson()) {
      console.log(JSON.stringify(caches, null, 2));
      process.exit(0);
    }

    if (action === 'list') {
      console.log(pc.bold('Caches détectés:\n'));
      
      let totalSize = 0;
      for (const [name, info] of Object.entries(caches)) {
        if (info.exists) {
          console.log(pc.green(`  ${name}:`));
          console.log(pc.gray(`    Chemin: ${info.path}`));
          console.log(pc.gray(`    Taille: ${formatBytes(info.size)}`));
          totalSize += info.size;
        } else {
          console.log(pc.gray(`  ${name}: non détecté`));
        }
      }
      
      console.log(pc.cyan(`\nTotal: ${formatBytes(totalSize)}\n`));
    } 
    else if (action === 'stats') {
      console.log(pc.bold('Statistiques des caches:\n'));
      
      const stats = {
        total: 0,
        byType: {}
      };
      
      for (const [name, info] of Object.entries(caches)) {
        if (info.exists) {
          stats.total += info.size;
          const type = info.type || 'other';
          stats.byType[type] = (stats.byType[type] || 0) + info.size;
        }
      }
      
      console.log(pc.gray(`  Total: ${formatBytes(stats.total)}\n`));
      console.log(pc.bold('  Par type:'));
      for (const [type, size] of Object.entries(stats.byType)) {
        console.log(pc.gray(`    ${type}: ${formatBytes(size)}`));
      }
      console.log();
    }
    else if (action === 'clean') {
      console.log(pc.bold('Caches à nettoyer:\n'));
      
      const cleanable = Object.entries(caches).filter(([_, info]) => info.exists);
      
      if (cleanable.length === 0) {
        console.log(pc.green('Aucun cache à nettoyer\n'));
        process.exit(0);
      }
      
      let totalSize = 0;
      cleanable.forEach(([name, info]) => {
        console.log(pc.gray(`  ${name}: ${formatBytes(info.size)}`));
        totalSize += info.size;
      });
      
      console.log(pc.cyan(`\nTotal à libérer: ${formatBytes(totalSize)}\n`));
      
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Confirmer le nettoyage?',
        initial: false
      });
      
      if (!confirm) {
        console.log(pc.yellow('\nOpération annulée.\n'));
        process.exit(0);
      }
      
      console.log(pc.yellow('Nettoyage en cours...\n'));
      
      let cleanedCount = 0;
      let cleanedSize = 0;
      
      for (const [name, info] of cleanable) {
        try {
          await cleanCache(name, info);
          console.log(pc.green(`  ✅ ${name} nettoyé`));
          cleanedCount++;
          cleanedSize += info.size;
        } catch (error) {
          console.log(pc.yellow(`  ⚠️  ${name}: ${error.message}`));
        }
      }
      
      console.log();
      console.log(pc.green(`✨ ${cleanedCount} cache(s) nettoyé(s)`));
      console.log(pc.cyan(`Espace libéré: ${formatBytes(cleanedSize)}\n`));
    }

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
    process.exit(1);
  }
}

async function detectCaches() {
  const caches = {};
  const root = process.cwd();
  const homeDir = require('os').homedir();

  // npm cache
  try {
    const npmCachePath = path.join(homeDir, '.npm', '_cacache');
    const npmSize = await getDirectorySize(npmCachePath);
    caches.npm = {
      path: npmCachePath,
      size: npmSize,
      exists: true,
      type: 'node'
    };
  } catch (error) {
    caches.npm = { exists: false, type: 'node' };
  }

  // pnpm cache
  try {
    const pnpmCachePath = path.join(homeDir, '.pnpm-store');
    const pnpmSize = await getDirectorySize(pnpmCachePath);
    caches.pnpm = {
      path: pnpmCachePath,
      size: pnpmSize,
      exists: true,
      type: 'node'
    };
  } catch (error) {
    caches.pnpm = { exists: false, type: 'node' };
  }

  // yarn cache
  try {
    const yarnCachePath = path.join(homeDir, '.yarn', 'cache');
    const yarnSize = await getDirectorySize(yarnCachePath);
    caches.yarn = {
      path: yarnCachePath,
      size: yarnSize,
      exists: true,
      type: 'node'
    };
  } catch (error) {
    caches.yarn = { exists: false, type: 'node' };
  }

  // Composer cache (PHP)
  try {
    const composerCachePath = path.join(homeDir, '.composer', 'cache');
    const composerSize = await getDirectorySize(composerCachePath);
    caches.composer = {
      path: composerCachePath,
      size: composerSize,
      exists: true,
      type: 'php'
    };
  } catch (error) {
    caches.composer = { exists: false, type: 'php' };
  }

  // Docker cache
  try {
    execSync('docker info', { stdio: 'pipe' });
    const dockerSize = await getDockerCacheSize();
    caches.docker = {
      path: 'Docker (dangling images)',
      size: dockerSize,
      exists: true,
      type: 'docker'
    };
  } catch (error) {
    caches.docker = { exists: false, type: 'docker' };
  }

  // Vite cache (local)
  try {
    const viteCachePath = path.join(root, 'node_modules', '.vite');
    const viteSize = await getDirectorySize(viteCachePath);
    caches.vite = {
      path: viteCachePath,
      size: viteSize,
      exists: true,
      type: 'build'
    };
  } catch (error) {
    caches.vite = { exists: false, type: 'build' };
  }

  // Next.js cache (local)
  try {
    const nextCachePath = path.join(root, '.next', 'cache');
    const nextSize = await getDirectorySize(nextCachePath);
    caches.next = {
      path: nextCachePath,
      size: nextSize,
      exists: true,
      type: 'build'
    };
  } catch (error) {
    caches.next = { exists: false, type: 'build' };
  }

  return caches;
}

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  async function calculateSize(currentPath) {
    try {
      const stats = await fs.stat(currentPath);
      if (stats.isDirectory()) {
        const items = await fs.readdir(currentPath);
        for (const item of items) {
          await calculateSize(path.join(currentPath, item));
        }
      } else {
        totalSize += stats.size;
      }
    } catch (error) {}
  }
  
  await calculateSize(dirPath);
  return totalSize;
}

async function getDockerCacheSize() {
  try {
    const output = execSync('docker images -f "dangling=true" --format "{{.Size}}"', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const sizes = output.trim().split('\n').filter(Boolean);
    return sizes.reduce((total, size) => total + parseDockerSize(size), 0);
  } catch (error) {
    return 0;
  }
}

function parseDockerSize(sizeStr) {
  const units = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/i);
  if (!match) return 0;
  const [, value, unit] = match;
  return parseFloat(value) * (units[unit.toUpperCase()] || 1);
}

async function cleanCache(name, info) {
  if (name === 'docker') {
    execSync('docker image prune -f', { stdio: 'pipe' });
  } else if (name === 'npm') {
    execSync('npm cache clean --force', { stdio: 'pipe' });
  } else if (name === 'pnpm') {
    execSync('pnpm store prune', { stdio: 'pipe' });
  } else if (name === 'yarn') {
    execSync('yarn cache clean', { stdio: 'pipe' });
  } else if (name === 'composer') {
    execSync('composer clear-cache', { stdio: 'pipe' });
  } else {
    // Nettoyage manuel du dossier
    await fs.rm(info.path, { recursive: true, force: true });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

module.exports = cacheCommand;
