const path = require('path');
const fs = require('fs');
const { runCapture } = require('../utils/exec');

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

    result.node = runCapture('node --version', { timeout: 2000 });
    result.npm = runCapture('npm --version', { timeout: 3000 });

    const packageJsonPath = path.join(this.root, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      result.hasPackageJson = true;
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        result.dependencies = Object.keys(packageJson.dependencies || {}).length;
        result.devDependencies = Object.keys(packageJson.devDependencies || {}).length;
      } catch {
        // invalid package.json
      }

      if (fs.existsSync(path.join(this.root, 'pnpm-lock.yaml'))) {
        result.packageManager = 'pnpm';
        result.pnpm = runCapture('pnpm --version', { timeout: 2000 });
      } else if (fs.existsSync(path.join(this.root, 'yarn.lock'))) {
        result.packageManager = 'yarn';
        result.yarn = runCapture('yarn --version', { timeout: 2000 });
      } else if (fs.existsSync(path.join(this.root, 'bun.lockb'))) {
        result.packageManager = 'bun';
        result.bun = runCapture('bun --version', { timeout: 2000 });
      } else if (fs.existsSync(path.join(this.root, 'package-lock.json'))) {
        result.packageManager = 'npm';
      }
    }

    return result;
  }
}

module.exports = NodeDetector;
