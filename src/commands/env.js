const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

/**
 * Patterns pour détecter les variables sensibles
 */
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

/**
 * Détermine si une valeur semble sensible
 */
function isSensitiveValue(value) {
  if (!value || value.trim() === '') return false;
  
  // Valeurs courantes non sensibles
  const safeValues = ['localhost', '127.0.0.1', '0.0.0.0', 'development', 'production', 'test', 'staging', '3000', '8080', '5000'];
  if (safeValues.includes(value.trim())) return false;
  
  // Valeurs avec caractères complexes (probablement des clés/tokens)
  if (value.length > 20 && /[a-zA-Z0-9_-]{20,}/.test(value)) return true;
  
  return false;
}

/**
 * Détermine si une variable est sensible
 */
function isSensitiveVariable(key, value) {
  // Vérifier le nom de la variable
  if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
    return true;
  }
  
  // Vérifier la valeur
  if (isSensitiveValue(value)) {
    return true;
  }
  
  return false;
}

/**
 * Commande: flash-dev env
 * Génère un fichier .env.example sécurisé
 */
async function envCommand() {
  try {
    console.log(pc.cyan('flash-dev env - Générateur de .env.example\n'));
    
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    // Vérifier si .env existe
    if (!fs.existsSync(envPath)) {
      console.log(pc.red('Erreur: Fichier .env non trouvé dans le répertoire actuel.'));
      console.log(pc.cyan('Assurez-vous d\'être à la racine de votre projet.\n'));
      process.exit(1);
    }
    
    console.log(pc.yellow('Analyse du fichier .env...'));
    
    // Lire le fichier .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    const exampleLines = [];
    let sensitiveCount = 0;
    let totalLines = 0;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Ignorer les lignes vides et les commentaires
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        if (trimmedLine.startsWith('#')) {
          exampleLines.push(line);
        }
        return;
      }
      
      totalLines++;
      
      // Séparer clé et valeur
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return;
      
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      
      if (isSensitiveVariable(key, value)) {
        // Variable sensible - remplacer la valeur par un placeholder
        exampleLines.push(`${key}=`);
        sensitiveCount++;
      } else {
        // Variable non sensible - conserver la valeur
        exampleLines.push(line);
      }
    });
    
    console.log(pc.green(`Analyse terminée: ${totalLines} variables, ${sensitiveCount} sensibles détectées\n`));
    
    // Écrire le fichier .env.example
    fs.writeFileSync(envExamplePath, exampleLines.join('\n'));
    
    console.log(pc.green('Fichier .env.example généré avec succès!'));
    console.log(pc.cyan(`Fichier créé: ${envExamplePath}\n`));
    console.log(pc.yellow('Note: Les valeurs sensibles ont été remplacées par des placeholders vides.'));
    console.log(pc.yellow('Pensez à ajouter des exemples de valeurs valides pour aider vos collaborateurs.\n'));
    
  } catch (error) {
    console.log(pc.red(`\nErreur: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = envCommand;
