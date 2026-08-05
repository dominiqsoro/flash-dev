const fs = require('fs');
const path = require('path');
const os = require('os');
const pc = require('picocolors');

const CONFIG_DIR = path.join(os.homedir(), '.flash-dev');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const CONFIG_KEY = 'geminiApiKey';


function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}


function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    
  }
  return {};
}


function writeConfig(configData) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch (error) {
    
  }
}


function getApiKey() {
  const configData = readConfig();
  return configData[CONFIG_KEY] || null;
}


function saveApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Clé API invalide');
  }
  const configData = readConfig();
  configData[CONFIG_KEY] = apiKey.trim();
  writeConfig(configData);
}

/**
 * Affiche un message d'aide pour obtenir une clé API Gemini
 */
function displayApiKeyHelp() {
  console.log(pc.yellow('\n⚠️  Clé API Gemini non détectée'));
  console.log(pc.cyan('Pour utiliser flash-dev avec l\'IA, vous avez besoin d\'une clé API Google Gemini 2.5 Flash.'));
  console.log(pc.cyan('1. Visitez: https://makersuite.google.com/app/apikey'));
  console.log(pc.cyan('2. Créez une clé API gratuite'));
  console.log(pc.cyan('3. Collez votre clé ci-dessous\n'));
}

/**
 * Demande à l'utilisateur d'entrer sa clé API de manière interactive
 * @param {Function} promptFn - Fonction de prompt (ex: inquirer ou prompts)
 * @returns {Promise<string>} La clé API entrée par l'utilisateur
 */
async function promptForApiKey(promptFn) {
  displayApiKeyHelp();
  
  const { apiKey } = await promptFn({
    type: 'password',
    name: 'apiKey',
    message: 'Entrez votre clé API Gemini:',
    validate: (input) => {
      if (!input || !input.trim()) {
        return 'Veuillez entrer une clé API valide';
      }
      return true;
    }
  });

  return apiKey.trim();
}

module.exports = {
  getApiKey,
  saveApiKey,
  displayApiKeyHelp,
  promptForApiKey
};
