const { GoogleGenerativeAI } = require('@google/generative-ai');
const pc = require('picocolors');

const MAX_DIFF_LENGTH = 4000;

/**
 * Initialise le client Gemini avec la clé API fournie
 * @param {string} apiKey - La clé API Gemini
 * @returns {GoogleGenerativeAI} Le client Gemini initialisé
 */
function initGeminiClient(apiKey) {
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Tronque le diff si nécessaire pour respecter les limites de tokens
 * @param {string} diff - Le diff à tronquer
 * @returns {string} Le diff tronqué si nécessaire
 */
function truncateDiff(diff) {
  if (diff.length <= MAX_DIFF_LENGTH) {
    return diff;
  }
  
  console.log(pc.yellow(`⚠️  Diff trop volumineux (${diff.length} caractères). Tronqué à ${MAX_DIFF_LENGTH} caractères.`));
  return diff.substring(0, MAX_DIFF_LENGTH);
}

/**
 * Filtre les fichiers binaires et volumineux du diff
 * @param {string} diff - Le diff brut
 * @returns {string} Le diff filtré
 */
function filterDiff(diff) {
  const lines = diff.split('\n');
  const filteredLines = lines.filter(line => {
    // Ignorer les fichiers binaires
    if (line.startsWith('Binary file')) {
      return false;
    }
    // Ignorer les fichiers de configuration volumineux
    if (line.includes('package-lock.json') || 
        line.includes('yarn.lock') || 
        line.includes('.min.js') ||
        line.includes('.min.css')) {
      return false;
    }
    return true;
  });
  
  return filteredLines.join('\n');
}

/**
 * Génère un message de commit conforme à Conventional Commits via Gemini
 * @param {GoogleGenerativeAI} client - Le client Gemini
 * @param {string} diff - Le diff des modifications
 * @returns {Promise<string>} Le message de commit généré
 */
async function generateCommitMessage(client, diff) {
  try {
    const systemPrompt = `Tu es un expert en Conventional Commits. Génère un message de commit court et précis basé sur le diff fourni.

Format requis: <type>(<scope>): <description>

Types autorisés:
- feat: nouvelle fonctionnalité
- fix: correction de bug
- docs: documentation
- style: formatage, point-virgule manquants, etc.
- refactor: refactoring du code
- test: ajout de tests
- chore: mise à jour des tâches de build, etc.

Règles:
- Message en anglais uniquement
- Maximum 50 caractères pour la description
- Pas de point final
- Sois concis et précis
- Si le diff est vide ou ne contient que des espaces, retourne "chore: initial commit"`;

    const model = client.getGenerativeModel(
      { 
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt
      }
    );

    const filteredDiff = filterDiff(diff);
    const truncatedDiff = truncateDiff(filteredDiff);
    
    if (!truncatedDiff.trim()) {
      return 'chore: initial commit';
    }

    const prompt = `Diff Git:\n\`\`\`\n${truncatedDiff}\n\`\`\`\n\nGénère un message de commit Conventional Commits:`;

    const result = await model.generateContent(prompt);
    const commitMessage = result.response.text().trim();
    
    // Nettoyer le message (enlever les guillemets, etc.)
    const cleanedMessage = commitMessage
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ' ')
      .trim();

    return cleanedMessage;
  } catch (error) {
    // Laisser l'erreur remonter pour être gérée par l'appelant
    throw error;
  }
}

/**
 * Génère un message de commit basique sans IA (fallback)
 * Analyse le diff pour déterminer le type et créer un message intelligent
 * @param {string} diff - Le diff des modifications
 * @returns {string} Le message de commit généré
 */
function generateBasicCommitMessage(diff) {
  const lines = diff.split('\n');
  const addedFiles = new Set();
  const modifiedFiles = new Set();
  const deletedFiles = new Set();
  const addedLines = [];
  const removedLines = [];
  
  // Analyser le diff pour extraire les informations
  lines.forEach(line => {
    if (line.startsWith('+++ b/')) {
      const file = line.replace('+++ b/', '').trim();
      if (file !== '/dev/null') {
        addedFiles.add(file);
      }
    } else if (line.startsWith('--- a/')) {
      const file = line.replace('--- a/', '').trim();
      if (file !== '/dev/null') {
        deletedFiles.add(file);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(line.substring(1).trim());
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removedLines.push(line.substring(1).trim());
    }
  });
  
  const allFiles = [...addedFiles, ...modifiedFiles, ...deletedFiles];
  
  if (allFiles.length === 0) {
    return 'chore: initial commit';
  }
  
  // Déterminer le scope basé sur les chemins de fichiers
  let scope = 'general';
  const paths = allFiles.map(f => {
    const parts = f.split('/');
    return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : 'root';
  });
  
  // Détection intelligente du scope
  if (paths.some(p => ['auth', 'login', 'token', 'user', 'session'].includes(p))) {
    scope = 'auth';
  } else if (paths.some(p => ['api', 'routes', 'controllers', 'handlers'].includes(p))) {
    scope = 'api';
  } else if (paths.some(p => ['db', 'database', 'models', 'schema', 'migration'].includes(p))) {
    scope = 'db';
  } else if (paths.some(p => ['ui', 'components', 'views', 'pages', 'layout'].includes(p))) {
    scope = 'ui';
  } else if (paths.some(p => ['utils', 'helpers', 'lib', 'common'].includes(p))) {
    scope = 'utils';
  } else if (paths.some(p => ['config', 'settings', 'env'].includes(p))) {
    scope = 'config';
  } else if (paths.some(p => ['test', 'spec'].includes(p))) {
    scope = 'test';
  } else if (paths.some(p => ['core', 'src'].includes(p))) {
    scope = 'core';
  }
  
  // Déterminer le type basé sur les modifications
  let type = 'chore';
  
  // Analyser les lignes ajoutées/supprimées pour détecter le type
  const allAddedText = addedLines.join(' ').toLowerCase();
  const allRemovedText = removedLines.join(' ').toLowerCase();
  
  // Mots-clés pour chaque type
  const typeKeywords = {
    feat: ['add', 'new', 'create', 'implement', 'feature', 'support', 'enable'],
    fix: ['fix', 'bug', 'error', 'issue', 'resolve', 'correct', 'patch'],
    refactor: ['refactor', 'optimize', 'improve', 'simplify', 'clean', 'restructure'],
    docs: ['doc', 'readme', 'comment', 'documentation'],
    test: ['test', 'spec', 'assert', 'mock'],
    style: ['style', 'format', 'indent', 'lint'],
    chore: ['update', 'upgrade', 'config', 'dependency', 'version']
  };
  
  // Chercher les mots-clés dans les lignes ajoutées
  for (const [t, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(kw => allAddedText.includes(kw))) {
      type = t;
      break;
    }
  }
  
  // Fallback basé sur les extensions
  if (type === 'chore') {
    const fileExtensions = allFiles.map(f => {
      const parts = f.split('.');
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    });
    
    if (fileExtensions.some(ext => ['md', 'txt', 'rst'].includes(ext))) {
      type = 'docs';
    } else if (fileExtensions.some(ext => ['js', 'ts', 'py', 'java', 'go', 'rs', 'cpp', 'c'].includes(ext))) {
      if (allFiles.some(f => f.includes('test') || f.includes('spec'))) {
        type = 'test';
      } else {
        type = 'feat';
      }
    } else if (fileExtensions.some(ext => ['css', 'scss', 'sass', 'less'].includes(ext))) {
      type = 'style';
    }
  }
  
  // Générer une description intelligente
  let description = '';
  
  // Analyser les patterns dans les lignes ajoutées
  if (allAddedText.includes('refresh') || allAddedText.includes('token')) {
    description = 'add refresh token validation';
  } else if (allAddedText.includes('jwt') || allAddedText.includes('expiration')) {
    description = 'improve JWT expiration handling';
  } else if (allAddedText.includes('login') || allAddedText.includes('auth')) {
    description = 'improve login handling';
  } else if (allAddedText.includes('api') || allAddedText.includes('endpoint')) {
    description = 'update API endpoints';
  } else if (allAddedText.includes('error') || allAddedText.includes('exception')) {
    description = 'improve error handling';
  } else if (addedFiles.size > 0 && deletedFiles.size === 0) {
    description = `add ${addedFiles.size} file${addedFiles.size > 1 ? 's' : ''}`;
  } else if (deletedFiles.size > 0 && addedFiles.size === 0) {
    description = `remove ${deletedFiles.size} file${deletedFiles.size > 1 ? 's' : ''}`;
  } else {
    description = `update ${allFiles.length} file${allFiles.length > 1 ? 's' : ''}`;
  }
  
  // Construire le message final
  const message = `${type}(${scope}): ${description}`;
  
  console.log(pc.yellow('📝 Message de commit généré (mode sans IA):'));
  
  return message;
}

/**
 * Affiche le message de commit généré pour validation
 * @param {string} message - Le message de commit
 */
function displayCommitMessage(message) {
  console.log(pc.cyan('\n📝 Message de commit généré:'));
  console.log(pc.green(`  ${message}`));
}

module.exports = {
  initGeminiClient,
  truncateDiff,
  filterDiff,
  generateCommitMessage,
  generateBasicCommitMessage,
  displayCommitMessage
};