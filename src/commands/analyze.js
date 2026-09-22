

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { runScan } = require('./scan');
const FrameworkDetector = require('../detectors/framework');
const NodeDetector = require('../detectors/node');
const GitDetector = require('../detectors/git');
const { initGeminiClient, GEMINI_MODEL } = require('../utils/ai');
const { getApiKey } = require('../utils/config');
const { formatBytes } = require('../utils/fs-helpers');
const fs = require('fs').promises;
const path = require('path');

/**
 * Derive a health score from measured signals rather than a fixed constant.
 * Each deduction is reported so the number is explainable.
 * @param {object} input
 * @returns {{score: number, findings: string[]}}
 */
function computeHealthScore({ git, framework, depsInfo, sizeInfo, security }) {
  let score = 100;
  const findings = [];

  const deduct = (points, reason) => {
    score -= points;
    findings.push(reason);
  };

  if (security.critical > 0) {
    deduct(Math.min(30, security.critical * 10), `${security.critical} problème(s) de sécurité critique(s) — lancez "flash-dev scan"`);
  }
  if (security.high > 0) {
    deduct(Math.min(15, security.high * 3), `${security.high} problème(s) de sécurité élevé(s)`);
  }
  if (!git.repository) {
    deduct(15, 'Projet non versionné — initialisez un dépôt Git');
  } else {
    if (!git.remote) deduct(5, 'Aucun remote Git configuré');
    if (git.hasConflicts) deduct(10, 'Conflits Git non résolus');
    if (git.hasUncommitted) deduct(3, 'Modifications non commitées');
  }
  if (!framework.framework) {
    findings.push('Aucun framework détecté (projet générique)');
  }
  if (depsInfo.total > 80) {
    deduct(5, `${depsInfo.total} dépendances déclarées — surface d'attaque importante`);
  }
  if (sizeInfo.sourceSize > 50 * 1024 * 1024) {
    deduct(5, 'Code source > 50 Mo — envisagez de sortir les binaires du dépôt');
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}

async function analyzeCommand() {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    if (!config.isJson()) {
      console.log(pc.cyan('\n📊 Flash-dev Analyze - Audit complet du projet\n'));
    }

    
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

    // Security audit: analyze advertises it, so it must actually run it.
    let security = { critical: 0, high: 0, medium: 0, low: 0, total: 0, topIssues: [] };
    try {
      const scanResult = runScan(process.cwd());
      security = {
        critical: scanResult.issues.filter((i) => i.severity === 'critical').length,
        high: scanResult.issues.filter((i) => i.severity === 'high').length,
        medium: scanResult.issues.filter((i) => i.severity === 'medium').length,
        low: scanResult.issues.filter((i) => i.severity === 'low').length,
        total: scanResult.issues.length,
        topIssues: scanResult.issues.slice(0, 3).map((i) => ({
          file: i.file,
          line: i.line,
          name: i.name,
          severity: i.severity
        }))
      };
    } catch (error) {
      logger.debug('Analyse de sécurité ignorée', { reason: error.message });
    }

    const results = {
      framework,
      node,
      git,
      size: sizeInfo,
      dependencies: depsInfo,
      security,
      architecture: {
        score: 0,
        suggestions: []
      }
    };

    // Compute the score before any early return, so --json carries it too
    const health = computeHealthScore({ git, framework, depsInfo, sizeInfo, security });
    results.architecture.score = health.score;
    results.architecture.suggestions = health.findings;

    if (config.isJson()) {
      console.log(JSON.stringify(results, null, 2));
      return results;
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

    console.log(pc.bold('\nSécurité'));
    if (security.total === 0) {
      console.log(pc.green('  Aucun problème détecté par l\'analyse statique'));
    } else {
      console.log(security.critical > 0
        ? pc.red(`  Critique: ${security.critical}`)
        : pc.gray('  Critique: 0'));
      console.log(pc.yellow(`  Élevé   : ${security.high}`));
      console.log(pc.gray(`  Moyen   : ${security.medium}   Faible: ${security.low}`));
      for (const issue of security.topIssues) {
        const location = issue.line > 0 ? `${issue.file}:${issue.line}` : issue.file;
        console.log(pc.gray(`    · ${issue.name} — ${location}`));
      }
      console.log(pc.cyan('  Détail complet: flash-dev scan'));
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
        
        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
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
          console.log(pc.yellow('  Réponse IA illisible — analyse locale.'));
        }
      } catch (error) {
        console.log(pc.yellow('  IA indisponible — analyse locale.'));
      }
    } else {
      const { score, findings } = health;
      const scoreColor = score >= 80 ? pc.green : score >= 60 ? pc.yellow : pc.red;
      console.log(scoreColor(`\nScore de santé: ${score}/100 (analyse statique)`));

      if (findings.length > 0) {
        console.log(pc.cyan('\nPoints à traiter:'));
        findings.forEach((finding, index) => {
          console.log(pc.gray(`  ${index + 1}. ${finding}`));
        });
      }
    }

    console.log(pc.cyan('\n' + '='.repeat(50)));
    console.log(pc.cyan('Analyse terminée'));
    console.log(pc.cyan('='.repeat(50) + '\n'));

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'analyse: ${error.message}\n`));
    logger.debug('Trace complète', { stack: error.stack });
    throw error;
  }
}

module.exports = analyzeCommand;
module.exports.computeHealthScore = computeHealthScore;
