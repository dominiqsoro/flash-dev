/**
 * Détecteur Docker - Analyse l'environnement Docker
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

    // Détection Docker
    try {
      execSync('docker --version', { stdio: 'pipe' });
      result.installed = true;
    } catch (error) {
      return result;
    }

    // Docker Engine actif
    try {
      execSync('docker info', { stdio: 'pipe' });
      result.engineActive = true;
    } catch (error) {
      // Docker non lancé
    }

    // Docker Desktop (spécifique macOS/Windows)
    try {
      if (process.platform === 'darwin') {
        execSync('pgrep -f "Docker Desktop"', { stdio: 'pipe' });
        result.desktopRunning = true;
      } else if (process.platform === 'win32') {
        execSync('tasklist /FI "IMAGENAME eq Docker Desktop.exe"', { stdio: 'pipe' });
        result.desktopRunning = true;
      }
    } catch (error) {
      result.desktopRunning = false;
    }

    // Docker Compose
    try {
      execSync('docker compose version', { stdio: 'pipe' });
      result.composeAvailable = true;
    } catch (error) {
      try {
        execSync('docker-compose --version', { stdio: 'pipe' });
        result.composeAvailable = true;
      } catch (error) {}
    }

    // Fichiers Docker dans le projet
    result.hasDockerfile = fs.existsSync(path.join(this.root, 'Dockerfile'));
    result.hasComposeFile = fs.existsSync(path.join(this.root, 'docker-compose.yml')) ||
                            fs.existsSync(path.join(this.root, 'docker-compose.yaml'));

    // Containers arrêtés et images inutilisées
    if (result.engineActive) {
      try {
        const stopped = execSync('docker ps -a --filter "status=exited" --format "{{.Names}}"', {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        result.stoppedContainers = stopped.trim().split('\n').filter(Boolean).length;
      } catch (error) {}

      try {
        const dangling = execSync('docker images -f "dangling=true" --format "{{.ID}}"', {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        result.unusedImages = dangling.trim().split('\n').filter(Boolean).length;
      } catch (error) {}

      // Liste des containers
      try {
        const containers = execSync('docker ps --format "{{.Names}}\t{{.Status}}"', {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        result.containers = containers.trim().split('\n')
          .filter(Boolean)
          .map(line => {
            const [name, status] = line.split('\t');
            return { name, status };
          });
      } catch (error) {}
    }

    return result;
  }
}

module.exports = DockerDetector;
