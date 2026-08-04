const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const { execSync } = require('child_process');

const FRAMEWORK_MAP = {
  next: {
    name: 'Next.js',
    officialCmd: (name, ver) => `npx create-next-app@${ver || 'latest'} ${name}`,
    extraPackages: ['prettier', 'eslint-config-prettier'],
    setupGit: true
  },
  laravel: {
    name: 'Laravel',
    officialCmd: (name, ver) => `composer create-project laravel/laravel:${ver || '*'} ${name}`,
    extraPackages: [],
    setupGit: true
  },
  vue: {
    name: 'Vue.js',
    officialCmd: (name, ver) => `npm create vue@${ver || 'latest'} -- ${name} --default`,
    extraPackages: ['prettier'],
    setupGit: true
  }
};

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

    const config = FRAMEWORK_MAP[framework];
    console.log(pc.cyan(`\n🚀 Initialisation du projet ${pc.bold(config.name)} dans : ${pc.bold(projectName)}...`));

    const finalCmd = config.officialCmd(projectName, version);
    console.log(pc.gray(`Command : ${finalCmd}\n`));

    // Étape 3 : Bootstrap via execSync
    try {
      execSync(finalCmd, { stdio: 'inherit', shell: true });
    } catch (err) {
      console.log(pc.red(`\n❌ Échec du bootstrap du projet via la commande officielle.`));
      console.log(pc.gray(`Détails: ${err.message}`));
      process.exit(1);
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
      
      let installCmd = '';
      if (fs.existsSync('package.json')) {
        installCmd = `npm install --save-dev ${config.extraPackages.join(' ')}`;
        try {
          execSync(installCmd, { stdio: 'inherit' });
          console.log(pc.green('✅ Packages de l\'équipe installés.'));
        } catch (err) {
          console.log(pc.yellow(`⚠️  Impossible d'installer les packages supplémentaires : ${err.message}`));
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
      try {
        // Tenter d'initialiser git
        execSync('git init -b main', { stdio: 'ignore' });
      } catch (e) {
        try {
          execSync('git init', { stdio: 'ignore' });
        } catch (err) {
          console.log(pc.yellow(`⚠️  Impossible d'initialiser Git : ${err.message}`));
        }
      }

      if (fs.existsSync('.git')) {
        try {
          // Création du premier commit
          execSync('git add .', { stdio: 'ignore' });
          execSync('git commit -m "chore: initial commit by flash-dev"', { stdio: 'ignore' });
          console.log(pc.green('✅ Dépôt Git initialisé et premier commit créé !'));
        } catch (err) {
          console.log(pc.yellow(`⚠️  Impossible de réaliser le premier commit automatique : ${err.message}`));
        }
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