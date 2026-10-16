const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { run } = require('../../utils/exec');

/**
 * flash-dev laravel fresh — clear every Laravel cache and refresh the autoloader.
 * @returns {number} exit code
 */
function freshCommand() {
  if (!fs.existsSync(path.join(process.cwd(), 'artisan'))) {
    console.log(pc.red('Erreur : ') + pc.yellow('projet Laravel introuvable (fichier artisan absent).'));
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.cyan('\n🧹 Nettoyage de l\'application Laravel\n'));

  const steps = [
    { file: 'php', args: ['artisan', 'cache:clear'], label: 'Cache applicatif', required: true },
    { file: 'php', args: ['artisan', 'config:clear'], label: 'Cache de configuration', required: true },
    { file: 'php', args: ['artisan', 'route:clear'], label: 'Cache de routes', required: true },
    { file: 'php', args: ['artisan', 'view:clear'], label: 'Vues compilées', required: true },
    { file: 'php', args: ['artisan', 'event:clear'], label: 'Cache d\'événements', required: false },
    { file: 'composer', args: ['dump-autoload', '--optimize'], label: 'Autoloader Composer', required: false }
  ];

  let failed = 0;

  for (const [index, step] of steps.entries()) {
    const progress = Math.round(((index + 1) / steps.length) * 100);
    process.stdout.write(`\r${pc.cyan('Progression:')} ${progress}%  ${step.label.padEnd(28)}`);

    const result = run(step.file, step.args, { timeout: 120000 });

    if (!result.ok) {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');

      if (step.required) {
        console.log(pc.red(`\n❌ Échec : ${step.label}`));
        console.log(pc.gray((result.stderr || result.stdout || '').trim().split('\n')[0] || ''));
        process.exitCode = 1;
        return 1;
      }

      failed += 1;
      console.log(pc.yellow(`⚠️  Ignoré : ${step.label} (indisponible sur ce projet)`));
    }
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  console.log(pc.green(`✨ Application Laravel nettoyée (${steps.length - failed}/${steps.length} étapes).\n`));

  return 0;
}

module.exports = freshCommand;
