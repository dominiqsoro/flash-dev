/**
 * Configuration centralisée pour Flash-dev
 * Gère les options globales et la persistance
 */

const path = require('path');
const fs = require('fs');

class Config {
  constructor() {
    this.configDir = path.join(require('os').homedir(), '.flash-dev');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaults = {
      apiKey: null,
      telemetry: false,
      defaultBranch: 'main',
      autoDetect: true,
      dryRun: false,
      verbose: false
    };
    this.config = { ...this.defaults };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.configFile)) {
        const content = fs.readFileSync(this.configFile, 'utf8');
        const loaded = JSON.parse(content);
        this.config = { ...this.defaults, ...loaded };
      }
    } catch (error) {
      // Utiliser les défauts si le fichier est corrompu
    }
  }

  _save() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      // Silencer les erreurs d'écriture
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this._save();
  }

  getAll() {
    return { ...this.config };
  }

  reset() {
    this.config = { ...this.defaults };
    this._save();
  }

  isDryRun() {
    return this.config.dryRun || process.argv.includes('--dry-run');
  }

  isVerbose() {
    return this.config.verbose || process.argv.includes('--verbose') || process.argv.includes('-v');
  }

  isJson() {
    return process.argv.includes('--json');
  }

  isQuiet() {
    return process.argv.includes('--quiet') || process.argv.includes('-q');
  }
}

// Singleton instance
const configInstance = new Config();

module.exports = configInstance;
