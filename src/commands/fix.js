

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const prompts = require('prompts');

async function fixCommand() {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    console.log(pc.cyan('\n🔧 Flash-dev Fix - Auto-correction du code\n'));

    const fixes = [];
    const backupDir = path.join(process.cwd(), '.flash-dev-backup');

    
    if (!fs.existsSync(backupDir)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    
    const hasEslint = await hasFile('eslint.config.js') || 
                      await hasFile('.eslintrc.js') || 
                      await hasFile('.eslintrc.json') ||
                      await hasFile('.eslintrc.cjs');

    if (hasEslint) {
      console.log(pc.yellow('🔍 Détection ESLint...'));
      try {
        const eslintOutput = execSync('npx eslint . --format json', { 
          encoding: 'utf-8', 
          stdio: 'pipe' 
        });
        const eslintResults = JSON.parse(eslintOutput);
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
        
      }
    }

    
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

    
    const hasTsConfig = await hasFile('tsconfig.json');
    if (hasTsConfig) {
      console.log(pc.yellow('🔍 Détection TypeScript...'));
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        
    const timestamp = Date.now();
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    await fs.mkdir(backupPath, { recursive: true });

    
    const filesToBackup = ['package.json', '.eslintrc.js', '.prettierrc', 'tsconfig.json'];
    for (const file of filesToBackup) {
      if (await hasFile(file)) {
        await fs.copyFile(path.join(process.cwd(), file), path.join(backupPath, file));
      }
    }

    console.log(pc.green(`✅ Sauvegarde créée: ${backupPath}\n`));

    
    console.log(pc.yellow('⚙️  Application des corrections...\n'));

    let appliedCount = 0;

    
    if (hasEslint) {
      console.log(pc.cyan('  ESLint --fix...'));
      try {
        execSync('npx eslint . --fix', { stdio: 'inherit' });
        console.log(pc.green('  ✅ ESLint corrigé'));
        appliedCount++;
      } catch (error) {
        console.log(pc.yellow('  ⚠️  ESLint: certaines corrections nécessitent une intervention manuelle'));
      }
    }

    
    if (hasPrettier) {
      console.log(pc.cyan('  Prettier --write...'));
      try {
        execSync('npx prettier --write .', { stdio: 'inherit' });
        console.log(pc.green('  ✅ Prettier appliqué'));
        appliedCount++;
      } catch (error) {
        console.log(pc.yellow('  ⚠️  Prettier: erreur lors du formatage'));
      }
    }

    
    if (hasEslint) {
      console.log(pc.cyan('  Organisation des imports...'));
      try {
        execSync('npx eslint . --fix --rule "import/order: [2, {groups: [[\'builtin\', \'external\'], [\'internal\], [\'parent\], [\'sibling\'], [\'index\']]}]"', { stdio: 'inherit' });
        console.log(pc.green('  ✅ Imports organisés'));
        appliedCount++;
      } catch (error) {
        console.log(pc.yellow('  ⚠️  Imports: organisation partielle'));
      }
    }

    console.log();
    console.log(pc.green(`✨ ${appliedCount} correction(s) appliquée(s)!\n`));
    console.log(pc.cyan(`📦 Sauvegarde disponible: ${backupPath}\n`));

    
    console.log(pc.yellow('Pour restaurer la sauvegarde:'));
    console.log(pc.gray(`  cp -r ${backupPath}/* .\n`));

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de la correction: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
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
