const path = require('path');
const fs = require('fs');
const { runOk, runCapture } = require('../utils/exec');

/**
 * Lightweight Docker probe — avoids long-hanging daemon calls.
 */
class DockerDetector {
  constructor() {
    this.root = process.cwd();
  }

  async detect() {
    const result = {
      installed: false,
      desktopRunning: false,
      engineActive: false,
      composeAvailable: false,
      hasDockerfile: false,
      hasComposeFile: false,
      stoppedContainers: 0,
      unusedImages: 0,
      containers: []
    };

    result.hasDockerfile = fs.existsSync(path.join(this.root, 'Dockerfile'));
    result.hasComposeFile =
      fs.existsSync(path.join(this.root, 'docker-compose.yml')) ||
      fs.existsSync(path.join(this.root, 'docker-compose.yaml'));

    if (!runOk('docker --version', { timeout: 2000 })) {
      return result;
    }
    result.installed = true;

    // Short timeout: docker info often hangs when the engine is down
    result.engineActive = runOk('docker info', { timeout: 1500 });
    result.composeAvailable = runOk('docker compose version', { timeout: 1500 });

    if (process.platform === 'win32') {
      const list = runCapture('tasklist /FI "IMAGENAME eq Docker Desktop.exe" /NH', { timeout: 1500 });
      result.desktopRunning = !!(list && /docker desktop\.exe/i.test(list));
    } else if (process.platform === 'darwin') {
      result.desktopRunning = runOk('pgrep -f "Docker Desktop"', { timeout: 1500 });
    } else {
      result.desktopRunning = result.engineActive;
    }

    return result;
  }
}

module.exports = DockerDetector;
