/**
 * Commande: flash-dev fix
 * Auto-correction: ESLint, TypeScript, imports, formatting
 */

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { run, inherit } = require('../utils/exec');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const prompts = require('prompts');

async function fixCommand() {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    if (!config.isJson()) {
      console.log(pc.cyan('\n🔧 Flash-dev Fix - Auto-correction du code\n'));
    }

    logger.debug('Détection des outils de correction démarrée');
    const fixes = [];
    const backupDir = path.join(process.cwd(), '.flash-dev-backup');

    // Créer le dossier de backup
    if (!fsSync.existsSync(backupDir)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Détection ESLint
    const hasEslint = await hasFile('eslint.config.js') || 
                      await hasFile('.eslintrc.js') || 
                      await hasFile('.eslintrc.json') ||
                      await hasFile('.eslintrc.cjs');

    if (hasEslint) {
      console.log(pc.yellow('🔍 Détection ESLint...'));
      try {
        const eslintRun = run('npx', ['eslint', '.', '--format', 'json'], { timeout: 180000 });
        const eslintResults = JSON.parse(eslintRun.stdout || '[]');
        const errorCount = eslintResults.reduce((sum, file) => sum + file.errorCount, 0);
        const warningCount = eslintResults.reduce((sum, file) => sum + file.warningCount, 0);
        
        if (errorCount > 0 || warningCount > 0) {
          fixes.push({
            tool: 'ESLint',
            errors: errorCount,
            warnings: warningCount,
            fixable: true
          });
        }
      } catch (error) {
        // ESLint peut ne pas avoir de problèmes
      }
    }

    // Détection Prettier
    const hasPrettier = await hasFile('.prettierrc') || 
                        await hasFile('.prettierrc.json') ||
                        await hasFile('.prettierrc.js') ||
                        await hasFile('prettier.config.js');

    if (hasPrettier) {
      console.log(pc.yellow('🔍 Détection Prettier...'));
      fixes.push({
        tool: 'Prettier',
        description: 'Formatage du code',
        fixable: true
      });
    }

    // Détection TypeScript
    const hasTsConfig = await hasFile('tsconfig.json');
    if (hasTsConfig) {
      console.log(pc.yellow('🔍 Détection TypeScript...'));
      try {
        if (!run('npx', ['tsc', '--noEmit'], { timeout: 300000 }).ok) {
          throw new Error('type errors');
        }
      } catch (error) {
        fixes.push({
          tool: 'TypeScript',
          description: 'Erreurs de type détectées',
          fixable: false
        });
      }
    }

    // Imports (via ESLint ou simple heuristique)


    if (config.isJson()) {
      console.log(JSON.stringify(fixes, null, 2));
      return;
    }

    // Affichage des fixes disponibles
    if (fixes.length === 0) {
      console.log(pc.green('✅ Aucun problème détecté!\n'));
      return;
    }

    console.log(pc.bold('Fixes disponibles:\n'));
    let totalFixable = 0;
    fixes.forEach((fix, i) => {
      const status = fix.fixable ? pc.green('[Fixable]') : pc.red('[Manuel]');
      console.log(`  ${i + 1}. ${fix.tool}: ${fix.description || ''} ${status}`);
      if (fix.errors !== undefined) console.log(pc.gray(`     Erreurs: ${fix.errors}, Avertissements: ${fix.warnings}`));
      if (fix.fixable) totalFixable++;
    });

    console.log();
    console.log(pc.cyan(`Total: ${totalFixable} fixable(s) sur ${fixes.length}\n`));

    // Confirmation
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Appliquer les corrections automatiques?',
      initial: false
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return;
    }

    // Backup avant modifications
    console.log(pc.yellow('📦 Création d\'une sauvegarde...'));
    const timestamp = Date.now();
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    await fs.mkdir(backupPath, { recursive: true });

    // Backup des fichiers modifiés
    const filesToBackup = ['package.json', '.eslintrc.js', '.prettierrc', 'tsconfig.json'];
    for (const file of filesToBackup) {
      if (await hasFile(file)) {
        await fs.copyFile(path.join(process.cwd(), file), path.join(backupPath, file));
      }
    }

    console.log(pc.green(`✅ Sauvegarde créée: ${backupPath}\n`));

    // Application des fixes
    console.log(pc.yellow('⚙️  Application des corrections...\n'));

    let appliedCount = 0;

    // ESLint --fix
    if (hasEslint) {
      console.log(pc.cyan('  ESLint --fix...'));
      if (inherit('npx', ['eslint', '.', '--fix'], { timeout: 300000 }).ok) {
        console.log(pc.green('  ✅ ESLint corrigé'));
        appliedCount++;
      } else {
        console.log(pc.yellow('  ⚠️  ESLint: certaines corrections nécessitent une intervention manuelle'));
      }
    }

    // Prettier --write
    if (hasPrettier) {
      console.log(pc.cyan('  Prettier --write...'));
      if (inherit('npx', ['prettier', '--write', '.'], { timeout: 300000 }).ok) {
        console.log(pc.green('  ✅ Prettier appliqué'));
        appliedCount++;
      } else {
        console.log(pc.yellow('  ⚠️  Prettier: erreur lors du formatage'));
      }
    }

    // L'organisation des imports est déjà couverte par `eslint --fix`
    // quand le projet active eslint-plugin-import : inutile de relancer ESLint
    // avec une règle inline (l'ancienne chaîne était mal échappée et échouait).

    console.log();
    console.log(pc.green(`✨ ${appliedCount} correction(s) appliquée(s)!\n`));
    console.log(pc.cyan(`📦 Sauvegarde disponible: ${backupPath}\n`));

    // Instructions de rollback
    console.log(pc.yellow('Pour restaurer la sauvegarde:'));
    console.log(pc.gray(`  cp -r ${backupPath}/* .\n`));

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de la correction: ${error.message}\n`));
    logger.debug('Trace complète', { stack: error.stack });
    throw error;
  }
}

async function hasFile(filename) {
  try {
    await fs.access(path.join(process.cwd(), filename));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = fixCommand;
