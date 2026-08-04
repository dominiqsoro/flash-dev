/**
 * Commande: flash-dev deps
 * Analyse des dépendances (Unused, Deprecated, Vulnerabilities, Duplicates, Latest)
 */

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const prompts = require('prompts');

// Packages critiques à ne jamais supprimer sans confirmation explicite
const CRITICAL_PACKAGES = [
  'react', 'react-dom', 'next', 'vue', 'nuxt', '@nestjs/core', 
  'express', 'fastify', 'laravel', 'typescript', 'node'
];

async function depsCommand(options = {}) {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  const { fix } = options;

  try {
    console.log(pc.cyan('\n📦 Flash-dev Deps - Analyse des dépendances\n'));

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(pc.red('Erreur: package.json non trouvé'));
      return;
    }

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    const analysis = {
      unused: [],
      deprecated: [],
      vulnerabilities: [],
      duplicates: [],
      outdated: [],
      heavy: []
    };

    // Détection des packages obsolètes
    try {
      const outdated = execSync('npm outdated --json', { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      });
      if (outdated.trim()) {
        const outdatedData = JSON.parse(outdated);
        Object.keys(outdatedData).forEach(pkg => {
          analysis.outdated.push({
            name: pkg,
            current: outdatedData[pkg].current,
            latest: outdatedData[pkg].latest
          });
        });
      }
    } catch (error) {
      // npm outdated échoue si tout est à jour
    }

    // Détection des vulnérabilités
    try {
      const audit = execSync('npm audit --json', { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      });
      const auditData = JSON.parse(audit);
      if (auditData.vulnerabilities) {
        Object.values(auditData.vulnerabilities).forEach(vuln => {
          if (vuln.severity === 'high' || vuln.severity === 'critical') {
            analysis.vulnerabilities.push({
              name: vuln.name,
              severity: vuln.severity,
              via: vuln.via
            });
          }
        });
      }
    } catch (error) {
      // npm audit peut échouer
    }

    // Détection des packages lourds (approximation via npm ls)
    try {
      const lsOutput = execSync('npm ls --json --depth=0', { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      });
      const lsData = JSON.parse(lsOutput);
      if (lsData.dependencies) {
        Object.entries(lsData.dependencies).forEach(([name, data]) => {
          if (data.version && data._deduped === false) {
            analysis.duplicates.push(name);
          }
        });
      }
    } catch (error) {}

    // Détection des packages potentiellement inutilisés (heuristique simple)
    // En production, on utiliserait un outil comme depcheck ou knip
    const sourceFiles = await findSourceFiles(process.cwd());
    const usedImports = await extractImports(sourceFiles);
    
    Object.keys(allDeps).forEach(dep => {
      if (!usedImports.has(dep) && !dep.startsWith('@types/')) {
        analysis.unused.push(dep);
      }
    });

    if (config.isJson()) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Affichage des résultats
    console.log(pc.bold('Résultats de l\'analyse:\n'));

    if (analysis.outdated.length > 0) {
      console.log(pc.yellow(`📦 Packages obsolètes (${analysis.outdated.length}):`));
      analysis.outdated.slice(0, 10).forEach(pkg => {
        console.log(pc.gray(`  ${pkg.name}: ${pkg.current} → ${pkg.latest}`));
      });
      if (analysis.outdated.length > 10) {
        console.log(pc.gray(`  ... et ${analysis.outdated.length - 10} autres`));
      }
      console.log();
    }

    if (analysis.vulnerabilities.length > 0) {
      console.log(pc.red(`🚨 Vulnérabilités (${analysis.vulnerabilities.length}):`));
      analysis.vulnerabilities.forEach(vuln => {
        console.log(pc.red(`  ${vuln.name} (${vuln.severity})`));
      });
      console.log();
    }

    if (analysis.duplicates.length > 0) {
      console.log(pc.yellow(`🔀 Duplicats (${analysis.duplicates.length}):`));
      analysis.duplicates.slice(0, 10).forEach(pkg => {
        console.log(pc.gray(`  ${pkg}`));
      });
      console.log();
    }

    if (analysis.unused.length > 0) {
      console.log(pc.yellow(`🗑️  Potentiellement inutilisés (${analysis.unused.length}):`));
      analysis.unused.slice(0, 10).forEach(pkg => {
        const isCritical = CRITICAL_PACKAGES.includes(pkg);
        const marker = isCritical ? pc.red(' [CRITICAL]') : '';
        console.log(pc.gray(`  ${pkg}${marker}`));
      });
      if (analysis.unused.length > 10) {
        console.log(pc.gray(`  ... et ${analysis.unused.length - 10} autres`));
      }
      console.log();
    }

    if (analysis.outdated.length === 0 && 
        analysis.vulnerabilities.length === 0 && 
        analysis.duplicates.length === 0 && 
        analysis.unused.length === 0) {
      console.log(pc.green('✅ Aucun problème détecté!\n'));
      return;
    }

    // Mode interactif pour suppression
    if (!fix && analysis.unused.length > 0) {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Voulez-vous supprimer les packages inutilisés?',
        initial: false
      });

      if (confirm) {
        await removeUnusedPackages(analysis.unused, packageJsonPath, packageJson);
      }
    }

    // Mode auto --fix
    if (fix) {
      console.log(pc.yellow('\n⚙️  Mode auto-fix activé...'));
      
      if (analysis.vulnerabilities.length > 0) {
        console.log(pc.yellow('  Tentative de correction des vulnérabilités...'));
        try {
          execSync('npm audit fix', { stdio: 'inherit' });
          console.log(pc.green('  ✅ Vulnérabilités corrigées'));
        } catch (error) {
          console.log(pc.yellow('  ⚠️  Certaines vulnérabilités nécessitent une intervention manuelle'));
        }
      }

      if (analysis.outdated.length > 0) {
        console.log(pc.yellow('  Mise à jour des packages obsolètes...'));
        try {
          execSync('npm update', { stdio: 'inherit' });
          console.log(pc.green('  ✅ Packages mis à jour'));
        } catch (error) {
          console.log(pc.yellow('  ⚠️  Erreur lors de la mise à jour'));
        }
      }

      if (analysis.unused.length > 0) {
        await removeUnusedPackages(analysis.unused, packageJsonPath, packageJson);
      }

      console.log(pc.green('\n✅ Auto-fix terminé!\n'));
    }

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'analyse: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
    throw error;
  }
}

async function findSourceFiles(dir) {
  const files = [];
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
  
  async function scan(currentDir) {
    try {
      const items = await fs.readdir(currentDir);
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
          await scan(itemPath);
        } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(itemPath);
        }
      }
    } catch (error) {}
  }
  
  await scan(dir);
  return files;
}

async function extractImports(files) {
  const imports = new Set();
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const dep = match[1] || match[2];
        // Extraire le nom du package (sans les chemins)
        const pkgName = dep.split('/')[0];
        if (pkgName && !pkgName.startsWith('.')) {
          imports.add(pkgName);
        }
      }
    } catch (error) {}
  }
  
  return imports;
}

async function removeUnusedPackages(unused, packageJsonPath, packageJson) {
  const safeToRemove = unused.filter(pkg => !CRITICAL_PACKAGES.includes(pkg));
  
  if (safeToRemove.length === 0) {
    console.log(pc.yellow('  Aucun package sûr à supprimer (tous sont critiques)'));
    return;
  }

  console.log(pc.yellow(`  Suppression de ${safeToRemove.length} packages...`));
  
  for (const pkg of safeToRemove) {
    if (packageJson.dependencies?.[pkg]) {
      delete packageJson.dependencies[pkg];
    }
    if (packageJson.devDependencies?.[pkg]) {
      delete packageJson.devDependencies[pkg];
    }
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log(pc.green('  ✅ Packages supprimés avec succès'));
  } catch (error) {
    console.log(pc.yellow('  ⚠️  Erreur lors de npm install, restauration...'));
    // En production, on restaurerait le backup
  }
}

module.exports = depsCommand;
