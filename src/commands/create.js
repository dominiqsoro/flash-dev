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


async function createCommand(frameworkArg, projectNameArg) {
  try {
    console.log(pc.cyan('\n🏗️  Générateur et configurateur de projet universel...\n'));

    let framework = frameworkArg ? frameworkArg.toLowerCase() : null;
    let projectName = projectNameArg;
    let version = '';

    
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

    
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'inputName',
        message: 'Entrez le nom du projet (et dossier de destination) :',
        initial: `my-${framework}-app`,
        validate: (val) => {
          if (!val || val.trim() === '') return 'Le nom du projet ne peut pas être vide';
          
        } catch (err) {
          console.log(pc.yellow(`⚠️  Impossible d'installer les packages supplémentaires : ${err.message}`));
        }
      }
    }

    
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

    
    if (config.setupGit) {
      console.log(pc.yellow('\n🔧 Initialisation du dépôt Git local...'));
      try {
        
    }
    console.log();

  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = createCommand;