

const pc = require('picocolors');
const Logger = require('../core/logger');
const config = require('../core/config');
const { initGeminiClient } = require('../utils/ai');
const { getApiKey } = require('../utils/config');
const fs = require('fs').promises;
const path = require('path');
const prompts = require('prompts');


const ERROR_PATTERNS = {
  'Cannot read properties of undefined': {
    cause: 'Tentative d\'accès à une propriété sur une valeur undefined',
    solution: 'Vérifiez que la variable est définie avant d\'accéder à ses propriétés. Utilisez l\'opérateur de chaînage optionnel (?.) ou une vérification explicite.',
    example: 'if (obj?.property) { ... }'
  },
  'Cannot read properties of null': {
    cause: 'Tentative d\'accès à une propriété sur une valeur null',
    solution: 'Vérifiez que la variable n\'est pas null avant d\'accéder à ses propriétés.',
    example: 'if (obj !== null && obj.property) { ... }'
  },
  'is not a function': {
    cause: 'Tentative d\'appeler quelque chose qui n\'est pas une fonction',
    solution: 'Vérifiez que la variable est bien une fonction avant de l\'appeler.',
    example: 'if (typeof myFunc === \'function\') { myFunc(); }'
  },
  'Unexpected token': {
    cause: 'Erreur de syntaxe dans le code JavaScript',
    solution: 'Vérifiez la syntaxe autour de la ligne indiquée. Il peut manquer une parenthèse, un point-virgule ou une virgule.',
    example: '// Vérifiez les parenthèses et accolades'
  },
  'Module not found': {
    cause: 'Un module ou fichier n\'a pas pu être trouvé',
    solution: 'Vérifiez que le chemin du fichier est correct et que le module est installé.',
    example: 'npm install <module-name>'
  },
  'EADDRINUSE': {
    cause: 'Le port est déjà utilisé par un autre processus',
    solution: 'Changez de port ou tuez le processus qui utilise le port.',
    example: 'flash-dev kill-node'
  },
  'ECONNREFUSED': {
    cause: 'Connexion refusée par le serveur',
    solution: 'Vérifiez que le serveur est démarré et que le port est correct.',
    example: 'Vérifiez docker compose up ou le service de base de données'
  },
  'ETIMEDOUT': {
    cause: 'La connexion a expiré',
    solution: 'Vérifiez votre connexion réseau ou augmentez le timeout.',
    example: 'Vérifiez votre connexion internet ou la disponibilité du serveur'
  }
};

async function explainCommand(errorInput) {
  const logger = Logger.create({
    verbose: config.isVerbose(),
    json: config.isJson(),
    quiet: config.isQuiet()
  });

  try {
    console.log(pc.cyan('\n🤖 Flash-dev Explain - Analyse d\'erreur avec IA\n'));

    let errorText = errorInput;

    
        validate: value => value.length > 0 || 'Veuillez entrer une erreur'
      });
      errorText = input;
    }

    
    const apiKey = getApiKey();
    if (apiKey) {
      console.log(pc.cyan('🧠 Analyse avec Gemini...\n'));
      
      try {
        const client = initGeminiClient(apiKey);
        const prompt = `Analyse cette erreur et fournis:
1. La cause probable
2. La solution recommandée
3. Un exemple de code correct
4. Une documentation pertinente (URL)

Format JSON: {"cause": "...", "solution": "...", "example": "...", "docs": "..."}.

Erreur:
${errorText}`;
        
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        try {
          const aiAnalysis = JSON.parse(response.replace(/```json/g, '').replace(/```/g, ''));
          
          console.log(pc.bold('Cause:'));
          console.log(pc.white(`  ${aiAnalysis.cause}\n`));
          
          console.log(pc.bold('Solution:'));
          console.log(pc.white(`  ${aiAnalysis.solution}\n`));
          
          console.log(pc.bold('Exemple:'));
          console.log(pc.cyan(`  ${aiAnalysis.example}\n`));
          
          if (aiAnalysis.docs) {
            console.log(pc.bold('Documentation:'));
            console.log(pc.cyan(`  ${aiAnalysis.docs}\n`));
          }
          
          console.log(pc.green('✨ Analyse IA terminée\n'));
          return;
        } catch (parseError) {
          console.log(pc.yellow('⚠️  Impossible de parser la réponse IA, fallback local...\n'));
        }
      } catch (error) {
        console.log(pc.yellow('⚠️  Analyse IA indisponible, fallback local...\n'));
      }
    }

    
    console.log(pc.cyan('📚 Analyse locale (base de connaissances)\n'));
    
    let found = false;
    for (const [pattern, info] of Object.entries(ERROR_PATTERNS)) {
      if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(pc.bold('Cause:'));
        console.log(pc.white(`  ${info.cause}\n`));
        
        console.log(pc.bold('Solution:'));
        console.log(pc.white(`  ${info.solution}\n`));
        
        console.log(pc.bold('Exemple:'));
        console.log(pc.cyan(`  ${info.example}\n`));
        
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(pc.yellow('⚠️  Aucun pattern d\'erreur connu détecté\n'));
      console.log(pc.cyan('Suggestions:\n'));
      console.log(pc.gray('  • Recherchez l\'erreur sur Google ou Stack Overflow'));
      console.log(pc.gray('  • Vérifiez la documentation du framework utilisé'));
      console.log(pc.gray('  • Configurez une clé API Gemini pour une analyse IA plus avancée\n'));
    }

  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'analyse: ${error.message}\n`));
    if (config.isVerbose()) {
      console.log(error.stack);
    }
    throw error;
  }
}

module.exports = explainCommand;
