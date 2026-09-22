const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Runtime configuration for a single CLI invocation.
 *
 * Persistent values live in ~/.flash-dev/config.json and are shared with
 * utils/config.js, so this class merges rather than overwrites on save and
 * keeps the 0600 permission that protects the stored API key.
 */
class Config {
  constructor() {
    this.configDir = path.join(os.homedir(), '.flash-dev');
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
        this.config = { ...this.defaults, ...JSON.parse(content) };
      }
    } catch {
      // Corrupt config: fall back to defaults rather than crashing the CLI
    }
  }

  _save() {
    try {
      fs.mkdirSync(this.configDir, { recursive: true });

      // Re-read first: another process (or utils/config) may have written
      // keys we do not know about, and we must not drop them.
      let onDisk = {};
      try {
        if (fs.existsSync(this.configFile)) {
          onDisk = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        }
      } catch {
        onDisk = {};
      }

      // Session-only flags never get persisted.
      const { verbose, json, quiet, dryRun, ...persistable } = this.config;
      const merged = { ...onDisk, ...persistable };

      fs.writeFileSync(this.configFile, JSON.stringify(merged, null, 2), { mode: 0o600 });

      try {
        fs.chmodSync(this.configFile, 0o600);
      } catch {
        // chmod is a no-op on Windows
      }
    } catch {
      // Persistence failures must never break a command
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this._save();
  }

  /**
   * Apply per-invocation CLI flags. These are NOT written to disk.
   * @param {{verbose?: boolean, json?: boolean, quiet?: boolean, dryRun?: boolean}} flags
   */
  applyFlags(flags = {}) {
    if (flags.verbose !== undefined) this.config.verbose = Boolean(flags.verbose);
    if (flags.json !== undefined) this.config.json = Boolean(flags.json);
    if (flags.quiet !== undefined) this.config.quiet = Boolean(flags.quiet);
    if (flags.dryRun !== undefined) this.config.dryRun = Boolean(flags.dryRun);

    // JSON output must stay machine-readable: no decorative logging alongside.
    if (this.config.json) this.config.quiet = true;
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

  isDryRun() {
    return this.config.dryRun;
  }
}

const configInstance = new Config();

module.exports = configInstance;
module.exports.Config = Config;
