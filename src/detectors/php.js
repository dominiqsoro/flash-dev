const path = require('path');
const fs = require('fs');
const { runCapture } = require('../utils/exec');

class PHPDetector {
  constructor() {
    this.root = process.cwd();
  }

  async detect() {
    const result = {
      php: null,
      composer: null,
      hasComposerJson: false,
      extensions: [],
      framework: null,
      version: null
    };

    const phpVersion = runCapture('php --version');
    if (phpVersion) {
      result.php = phpVersion.split('\n')[0].trim();
    }

    const composerVersion = runCapture('composer --version');
    if (composerVersion) {
      result.composer = composerVersion.split('\n')[0].trim();
    }

    const composerJsonPath = path.join(this.root, 'composer.json');
    if (fs.existsSync(composerJsonPath)) {
      result.hasComposerJson = true;
      try {
        const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf8'));

        if (composerJson.require?.['laravel/framework'] || composerJson.require?.['illuminate/support']) {
          result.framework = 'laravel';
          result.version = composerJson.require?.['laravel/framework'] || composerJson.require?.['illuminate/support'];
        } else if (composerJson.require?.['symfony/symfony'] || composerJson.require?.['symfony/console']) {
          result.framework = 'symfony';
          result.version = composerJson.require?.['symfony/symfony'] || composerJson.require?.['symfony/console'];
        }
      } catch {
        // invalid composer.json
      }
    }

    if (result.php) {
      const modules = runCapture('php -m');
      if (modules) {
        const installed = new Set(modules.toLowerCase().split(/\r?\n/));
        for (const ext of ['pdo', 'pdo_mysql', 'pdo_pgsql', 'mbstring', 'json', 'curl']) {
          if (installed.has(ext)) {
            result.extensions.push(ext);
          }
        }
      }
    }

    return result;
  }
}

module.exports = PHPDetector;
