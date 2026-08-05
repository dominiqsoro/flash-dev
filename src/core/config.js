

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
      verbose: false,
      json: false,
      quiet: false
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
      
    }
  }

  _save() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      
  }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this._save();
  }

  isVerbose() {
    return this.config.verbose;
  }

  isJson() {
    return this.config.json;
  }

  isQuiet() {
    return this.config.quiet;
  }
}


const configInstance = new Config();

module.exports = configInstance;
