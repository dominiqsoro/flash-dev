/**
 * Détecteur Node.js - Analyse l'environnement Node/npm/pnpm/yarn/bun
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class NodeDetector {
  constructor() {
    this.root = process.cwd();
  }

  async detect() {
    const result = {
      node: null,
      npm: null,
      pnpm: null,
      yarn: null,
      bun: null,
      packageManager: null,
      hasPackageJson: false,
      dependencies: 0,
      devDependencies: 0
    };

    // Détection Node.js
    try {
      result.node = execSync('node --version', { stdio: 'pipe' }).trim();
    } catch (error) {
      // Node non installé
    }

    // Détection package managers
    try {
      result.npm = execSync('npm --version', { stdio: 'pipe' }).trim();
    } catch (error) {}
    try {
      result.pnpm = execSync('pnpm --version', { stdio: 'pipe' }).trim();
    } catch (error) {}
    try {
      result.yarn = execSync('yarn --version', { stdio: 'pipe' }).trim();
    } catch (error) {}
    try {
      result.bun = execSync('bun --version', { stdio: 'pipe' }).trim();
    } catch (error) {}

    // Détection package.json
    const packageJsonPath = path.join(this.root, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      result.hasPackageJson = true;
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        result.dependencies = Object.keys(packageJson.dependencies || {}).length;
        result.devDependencies = Object.keys(packageJson.devDependencies || {}).length;

        // Détection du package manager utilisé
        if (fs.existsSync(path.join(this.root, 'pnpm-lock.yaml'))) {
          result.packageManager = 'pnpm';
        } else if (fs.existsSync(path.join(this.root, 'yarn.lock'))) {
          result.packageManager = 'yarn';
        } else if (fs.existsSync(path.join(this.root, 'bun.lockb'))) {
          result.packageManager = 'bun';
        } else if (fs.existsSync(path.join(this.root, 'package-lock.json'))) {
          result.packageManager = 'npm';
        }
      } catch (error) {
        
      }
    }

    return result;
  }
}

module.exports = NodeDetector;
