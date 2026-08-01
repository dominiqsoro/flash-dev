const pc = require('picocolors');
const fs = require('fs');
const path = require('path');
const { displayEthicalMonetization } = require('../utils/monetization');

/**
 * Liste des patterns de sécurité à vérifier
 */
const SECURITY_PATTERNS = [
  {
    name: 'API Keys Exposed',
    severity: 'critical',
    patterns: [
      /api[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/gi,
      /secret[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/gi,
      /private[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/gi,
      /password\s*[:=]\s*['"][\w-]{8,}['"]/gi,
      /sk_[a-zA-Z0-9]{32,}/gi, // Stripe keys
      /AIza[A-Za-z0-9_-]{35}/gi // Google API keys
    ],
    extensions: ['.js', '.ts', '.json', '.env', '.yml', '.yaml'],
    fix: 'Utilisez des variables d\'environnement ou un gestionnaire de secrets'
  },
  {
    name: 'Hardcoded URLs',
    severity: 'medium',
    patterns: [
      /https?:\/\/[^\s'"]+/gi
    ],
    extensions: ['.js', '.ts'],
    excludeFiles: ['package-lock.json', 'yarn.lock'],
    excludePatterns: [
      /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/gi,
      /https?:\/\/github\.com/gi,
      /https?:\/\/npmjs\.com/gi,
      /https?:\/\/makersuite\.google\.com/gi,
      /https?:\/\/ko-fi\.com/gi,
      /https?:\/\/github\.sponsors/gi
    ],
    fix: 'Utilisez des variables d\'environnement pour les URLs'
  },
  {
    name: 'Debug Statements',
    severity: 'low',
    patterns: [
      /console\.log\(/gi,
      /console\.debug\(/gi,
      /debugger/gi
    ],
    extensions: ['.js', '.ts'],
    excludeFiles: ['bin/', 'cli', 'index.js', 'src/'], // Ignorer les fichiers CLI et src/
    // Disabled for CLI tools - console.log is normal for CLI applications
    enabled: false,
    fix: 'Supprimez les instructions de debug avant la production'
  },
  {
    name: 'SQL Injection Patterns',
    severity: 'critical',
    patterns: [
      /['"]\s*\+\s*['"]/gi
    ],
    extensions: ['.js', '.ts', '.py', '.php'],
    fix: 'Utilisez des requêtes paramétrées ou des ORM'
  },
  {
    name: 'Eval Usage',
    severity: 'critical',
    patterns: [
      /eval\s*\(/gi,
      /exec\s*\(/gi
    ],
    extensions: ['.js', '.ts', '.py'],
    fix: 'Évitez l\'utilisation de eval/exec - utilisez des alternatives plus sûres'
  },
  {
    name: 'Insecure Dependencies',
    severity: 'high',
    patterns: [],
    extensions: ['package.json'],
    customCheck: 'checkDependencies'
  }
];

/**
 * Vérifie les dépendances dans package.json
 */
function checkDependencies(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Vérifier les dépendances connues vulnérables
    const vulnerableDeps = [
      'lodash<4.17.21',
      'axios<0.21.1',
      'express<4.17.0'
    ];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    Object.entries(allDeps).forEach(([dep, version]) => {
      vulnerableDeps.forEach(vulnDep => {
        const [vulnName, vulnVersion] = vulnDep.split('<');
        if (dep === vulnName && version.startsWith(vulnVersion)) {
          issues.push({
            file: filePath,
            line: 0,
            message: `Dépendance vulnérable: ${dep}@${version}`,
            severity: 'high',
            fix: `Mettez à jour ${dep} vers la version ${vulnVersion} ou supérieure`
          });
        }
      });
    });
  } catch (error) {
    // Ignorer les erreurs de parsing
  }
  
  return issues;
}

/**
 * Parcourt récursivement un répertoire
 */
function* walkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Ignorer node_modules et .git
      if (file.name !== 'node_modules' && file.name !== '.git' && file.name !== '.herozion') {
        yield* walkDir(fullPath);
      }
    } else {
      yield fullPath;
    }
  }
}

/**
 * Analyse un fichier pour les patterns de sécurité
 */
function analyzeFile(filePath, patterns) {
  const issues = [];
  const ext = path.extname(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    patterns.forEach(pattern => {
      // Vérifier si le pattern est activé
      if (pattern.enabled === false) return;
      
      // Vérifier si le fichier doit être exclu
      if (pattern.excludeFiles) {
        const shouldExclude = pattern.excludeFiles.some(exclude => 
          filePath.includes(exclude)
        );
        if (shouldExclude) return;
      }
      
      if (pattern.extensions.includes(ext) || pattern.extensions.includes('*')) {
        if (pattern.customCheck === 'checkDependencies') {
          const customIssues = checkDependencies(filePath);
          issues.push(...customIssues);
        } else {
          pattern.patterns.forEach(regex => {
            lines.forEach((line, index) => {
              if (regex.test(line)) {
                // Vérifier les patterns d'exclusion
                if (pattern.excludePatterns) {
                  const shouldExclude = pattern.excludePatterns.some(excludeRegex => 
                    excludeRegex.test(line)
                  );
                  if (shouldExclude) return;
                }
                
                issues.push({
                  file: filePath,
                  line: index + 1,
                  message: `Pattern détecté: ${regex.source}`,
                  severity: pattern.severity,
                  fix: pattern.fix
                });
              }
            });
          });
        }
      }
    });
  } catch (error) {
    // Ignorer les fichiers binaires ou non lisibles
  }
  
  return issues;
}

/**
 * Commande principale: herozion scan
 * Analyse la sécurité du projet
 */
async function scanCommand() {
  try {
    console.log(pc.cyan('🔍 herozion scan - Analyse de sécurité\n'));
    
    const currentDir = process.cwd();
    console.log(pc.yellow(`📂 Analyse du répertoire: ${currentDir}\n`));
    
    // Vérifier si c'est un projet valide
    const hasPackageJson = fs.existsSync(path.join(currentDir, 'package.json'));
    if (!hasPackageJson) {
      console.log(pc.yellow('⚠️  Aucun fichier package.json détecté. Analyse des fichiers JS/TS...'));
    }
    
    const allIssues = [];
    let fileCount = 0;
    
    console.log(pc.yellow('🔎 Recherche des fichiers...'));
    
    // Parcourir tous les fichiers
    for (const filePath of walkDir(currentDir)) {
      fileCount++;
      const issues = analyzeFile(filePath, SECURITY_PATTERNS);
      allIssues.push(...issues);
    }
    
    console.log(pc.green(`✅ ${fileCount} fichiers analysés\n`));
    
    // Afficher les résultats
    if (allIssues.length === 0) {
      console.log(pc.green('🎉 Aucune vulnérabilité détectée!'));
      console.log(pc.cyan('💡 Votre projet semble sécurisé.\n'));
    } else {
      // Grouper par sévérité
      const critical = allIssues.filter(i => i.severity === 'critical');
      const high = allIssues.filter(i => i.severity === 'high');
      const medium = allIssues.filter(i => i.severity === 'medium');
      const low = allIssues.filter(i => i.severity === 'low');
      
      console.log(pc.red(`🚨 ${critical.length} vulnérabilités critiques trouvées`));
      console.log(pc.yellow(`⚠️  ${high.length} vulnérabilités élevées trouvées`));
      console.log(pc.yellow(`⚠️  ${medium.length} vulnérabilités moyennes trouvées`));
      console.log(pc.cyan(`ℹ️  ${low.length} vulnérabilités faibles trouvées\n`));
      
      // Afficher les détails
      const displayIssues = (issues, color) => {
        issues.forEach(issue => {
          console.log(color(`📍 ${issue.file}:${issue.line}`));
          console.log(color(`   ${issue.message}`));
          console.log(pc.cyan(`   💡 ${issue.fix}\n`));
        });
      };
      
      if (critical.length > 0) {
        console.log(pc.red('🔴 Vulnérabilités CRITIQUES:'));
        displayIssues(critical, pc.red);
      }
      
      if (high.length > 0) {
        console.log(pc.yellow('🟠 Vulnérabilités ÉLEVÉES:'));
        displayIssues(high, pc.yellow);
      }
      
      if (medium.length > 0) {
        console.log(pc.yellow('🟡 Vulnérabilités MOYENNES:'));
        displayIssues(medium, pc.yellow);
      }
      
      if (low.length > 0) {
        console.log(pc.cyan('🔵 Vulnérabilités FAIBLES:'));
        displayIssues(low, pc.cyan);
      }
      
      console.log(pc.cyan('💡 Exécutez "herozion scan" après corrections pour vérifier.\n'));
    }
    
    // Message éthique de monétisation
    displayEthicalMonetization();
    
  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'analyse: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = scanCommand;
