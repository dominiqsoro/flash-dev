/**
 * Détecteur PHP - Analyse l'environnement PHP/Composer
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

    // Détection PHP
    try {
      result.php = execSync('php --version', { stdio: 'pipe' }).split('\n')[0].trim();
    } catch (error) {
      // PHP non installé
    }

    // Détection Composer
    try {
      result.composer = execSync('composer --version', { stdio: 'pipe' }).split('\n')[0].trim();
    } catch (error) {
      // Composer non installé
    }

    // Détection composer.json
    const composerJsonPath = path.join(this.root, 'composer.json');
    if (fs.existsSync(composerJsonPath)) {
      result.hasComposerJson = true;
      try {
        const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf8'));

        // Détection framework Laravel
        if (composerJson.require?.['laravel/framework'] || composerJson.require?.['illuminate/support']) {
          result.framework = 'laravel';
          result.version = composerJson.require?.['laravel/framework'] || composerJson.require?.['illuminate/support'];
        }
        // Détection Symfony
        else if (composerJson.require?.['symfony/symfony'] || composerJson.require?.['symfony/console']) {
          result.framework = 'symfony';
          result.version = composerJson.require?.['symfony/symfony'] || composerJson.require?.['symfony/console'];
        }
      } catch (error) {
        // composer.json invalide
      }
    }

    // Extensions PHP critiques
    if (result.php) {
      const criticalExtensions = ['pdo', 'pdo_mysql', 'pdo_pgsql', 'mbstring', 'json', 'curl'];
      for (const ext of criticalExtensions) {
        try {
          execSync(`php -m | grep ${ext}`, { stdio: 'pipe' });
          result.extensions.push(ext);
        } catch (error) {
          
        }
      }
    }

    return result;
  }
}

module.exports = PHPDetector;
