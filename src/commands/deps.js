

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { run, inherit } = require('../utils/exec');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const prompts = require('prompts');


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
    if (!config.isJson()) {
      console.log(pc.cyan('\n📦 Flash-dev Deps - Analyse des dépendances\n'));
    }

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fsSync.existsSync(packageJsonPath)) {
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

    
    try {
      // `npm outdated` exits 1 when anything is outdated: read stdout regardless
      const outdated = run('npm', ['outdated', '--json'], { timeout: 180000 }).stdout;
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
      logger.debug('npm outdated indisponible', { reason: error.message });
    }

    
    try {
      const audit = run('npm', ['audit', '--json'], { timeout: 180000 }).stdout;
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
      logger.debug('npm audit indisponible', { reason: error.message });
    }

    
    try {
      const lsOutput = run('npm', ['ls', '--json', '--depth=0'], { timeout: 120000 }).stdout;
      const lsData = JSON.parse(lsOutput);
      if (lsData.dependencies) {
        Object.entries(lsData.dependencies).forEach(([name, data]) => {
          if (data.version && data._deduped === false) {
            analysis.duplicates.push(name);
          }
        });
      }
    } catch (error) {
      logger.debug('npm ls indisponible', { reason: error.message });
    }

    
    const sourceFiles = await findSourceFiles(process.cwd());
    const usedImports = await extractImports(sourceFiles);
    
    const toolingUsage = extractToolingUsage(packageJson);

    Object.keys(allDeps).forEach(dep => {
      if (usedImports.has(dep)) return;
      if (toolingUsage.has(dep)) return;
      if (dep.startsWith('@types/')) return;
      // eslint-config-x / eslint-plugin-x are loaded by name, never imported
      if (/^(@[^/]+\/)?(eslint|prettier|babel|postcss|stylelint)-(config|plugin|preset)/.test(dep)) return;
      analysis.unused.push(dep);
    });

    if (config.isJson()) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    
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

    
    if (fix) {
      console.log(pc.yellow('\n⚙️  Mode auto-fix activé...'));
      
      if (analysis.vulnerabilities.length > 0) {
        console.log(pc.yellow('  Tentative de correction des vulnérabilités...'));
        if (inherit('npm', ['audit', 'fix'], { timeout: 600000 }).ok) {
          console.log(pc.green('  ✅ Vulnérabilités corrigées'));
        } else {
          console.log(pc.yellow('  ⚠️  Certaines vulnérabilités nécessitent une intervention manuelle'));
        }
      }

      if (analysis.outdated.length > 0) {
        console.log(pc.yellow('  Mise à jour des packages obsolètes...'));
        if (inherit('npm', ['update'], { timeout: 600000 }).ok) {
          console.log(pc.green('  ✅ Packages mis à jour'));
        } else {
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
    logger.debug('Trace complète', { stack: error.stack });
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

/**
 * Resolve a specifier to its package name.
 * Scoped packages keep two segments ("@scope/name"), others keep one.
 * @param {string} specifier
 * @returns {string|null}
 */
function toPackageName(specifier) {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/')) return null;
  if (specifier.startsWith('node:')) return null;

  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

async function extractImports(files) {
  const imports = new Set();

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      // Fresh regex per file: a /g regex keeps lastIndex between runs
      const importRegex = /import\s+[^;]*?from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const pkgName = toPackageName(match[1] || match[2] || match[3] || match[4]);
        if (pkgName) imports.add(pkgName);
      }
    } catch (error) {}
  }

  return imports;
}

/**
 * Packages referenced outside of import statements: npm scripts, config keys
 * and well-known tooling that runs through its own binary.
 * @param {object} packageJson
 * @returns {Set<string>}
 */
function extractToolingUsage(packageJson) {
  const used = new Set();
  const scriptBody = Object.values(packageJson.scripts || {}).join(' ');

  const TOOLING = [
    'jest', 'vitest', 'mocha', 'eslint', 'prettier', 'typescript', 'tsx', 'ts-node',
    'nodemon', 'rimraf', 'husky', 'lint-staged', 'webpack', 'vite', 'rollup', 'esbuild',
    'tailwindcss', 'postcss', 'autoprefixer', 'babel', 'nyc', 'c8', 'concurrently',
    'cross-env', 'dotenv-cli', 'semantic-release', 'standard-version'
  ];

  for (const tool of TOOLING) {
    if (scriptBody.includes(tool) || packageJson[tool] !== undefined) {
      used.add(tool);
    }
  }

  // A dedicated config block in package.json counts as usage
  for (const key of Object.keys(packageJson)) {
    used.add(key);
  }

  return used;
}

async function removeUnusedPackages(unused, packageJsonPath, packageJson) {
  const safeToRemove = unused.filter(pkg => !CRITICAL_PACKAGES.includes(pkg));

  if (safeToRemove.length === 0) {
    console.log(pc.yellow('  Aucun package sûr à supprimer (tous sont critiques)'));
    return;
  }

  console.log(pc.yellow(`  Suppression de ${safeToRemove.length} package(s)...`));

  // Keep the exact original bytes so a failed install can be rolled back.
  const originalContent = await fs.readFile(packageJsonPath, 'utf8');
  const updated = JSON.parse(originalContent);

  for (const pkg of safeToRemove) {
    if (updated.dependencies?.[pkg]) delete updated.dependencies[pkg];
    if (updated.devDependencies?.[pkg]) delete updated.devDependencies[pkg];
  }

  await fs.writeFile(packageJsonPath, `${JSON.stringify(updated, null, 2)}\n`);

  if (inherit('npm', ['install'], { timeout: 600000 }).ok) {
    console.log(pc.green('  ✅ Packages supprimés avec succès'));
    return;
  }

  // Rollback: the previous version left package.json mutated on failure.
  await fs.writeFile(packageJsonPath, originalContent);
  console.log(pc.red('  ❌ npm install a échoué — package.json restauré à l\'identique.'));
  console.log(pc.cyan('  Relancez "npm install" pour revenir à un état cohérent.'));
}

module.exports = depsCommand;
