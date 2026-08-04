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
    throw new Error(`Erreur lors de la génération du message de commit: ${error.message}`);
  }
}

/**
 * Génère un message de commit basique sans IA (fallback)
 * Analyse le diff pour déterminer le type et créer un message simple
 * @param {string} diff - Le diff des modifications
 * @returns {string} Le message de commit généré
 */
function generateBasicCommitMessage(diff) {
  const lines = diff.split('\n');
  const addedFiles = new Set();
  const modifiedFiles = new Set();
  const deletedFiles = new Set();
  
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
    }
  });
  
  // Déterminer le type de commit basé sur les fichiers modifiés
  let type = 'chore';
  let scope = 'general';
  
  const allFiles = [...addedFiles, ...modifiedFiles, ...deletedFiles];
  
  if (allFiles.length === 0) {
    return 'chore: initial commit';
  }
  
  // Analyser les extensions de fichiers pour déterminer le type
  const fileExtensions = allFiles.map(f => {
    const parts = f.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  });
  
  if (fileExtensions.some(ext => ['md', 'txt', 'rst'].includes(ext))) {
    type = 'docs';
  } else if (fileExtensions.some(ext => ['js', 'ts', 'py', 'java', 'go', 'rs', 'cpp', 'c'].includes(ext))) {
    // Vérifier si c'est un test
    if (allFiles.some(f => f.includes('test') || f.includes('spec'))) {
      type = 'test';
    } else {
      type = 'feat';
    }
  } else if (fileExtensions.some(ext => ['css', 'scss', 'sass', 'less'].includes(ext))) {
    type = 'style';
  } else if (deletedFiles.size > 0) {
    type = 'fix';
  }
  
  // Déterminer le scope basé sur les chemins de fichiers
  if (allFiles.some(f => f.includes('src/'))) {
    scope = 'core';
  } else if (allFiles.some(f => f.includes('test/'))) {
    scope = 'test';
  } else if (allFiles.some(f => f.includes('docs/'))) {
    scope = 'docs';
  } else if (allFiles.some(f => f.includes('config'))) {
    scope = 'config';
  }
  
  // Créer une description basée sur les actions
  let description = '';
  if (addedFiles.size > 0 && deletedFiles.size === 0) {
    description = `add ${addedFiles.size} file${addedFiles.size > 1 ? 's' : ''}`;
  } else if (deletedFiles.size > 0 && addedFiles.size === 0) {
    description = `remove ${deletedFiles.size} file${deletedFiles.size > 1 ? 's' : ''}`;
  } else if (addedFiles.size > 0 || deletedFiles.size > 0) {
    description = `update ${allFiles.length} file${allFiles.length > 1 ? 's' : ''}`;
  } else {
    description = 'update files';
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