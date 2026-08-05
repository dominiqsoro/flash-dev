const { execSync } = require('child_process');
const pc = require('picocolors');


const SECURITY_PATTERNS = [
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----/i,
    severity: 'critical'
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/i,
    severity: 'critical'
  },
  {
    name: 'AWS Secret Key',
    pattern: /[0-9a-zA-Z/+]{40}/i,
    context: /aws[_-]?secret/i,
    severity: 'critical'
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_[a-zA-Z0-9]{32,}/i,
    severity: 'critical'
  },
  {
    name: 'Google API Key',
    pattern: /AIza[A-Za-z0-9_-]{35}/i,
    severity: 'high'
  },
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/i,
    severity: 'critical'
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i,
    severity: 'high'
  },
  {
    name: 'Database Password',
    pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
    severity: 'high'
  },
  {
    name: 'API Key Generic',
    pattern: /api[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/i,
    severity: 'high'
  },
  {
    name: 'Secret Key Generic',
    pattern: /secret[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/i,
    severity: 'high'
  },
  {
    name: 'Private Key Generic',
    pattern: /private[_-]?key\s*[:=]\s*['"][\w-]{20,}['"]/i,
    severity: 'critical'
  }
];


function isPatternRelevant(pattern, line, context) {
  if (pattern.context) {
    return pattern.context.test(context);
  }
  return true;
}


async function secureCommand() {
  try {
    console.log(pc.cyan('flash-dev secure - Audit anti-fuite de secrets\n'));
    
    
    let diff;
    try {
      diff = execSync('git diff --cached', { encoding: 'utf-8' });
    } catch (error) {
      console.log(pc.yellow('Aucun fichier indexé. Utilisation: git add .'));
      console.log(pc.cyan('Ou lancez flash-dev push pour le workflow complet.\n'));
      process.exit(0);
    }
    
    if (!diff.trim()) {
      console.log(pc.green('Aucun changement à auditer. Vous pouvez commiter en toute sécurité.\n'));
      process.exit(0);
    }
    
    console.log(pc.yellow('Analyse des modifications...\n'));
    
    const lines = diff.split('\n');
    const issues = [];
    
    lines.forEach((line, index) => {
      SECURITY_PATTERNS.forEach(pattern => {
        if (pattern.pattern.test(line) && isPatternRelevant(pattern, line, diff)) {
          issues.push({
            line: index + 1,
            pattern: pattern.name,
            severity: pattern.severity,
            content: line.trim().substring(0, 100) + (line.length > 100 ? '...' : '')
          });
        }
      });
    });
    
    if (issues.length === 0) {
      console.log(pc.green('Aucun secret détecté. Audit réussi!'));
      console.log(pc.cyan('Vous pouvez procéder au commit en toute sécurité.\n'));
      process.exit(0);
    }
    
    
    console.log(pc.red(`ALERT: ${issues.length} secret(s) potentiel(s) détecté(s)!\n`));
    
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    
    if (critical.length > 0) {
      console.log(pc.red('CRITICAL:'));
      critical.forEach(issue => {
        console.log(pc.red(`  Ligne ${issue.line}: ${issue.pattern}`));
        console.log(pc.gray(`  ${issue.content}\n`));
      });
    }
    
    if (high.length > 0) {
      console.log(pc.yellow('HIGH:'));
      high.forEach(issue => {
        console.log(pc.yellow(`  Ligne ${issue.line}: ${issue.pattern}`));
        console.log(pc.gray(`  ${issue.content}\n`));
      });
    }
    
    console.log(pc.red('\nBLOCAGE: Commit annulé pour protéger vos secrets.'));
    console.log(pc.cyan('Actions recommandées:'));
    console.log(pc.cyan('1. Vérifiez les lignes signalées ci-dessus'));
    console.log(pc.cyan('2. Retirez les valeurs sensibles ou utilisez des variables d\'environnement'));
    console.log(pc.cyan('3. Réindexez les fichiers avec: git add .\n'));
    
    process.exit(1);
    
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = secureCommand;
