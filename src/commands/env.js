const fs = require('fs');
const path = require('path');
const pc = require('picocolors');


const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth/i,
  /jwt/i,
  /aws[_-]?key/i,
  /stripe[_-]?key/i,
  /firebase/i,
  /mongodb/i,
  /postgres/i,
  /mysql/i,
  /redis/i
];


function isSensitiveValue(value) {
  if (!value || value.trim() === '') return false;
  
  
  const safeValues = ['localhost', '127.0.0.1', '0.0.0.0', 'development', 'production', 'test', 'staging', '3000', '8080', '5000'];
  if (safeValues.includes(value.trim())) return false;
  
  
  if (value.length > 20 && /[a-zA-Z0-9_-]{20,}/.test(value)) return true;
  
  return false;
}


function isSensitiveVariable(key, value) {
  
  if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
    return true;
  }
  
  
  if (isSensitiveValue(value)) {
    return true;
  }
  
  return false;
}


async function envCommand() {
  try {
    console.log(pc.cyan('flash-dev env - Générateur de .env.example\n'));
    
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    
    if (!fs.existsSync(envPath)) {
      console.log(pc.red('Erreur: Fichier .env non trouvé dans le répertoire actuel.'));
      console.log(pc.cyan('Assurez-vous d\'être à la racine de votre projet.\n'));
      process.exit(1);
    }
    
    console.log(pc.yellow('Analyse du fichier .env...'));
    
    
    let envContent;
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (readError) {
      console.log(pc.red('Erreur: Impossible de lire le fichier .env.'));
      console.log(pc.yellow(`Détails: ${readError.message}\n`));
      process.exit(1);
    }
    
    if (!envContent || envContent.trim() === '') {
      console.log(pc.yellow('Attention: Le fichier .env est vide.\n'));
      process.exit(0);
    }
    
    const lines = envContent.split('\n');
    
    const exampleLines = [];
    let sensitiveCount = 0;
    let totalLines = 0;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        if (trimmedLine.startsWith('#')) {
          exampleLines.push(line);
        }
        return;
      }
      
      totalLines++;
      
      
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return;
      
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      
      if (isSensitiveVariable(key, value)) {
        
        exampleLines.push(`${key}=`);
        sensitiveCount++;
      } else {
        
        exampleLines.push(line);
      }
    });
    
    console.log(pc.green(`Analyse terminée: ${totalLines} variables, ${sensitiveCount} sensibles détectées\n`));
    
    
    try {
      fs.writeFileSync(envExamplePath, exampleLines.join('\n'));
    } catch (writeError) {
      console.log(pc.red('Erreur: Impossible d\'écrire le fichier .env.example.'));
      console.log(pc.yellow(`Détails: ${writeError.message}\n`));
      process.exit(1);
    }
    
    console.log(pc.green('Fichier .env.example généré avec succès!'));
    console.log(pc.cyan(`Fichier créé: ${envExamplePath}\n`));
    console.log(pc.yellow('Note: Les valeurs sensibles ont été remplacées par des placeholders vides.'));
    console.log(pc.yellow('Pensez à ajouter des exemples de valeurs valides pour aider vos collaborateurs.\n'));
    
  } catch (error) {
    console.log(pc.red(`\nErreur inattendue: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = envCommand;
