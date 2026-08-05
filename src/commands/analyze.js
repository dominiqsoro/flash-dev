

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const sizeCommand = require('./size');
const scanCommand = require('./scan');
const FrameworkDetector = require('../detectors/framework');
const NodeDetector = require('../detectors/node');
const GitDetector = require('../detectors/git');
const { initGeminiClient, generateCommitMessage } = require('../utils/ai');
const { getApiKey } = require('../utils/config');
const fs = require('fs').promises;
const path = require('path');

async function analyzeCommand() {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    console.log(pc.cyan('\n📊 Flash-dev Analyze - Audit complet du projet\n'));

    
    const [framework, node, git] = await Promise.all([
      new FrameworkDetector().detect(),
      new NodeDetector().detect(),
      new GitDetector().detect()
    ]);

    
    let sizeInfo = { sourceSize: 0, ignoredSize: 0, sourceFileCount: 0, ignoredFileCount: 0 };
    try {
      
      
      const rootDir = process.cwd();
      async function calculateSize(dir, excluded = []) {
        let totalSize = 0;
        let fileCount = 0;
        try {
          const items = await fs.readdir(dir);
          for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = await fs.stat(itemPath);
            if (stats.isDirectory()) {
              if (!excluded.includes(item)) {
                const subResult = await calculateSize(itemPath, excluded);
                totalSize += subResult.size;
                fileCount += subResult.count;
              }
            } else {
              totalSize += stats.size;
              fileCount++;
            }
          }
        } catch (error) {}
        return { size: totalSize, count: fileCount };
      }
      const result = await calculateSize(rootDir, ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt']);
      sizeInfo.sourceSize = result.size;
      sizeInfo.sourceFileCount = result.count;
    } catch (error) {}

    
    let depsInfo = { total: 0, unused: 0, deprecated: 0, vulnerabilities: 0, duplicates: 0 };
    if (node.hasPackageJson) {
      try {
        const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8'));
        depsInfo.total = Object.keys(packageJson.dependencies || {}).length + 
                          Object.keys(packageJson.devDependencies || {}).length;
      } catch (error) {}
    }

    
    const results = {
      framework,
      node,
      git,
      size: sizeInfo,
      dependencies: depsInfo,
      architecture: {
        score: 0,
        suggestions: []
      }
    };

    if (config.isJson()) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    
    console.log(pc.bold('Projet'));
    if (framework.framework) {
      console.log(pc.green(`  Framework: ${framework.framework.charAt(0).toUpperCase() + framework.framework.slice(1)} ${framework.version || ''}`));
      console.log(pc.gray(`  Langage: ${framework.language}`));
    } else {
      console.log(pc.yellow('  Framework: Non détecté'));
    }
    console.log(pc.gray(`  Fichiers source: ${sizeInfo.sourceFileCount}`));
    console.log(pc.gray(`  Taille source: ${formatBytes(sizeInfo.sourceSize)}`));

    console.log(pc.bold('\nDépendances'));
    console.log(pc.gray(`  Total: ${depsInfo.total}`));
    if (depsInfo.total > 0) {
      console.log(pc.gray(`  Prod: ${node.dependencies}`));
      console.log(pc.gray(`  Dev: ${node.devDependencies}`));
    }

    console.log(pc.bold('\nGit'));
    if (git.repository) {
      console.log(pc.green(`  Dépôt: ${git.status}`));
      console.log(pc.gray(`  Branche: ${git.currentBranch}`));
      if (git.remote) console.log(pc.gray(`  Remote: configuré`));
    } else {
      console.log(pc.yellow('  Dépôt: Non initialisé'));
    }

    
    const apiKey = getApiKey();
    if (apiKey && framework.framework) {
      console.log(pc.cyan('\n🤖 Analyse IA (Gemini)...'));
      try {
        const client = initGeminiClient(apiKey);
        const prompt = `Analyse ce projet ${framework.framework} et donne:
1. Un score d'architecture (0-100)
2. 3 suggestions d'amélioration
3. 3 améliorations potentielles

Format JSON: {"score": number, "suggestions": ["..."], "improvements": ["..."]}`;
        
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        try {
          const aiAnalysis = JSON.parse(response.replace(/```json/g, '').replace(/```/g, ''));
          results.architecture.score = aiAnalysis.score;
          results.architecture.suggestions = aiAnalysis.suggestions;
          
          console.log(pc.green(`  Score Architecture: ${aiAnalysis.score}/100`));
          console.log(pc.cyan('\n  Suggestions:'));
          aiAnalysis.suggestions.forEach((s, i) => {
            console.log(pc.gray(`    ${i + 1}. ${s}`));
          });
        } catch (parseError) {
          console.log(pc.yellow('  Impossible de parser la réponse IA'));
        }
      } catch (error) {
        console.log(pc.yellow('  Analyse IA indisponible'));
      }
    } else {
      
      let staticScore = 70;
      if (git.repository) staticScore += 10;
      if (framework.framework) staticScore += 10;
      if (depsInfo.total < 50) staticScore += 5;
      if (sizeInfo.sourceSize < 10 * 1024 * 1024) staticScore += 5;
      
      results.architecture.score = staticScore;
      console.log(pc.green(`\nScore Architecture: ${staticScore}/100 (analyse statique)`));
    }

    console.log(pc.cyan('\n' + '='.repeat(50)));
    console.log(pc.cyan('Analyse terminée'));
    console.log(pc.cyan('='.repeat(50) + '\n'));

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'analyse: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
    throw error;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

module.exports = analyzeCommand;
