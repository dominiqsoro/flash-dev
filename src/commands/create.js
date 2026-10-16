const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const { ValidationError } = require('../core/errors');
const { inherit } = require('../utils/exec');

/** Project names are used as directory names and CLI arguments. */
const PROJECT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,213}$/;
/** Versions are forwarded to package managers; keep them to semver-ish tokens. */
const VERSION_RE = /^[0-9][0-9a-zA-Z.\-]*$/;

const FRAMEWORK_MAP = {
  next: {
    name: 'Next.js',
    // argv arrays only — nothing is ever handed to a shell
    command: (name, ver) => ({ file: 'npx', args: [`create-next-app@${ver || 'latest'}`, name] }),
    extraPackages: ['prettier', 'eslint-config-prettier'],
    setupGit: true
  },
  laravel: {
    name: 'Laravel',
    command: (name, ver) => ({
      file: 'composer',
      args: ['create-project', `laravel/laravel:${ver || '*'}`, name]
    }),
    extraPackages: [],
    setupGit: true
  },
  vue: {
    name: 'Vue.js',
    command: (name, ver) => ({ file: 'npm', args: ['create', `vue@${ver || 'latest'}`, '--', name, '--default'] }),
    extraPackages: ['prettier'],
    setupGit: true
  }
};

/**
 * Validate a project name before it becomes a directory and a CLI argument.
 * @param {string} name
 * @returns {string}
 * @throws {Error}
 */
function validateProjectName(name) {
  const candidate = String(name || '').trim();

  if (!PROJECT_NAME_RE.test(candidate)) {
    throw new ValidationError(
      `Nom de projet invalide: "${name}". Lettres, chiffres, point, tiret et underscore uniquement.`,
      'Exemple valide: flash-dev create next mon-app'
    );
  }

  if (candidate === '.' || candidate === '..') {
    throw new ValidationError('Le nom de projet ne peut pas être "." ou "..".');
  }

  return candidate;
}

/**
 * Validate an optional framework version token.
 * @param {string} version
 * @returns {string}
 * @throws {Error}
 */
function validateVersion(version) {
  const candidate = String(version || '').trim();
  if (!candidate) return '';

  if (!VERSION_RE.test(candidate)) {
    throw new ValidationError(`Version invalide: "${version}". Exemple attendu: 14.2.3`);
  }

  return candidate;
}

/**
 * Commande: create <framework> [project-name]
 * Configure un projet de A à Z selon le framework choisi, avec sa version et ses configurations standards.
 */
async function createCommand(frameworkArg, projectNameArg) {
  try {
    console.log(pc.cyan('\n🏗️  Générateur et configurateur de projet universel...\n'));

    let framework = frameworkArg ? frameworkArg.toLowerCase() : null;
    let projectName = projectNameArg;
    let version = '';

    // Étape 1 : Si le framework est invalide ou absent, demander de manière interactive
    if (!framework || !FRAMEWORK_MAP[framework]) {
      if (framework) {
        console.log(pc.yellow(`⚠️  Le framework "${framework}" n'est pas supporté. Veuillez choisir parmi la liste ci-dessous.`));
      }

      const response = await prompts([
        {
          type: 'select',
          name: 'selectedFramework',
          message: 'Choisissez votre framework :',
          choices: Object.entries(FRAMEWORK_MAP).map(([key, config]) => ({
            title: config.name,
            value: key
          })),
          initial: 0
        },
        {
          type: 'text',
          name: 'projectVersion',
          message: 'Version spécifique du framework (laisser vide pour la version stable/par défaut) :',
          initial: ''
        }
      ]);

      if (!response.selectedFramework) {
        console.log(pc.yellow('\nOpération annulée par l\'utilisateur.\n'));
        process.exit(0);
      }

      framework = response.selectedFramework;
      version = response.projectVersion.trim();
    }

    // Étape 2 : Si le nom de projet est manquant, le demander
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'inputName',
        message: 'Entrez le nom du projet (et dossier de destination) :',
        initial: `my-${framework}-app`,
        validate: (val) => {
          if (!val || val.trim() === '') return 'Le nom du projet ne peut pas être vide';
          if (!PROJECT_NAME_RE.test(val.trim())) {
            return 'Lettres, chiffres, point, tiret et underscore uniquement';
          }
          // Éviter d'écraser un dossier existant non vide
          const targetDir = path.join(process.cwd(), val.trim());
          if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
            return `Le dossier "${val.trim()}" existe déjà et n'est pas vide.`;
          }
          return true;
        }
      });

      if (!response.inputName) {
        console.log(pc.yellow('\nOpération annulée par l\'utilisateur.\n'));
        process.exit(0);
      }

      projectName = response.inputName.trim();
    }

    projectName = validateProjectName(projectName);
    version = validateVersion(version);

    const config = FRAMEWORK_MAP[framework];
    console.log(pc.cyan(`\n🚀 Initialisation du projet ${pc.bold(config.name)} dans : ${pc.bold(projectName)}...`));

    const { file, args } = config.command(projectName, version);
    console.log(pc.gray(`Commande : ${file} ${args.join(' ')}\n`));

    // Étape 3 : bootstrap (argv, aucun shell)
    if (!inherit(file, args).ok) {
      console.log(pc.red(`\n❌ Échec du bootstrap via "${file}".`));
      console.log(pc.cyan(`   Vérifiez que "${file}" est installé et accessible dans le PATH.`));
      process.exitCode = 1;
      return 1;
    }

    // Se déplacer dans le dossier créé
    const projectPath = path.join(process.cwd(), projectName);
    if (!fs.existsSync(projectPath)) {
      console.log(pc.red(`\n❌ Une erreur s'est produite : le dossier "${projectName}" n'a pas été créé.`));
      process.exit(1);
    }

    process.chdir(projectPath);
    console.log(pc.yellow(`\n📂 Déplacement dans : ${projectPath}`));

    // Étape 4 : Optimisation - Installation des packages extras
    if (config.extraPackages && config.extraPackages.length > 0) {
      console.log(pc.yellow(`\n📦 Installation des packages supplémentaires de l'équipe : ${pc.bold(config.extraPackages.join(', '))}...`));
      
      if (fs.existsSync('package.json')) {
        if (inherit('npm', ['install', '--save-dev', ...config.extraPackages]).ok) {
          console.log(pc.green('✅ Packages de l\'équipe installés.'));
        } else {
          console.log(pc.yellow('⚠️  Impossible d\'installer les packages supplémentaires.'));
        }
      }
    }

    // Étape 5 : Écriture d'un fichier de configuration standard .prettierrc pour l'équipe
    if (config.extraPackages && config.extraPackages.includes('prettier')) {
      console.log(pc.yellow('\n✍️  Écriture de la configuration Prettier standard (.prettierrc)...'));
      const prettierrcContent = {
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 100
      };
      
      fs.writeFileSync(
        path.join(process.cwd(), '.prettierrc'),
        JSON.stringify(prettierrcContent, null, 2),
        'utf8'
      );
      console.log(pc.green('✅ Fichier .prettierrc généré.'));
    }

    // Étape 6 : Initialisation de Git et premier commit
    if (config.setupGit) {
      console.log(pc.yellow('\n🔧 Initialisation du dépôt Git local...'));
      const initialized =
        inherit('git', ['init', '-b', 'main']).ok || inherit('git', ['init']).ok;

      if (!initialized) {
        console.log(pc.yellow('⚠️  Impossible d\'initialiser Git.'));
      } else if (fs.existsSync('.git')) {
        const committed =
          inherit('git', ['add', '.']).ok &&
          inherit('git', ['commit', '-m', 'chore: initial commit by flash-dev']).ok;

        console.log(
          committed
            ? pc.green('✅ Dépôt Git initialisé et premier commit créé !')
            : pc.yellow('⚠️  Dépôt initialisé, mais le premier commit a échoué (identité Git configurée ?).')
        );
      }
    }

    console.log(pc.green(`\n✨ Projet ${pc.bold(config.name)} créé et configuré avec succès avec les standards de l'équipe ! 🚀\n`));
    console.log(pc.cyan('Pour démarrer :'));
    console.log(pc.white(`  cd ${projectName}`));
    if (framework === 'laravel') {
      console.log(pc.white('  php artisan serve'));
    } else {
      console.log(pc.white('  npm run dev'));
    }
    console.log();

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = createCommand;
module.exports.validateProjectName = validateProjectName;
module.exports.validateVersion = validateVersion;