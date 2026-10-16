const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { ValidationError } = require('../../core/errors');
const { inherit } = require('../../utils/exec');

/** A Laravel model name: StudlyCase letters and digits only. */
const MODEL_RE = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * Validate and normalise a model name to StudlyCase.
 * Rejecting everything else closes the shell injection surface.
 * @param {string} input
 * @returns {string}
 * @throws {Error}
 */
function normalizeModel(input) {
  const candidate = String(input || '').trim();

  if (!MODEL_RE.test(candidate)) {
    throw new ValidationError(
      `Nom de modèle invalide: "${input}". Utilisez uniquement des lettres et des chiffres (ex: Product).`,
      'Exemple valide: flash-dev laravel make-crud Product'
    );
  }

  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

/**
 * flash-dev laravel make-crud <Model>
 * @param {string} modelArg
 * @returns {number} exit code
 */
function makeCrudCommand(modelArg) {
  const model = normalizeModel(modelArg);

  if (!fs.existsSync(path.join(process.cwd(), 'artisan'))) {
    console.log(pc.red('Erreur : ') + pc.yellow('projet Laravel introuvable (fichier artisan absent).'));
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.cyan(`\n🚀 Génération du CRUD pour le modèle : ${pc.bold(model)}\n`));

  const steps = [
    { args: ['artisan', 'make:model', model, '-m'], desc: 'Modèle + migration' },
    { args: ['artisan', 'make:controller', `${model}Controller`, '--api'], desc: 'Contrôleur API' },
    { args: ['artisan', 'make:request', `Store${model}Request`], desc: 'Form request (store)' },
    { args: ['artisan', 'make:request', `Update${model}Request`], desc: 'Form request (update)' },
    { args: ['artisan', 'make:resource', `${model}Resource`], desc: 'Resource API' },
    { args: ['artisan', 'make:policy', `${model}Policy`, '--model', model], desc: 'Policy' },
    { args: ['artisan', 'make:factory', `${model}Factory`, '--model', model], desc: 'Factory' },
    { args: ['artisan', 'make:seeder', `${model}Seeder`], desc: 'Seeder' }
  ];

  const completed = [];

  for (const step of steps) {
    console.log(pc.yellow(`🔹 ${step.desc}...`));
    const result = inherit('php', step.args);

    if (!result.ok) {
      console.log(pc.red(`\n❌ Échec à l'étape : ${step.desc}`));
      if (completed.length > 0) {
        console.log(pc.yellow('\nÉtapes déjà appliquées (à nettoyer si besoin) :'));
        completed.forEach((done) => console.log(pc.gray(`  - ${done}`)));
      }
      process.exitCode = 1;
      return 1;
    }

    completed.push(step.desc);
  }

  console.log(pc.green(`\n✨ CRUD ${model} généré (${steps.length} artefacts).`));
  console.log(pc.cyan('\nProchaine étape : déclarez la route dans routes/api.php'));
  console.log(pc.white(`  Route::apiResource('${model.toLowerCase()}s', ${model}Controller::class);\n`));

  return 0;
}

module.exports = makeCrudCommand;
module.exports.normalizeModel = normalizeModel;
