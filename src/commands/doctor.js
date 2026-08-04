/**
 * Commande: flash-dev doctor
 * Diagnostic complet de l'environnement de développement
 */

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const GitDetector = require('../detectors/git');
const NodeDetector = require('../detectors/node');
const DockerDetector = require('../detectors/docker');
const PHPDetector = require('../detectors/php');
const DatabaseDetector = require('../detectors/database');
const FrameworkDetector = require('../detectors/framework');

async function doctorCommand() {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    console.log(pc.cyan('\n🔬 Flash-dev Doctor - Diagnostic de l\'environnement\n'));

    // Exécution parallèle de tous les détecteurs
    const [git, node, docker, php, database, framework] = await Promise.all([
      new GitDetector().detect(),
      new NodeDetector().detect(),
      new DockerDetector().detect(),
      new PHPDetector().detect(),
      new DatabaseDetector().detect(),
      new FrameworkDetector().detect()
    ]);

    const results = {
      git,
      node,
      docker,
      php,
      database,
      framework
    };

    if (config.isJson()) {
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    }

    // Affichage des résultats
    let hasErrors = false;
    let hasWarnings = false;

    // Git
    console.log(pc.bold('Git'));
    if (git.installed) {
      console.log(pc.green(`  ✔ Git installé: ${git.node || 'OK'}`));
      if (git.repository) {
        console.log(pc.green(`  ✔ Dépôt Git: ${git.status}`));
        console.log(pc.gray(`    Branche: ${git.currentBranch}`));
        if (git.remote) {
          console.log(pc.gray(`    Remote: configuré`));
        }
        if (git.hasUncommitted) {
          console.log(pc.yellow(`  ⚠ Fichiers non commités`));
          hasWarnings = true;
        }
        if (git.hasConflicts) {
          console.log(pc.red(`  ✖ Conflits en attente`));
          hasErrors = true;
        }
      } else {
        console.log(pc.yellow(`  ⚠ Pas de dépôt Git initialisé`));
        hasWarnings = true;
      }
    } else {
      console.log(pc.red(`  ✖ Git non installé`));
      hasErrors = true;
    }

    // Node.js
    console.log(pc.bold('\nNode.js'));
    if (node.node) {
      console.log(pc.green(`  ✔ Node.js: ${node.node}`));
      if (node.npm) console.log(pc.gray(`    npm: ${node.npm}`));
      if (node.pnpm) console.log(pc.gray(`    pnpm: ${node.pnpm}`));
      if (node.yarn) console.log(pc.gray(`    yarn: ${node.yarn}`));
      if (node.bun) console.log(pc.gray(`    bun: ${node.bun}`));
      if (node.hasPackageJson) {
        console.log(pc.green(`  ✔ package.json détecté`));
        console.log(pc.gray(`    Package manager: ${node.packageManager || 'npm'}`));
        console.log(pc.gray(`    Dépendances: ${node.dependencies} prod, ${node.devDependencies} dev`));
      }
    } else {
      console.log(pc.yellow(`  ⚠ Node.js non installé`));
      hasWarnings = true;
    }

    // Docker
    console.log(pc.bold('\nDocker'));
    if (docker.installed) {
      console.log(pc.green(`  ✔ Docker installé`));
      if (docker.engineActive) {
        console.log(pc.green(`  ✔ Docker Engine actif`));
      } else {
        console.log(pc.yellow(`  ⚠ Docker Engine non actif`));
        hasWarnings = true;
      }
      if (docker.desktopRunning) {
        console.log(pc.green(`  ✔ Docker Desktop lancé`));
      }
      if (docker.composeAvailable) {
        console.log(pc.green(`  ✔ Docker Compose disponible`));
      }
      if (docker.hasDockerfile) {
        console.log(pc.gray(`    Dockerfile détecté`));
      }
      if (docker.hasComposeFile) {
        console.log(pc.gray(`    docker-compose.yml détecté`));
      }
      if (docker.stoppedContainers > 0) {
        console.log(pc.yellow(`  ⚠ ${docker.stoppedContainers} containers arrêtés`));
        hasWarnings = true;
      }
      if (docker.unusedImages > 0) {
        console.log(pc.yellow(`  ⚠ ${docker.unusedImages} images inutilisées`));
        hasWarnings = true;
      }
    } else {
      console.log(pc.yellow(`  ⚠ Docker non installé`));
      hasWarnings = true;
    }

    // PHP
    console.log(pc.bold('\nPHP'));
    if (php.php) {
      console.log(pc.green(`  ✔ PHP: ${php.php}`));
      if (php.composer) {
        console.log(pc.green(`  ✔ Composer: ${php.composer}`));
      }
      if (php.hasComposerJson) {
        console.log(pc.gray(`    composer.json détecté`));
        if (php.framework) {
          console.log(pc.gray(`    Framework: ${php.framework} ${php.version || ''}`));
        }
      }
      if (php.extensions.length > 0) {
        console.log(pc.gray(`    Extensions: ${php.extensions.join(', ')}`));
      }
    } else {
      console.log(pc.gray(`  ℹ PHP non installé (optionnel)`));
    }

    // Base de données
    console.log(pc.bold('\nBase de données'));
    let dbFound = false;
    if (database.mysql.installed) {
      console.log(pc.green(`  ✔ MySQL: ${database.mysql.version}`));
      if (database.mysql.running) {
        console.log(pc.green(`    MySQL actif`));
      } else {
        console.log(pc.yellow(`    MySQL arrêté`));
        hasWarnings = true;
      }
      dbFound = true;
    }
    if (database.postgresql.installed) {
      console.log(pc.green(`  ✔ PostgreSQL: ${database.postgresql.version}`));
      if (database.postgresql.running) {
        console.log(pc.green(`    PostgreSQL actif`));
      } else {
        console.log(pc.yellow(`    PostgreSQL arrêté`));
        hasWarnings = true;
      }
      dbFound = true;
    }
    if (database.redis.installed) {
      console.log(pc.green(`  ✔ Redis: ${database.redis.version}`));
      if (database.redis.running) {
        console.log(pc.green(`    Redis actif`));
      } else {
        console.log(pc.yellow(`    Redis arrêté`));
        hasWarnings = true;
      }
      dbFound = true;
    }
    if (database.detected) {
      console.log(pc.gray(`    DB configurée (.env): ${database.detected}`));
    }
    if (!dbFound) {
      console.log(pc.gray(`  ℹ Aucune base de données détectée`));
    }

    // Framework
    console.log(pc.bold('\nFramework'));
    if (framework.framework) {
      console.log(pc.green(`  ✔ ${framework.framework.charAt(0).toUpperCase() + framework.framework.slice(1)}: ${framework.version || 'détecté'}`));
      console.log(pc.gray(`    Langage: ${framework.language}`));
      console.log(pc.gray(`    Détecté par: ${framework.detectedBy}`));
    } else {
      console.log(pc.gray(`  ℹ Aucun framework détecté`));
    }

    // Résumé
    console.log(pc.cyan('\n' + '='.repeat(50)));
    if (hasErrors) {
      console.log(pc.red('  ❌ Erreurs détectées - Action requise'));
    } else if (hasWarnings) {
      console.log(pc.yellow('  ⚠ Avertissements - Vérification recommandée'));
    } else {
      console.log(pc.green('  ✅ Tout est OK - Environnement sain'));
    }
    console.log(pc.cyan('='.repeat(50) + '\n'));

    // Suggestions
    if (hasErrors || hasWarnings) {
      console.log(pc.cyan('Suggestions:\n'));
      
      if (!git.repository) {
        console.log(pc.gray('  • Initialiser Git: git init'));
      }
      if (git.hasConflicts) {
        console.log(pc.gray('  • Résoudre les conflits Git'));
      }
      if (!docker.engineActive && docker.installed) {
        console.log(pc.gray('  • Démarrer Docker: Docker Desktop'));
      }
      if (database.postgresql.installed && !database.postgresql.running) {
        console.log(pc.gray('  • Démarrer PostgreSQL: service postgresql start'));
        console.log(pc.gray('    ou: docker compose up -d'));
      }
      if (database.mysql.installed && !database.mysql.running) {
        console.log(pc.gray('  • Démarrer MySQL: service mysql start'));
      }
      if (database.redis.installed && !database.redis.running) {
        console.log(pc.gray('  • Démarrer Redis: service redis start'));
      }
      console.log();
    }

    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors du diagnostic: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
    process.exit(1);
  }
}

module.exports = doctorCommand;
