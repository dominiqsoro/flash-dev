const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { run, ok } = require('../utils/exec');
const { readEnvFile } = require('../utils/dotenv');
const { ValidationError } = require('../core/errors');

const MYSQL_DRIVERS = new Set(['mysql', 'mysqli', 'mariadb', 'mysql2']);
const PGSQL_DRIVERS = new Set(['pgsql', 'postgres', 'postgresql']);

/**
 * Build the dump argv for the detected driver.
 * The password is NEVER placed on the command line — it goes through the
 * environment, so it cannot be read from `ps aux` by other local users.
 * @param {object} config
 * @param {boolean} viaDocker
 * @returns {{file: string, args: string[], env: Record<string,string>}}
 */
function buildDumpCommand(config, viaDocker) {
  const { driver, host, port, database, username, password, service } = config;

  let file;
  let args;
  const env = {};

  if (MYSQL_DRIVERS.has(driver)) {
    file = 'mysqldump';
    args = [
      '--host', host,
      '--port', String(port),
      '--user', username,
      '--single-transaction',
      '--quick',
      '--routines',
      '--events',
      '--default-character-set=utf8mb4',
      database
    ];
    if (password) env.MYSQL_PWD = password;
  } else if (PGSQL_DRIVERS.has(driver)) {
    file = 'pg_dump';
    args = [
      '--host', host,
      '--port', String(port),
      '--username', username,
      '--no-password',
      '--format=plain',
      database
    ];
    if (password) env.PGPASSWORD = password;
  } else {
    throw new ValidationError(
      `SGBD "${driver}" non supporté (attendu: mysql, mariadb, pgsql).`,
      'Renseignez DB_CONNECTION=mysql ou DB_CONNECTION=pgsql dans votre .env'
    );
  }

  if (viaDocker) {
    // `docker compose exec -T <service> <binary> <args...>` — still argv, no shell
    const dockerEnvArgs = Object.keys(env).flatMap((key) => ['--env', `${key}=${env[key]}`]);
    return {
      file: 'docker',
      args: ['compose', 'exec', '-T', ...dockerEnvArgs, service, file, ...args],
      env: {}
    };
  }

  return { file, args, env };
}

/**
 * flash-dev sql-dump — back up the local database described by .env
 * @param {object} [options]
 * @param {string} [options.output] explicit output file
 * @param {string} [options.service] docker compose service name
 * @returns {number} exit code
 */
function sqlDumpCommand(options = {}) {
  console.log(pc.cyan('\n🗄️  Sauvegarde de la base de données locale\n'));

  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.log(pc.red('Erreur : ') + pc.yellow('fichier .env introuvable.'));
    console.log(pc.cyan('Lancez cette commande à la racine d\'un projet contenant un .env.\n'));
    process.exitCode = 1;
    return 1;
  }

  const env = readEnvFile(envPath);

  const driver = (env.DB_CONNECTION || env.DB_DRIVER || 'mysql').toLowerCase();
  const isPg = PGSQL_DRIVERS.has(driver);

  const config = {
    driver,
    host: env.DB_HOST || '127.0.0.1',
    port: env.DB_PORT || (isPg ? '5432' : '3306'),
    database: env.DB_DATABASE || env.DB_NAME,
    username: env.DB_USERNAME || env.DB_USER,
    password: env.DB_PASSWORD || env.DB_PASS || '',
    service: options.service || env.DB_SERVICE || 'db'
  };

  if (!config.database || !config.username) {
    console.log(pc.red('Erreur : ') + pc.yellow('DB_DATABASE et DB_USERNAME sont requis dans le .env.'));
    process.exitCode = 1;
    return 1;
  }

  // Never echo the password back to the terminal
  console.log(pc.cyan('Configuration détectée :'));
  console.log(pc.gray(`  SGBD        : ${config.driver}`));
  console.log(pc.gray(`  Hôte        : ${config.host}:${config.port}`));
  console.log(pc.gray(`  Base        : ${config.database}`));
  console.log(pc.gray(`  Utilisateur : ${config.username}`));
  console.log(pc.gray(`  Mot de passe: ${config.password ? '(fourni, transmis hors ligne de commande)' : '(aucun)'}`));

  const hasCompose =
    fs.existsSync(path.join(process.cwd(), 'docker-compose.yml')) ||
    fs.existsSync(path.join(process.cwd(), 'docker-compose.yaml')) ||
    fs.existsSync(path.join(process.cwd(), 'compose.yml'));

  const viaDocker = hasCompose && ok('docker', ['compose', 'version'], { timeout: 3000 });

  let dump;
  try {
    dump = buildDumpCommand(config, viaDocker);
  } catch (error) {
    console.log(pc.red(`\n❌ ${error.message}\n`));
    process.exitCode = 1;
    return 1;
  }

  console.log(
    viaDocker
      ? pc.yellow(`\n🐳 Docker Compose détecté — dump via le service "${config.service}".`)
      : pc.yellow('\n🖥️  Utilisation des binaires locaux.')
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dumpFile = options.output || `dump_${config.database}_${timestamp}.sql`;
  const dumpPath = path.resolve(process.cwd(), dumpFile);

  if (fs.existsSync(dumpPath)) {
    console.log(pc.red(`\n❌ Le fichier ${dumpFile} existe déjà — annulation.\n`));
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.yellow('\n🚀 Exécution de la sauvegarde...'));

  let outputFd;
  try {
    outputFd = fs.openSync(dumpPath, 'wx', 0o600);
  } catch (error) {
    console.log(pc.red(`\n❌ Impossible de créer ${dumpFile} : ${error.message}\n`));
    process.exitCode = 1;
    return 1;
  }

  const result = run(dump.file, dump.args, {
    timeout: 600000,
    env: { ...process.env, ...dump.env },
    stdio: ['ignore', outputFd, 'pipe'],
    capture: false
  });

  try { fs.closeSync(outputFd); } catch { /* already closed */ }

  if (!result.ok) {
    const detail = result.error ? result.error.message : `code ${result.status}`;
    try { fs.unlinkSync(dumpPath); } catch { /* best effort */ }

    console.log(pc.red(`\n❌ Échec du dump (${detail}).`));
    console.log(pc.cyan(`   Vérifiez que "${dump.file}" est installé et que les identifiants sont valides.\n`));
    process.exitCode = 1;
    return 1;
  }

  const stats = fs.statSync(dumpPath);
  if (stats.size === 0) {
    fs.unlinkSync(dumpPath);
    console.log(pc.red('\n❌ Le dump est vide — sauvegarde supprimée.\n'));
    process.exitCode = 1;
    return 1;
  }

  console.log(pc.green(`\n✅ Dump créé : ${dumpFile}`));
  console.log(pc.gray(`   Taille : ${(stats.size / 1024).toFixed(1)} Ko · permissions 600`));
  console.log(pc.yellow('\n⚠️  Ce fichier contient vos données — ne le committez pas.\n'));

  return 0;
}

module.exports = sqlDumpCommand;
module.exports.buildDumpCommand = buildDumpCommand;
