const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { execSync } = require('child_process');

/**
 * Commande: sql-dump
 * Sauvegarde la base de données locale (MySQL / PostgreSQL) en lisant le fichier .env
 */
function sqlDumpCommand() {
  try {
    console.log(pc.cyan('\n🗄️  Sauvegarde de la base de données locale...\n'));

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Fichier .env introuvable dans le dossier actuel.'));
      console.log(pc.cyan('Cette commande doit être exécutée à la racine d\'un projet contenant un fichier .env.'));
      process.exit(1);
    }

    console.log(pc.yellow('Parsing du fichier .env...'));
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split(/\r?\n/);
    const config = {};

    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.substring(0, separatorIndex).trim();
      let val = trimmed.substring(separatorIndex + 1).trim();

      // Enlever les guillemets éventuels autour de la valeur
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      config[key] = val;
    }

    const connection = config.DB_CONNECTION || 'mysql';
    const host = config.DB_HOST || '127.0.0.1';
    const port = config.DB_PORT || (connection === 'pgsql' ? '5432' : '3306');
    const database = config.DB_DATABASE;
    const username = config.DB_USERNAME;
    const password = config.DB_PASSWORD || '';

    if (!database || !username) {
      console.log(pc.red(pc.bold('Erreur : ')) + pc.yellow('Les variables DB_DATABASE et DB_USERNAME doivent être spécifiées dans le .env.'));
      process.exit(1);
    }

    console.log(pc.cyan('Configuration détectée :'));
    console.log(pc.gray(`  SGBD     : ${connection}`));
    console.log(pc.gray(`  Hôte     : ${host}:${port}`));
    console.log(pc.gray(`  Base     : ${database}`));
    console.log(pc.gray(`  Utilisateur : ${username}`));

    const dumpFile = `dump_${database}_${Date.now()}.sql`;
    const hasDockerCompose = fs.existsSync(path.join(process.cwd(), 'docker-compose.yml')) || fs.existsSync(path.join(process.cwd(), 'docker-compose.yaml'));

    let dumpCommand = '';
    let envOpts = { ...process.env };

    if (hasDockerCompose) {
      console.log(pc.yellow('\n🐳 Environnement Docker détecté. Tentative de dump via Docker Compose...'));
      if (connection === 'mysql') {
        const passArg = password ? `-p"${password}"` : '';
        dumpCommand = `docker compose exec -T db mysqldump -u"${username}" ${passArg} "${database}" > "${dumpFile}"`;
      } else if (connection === 'pgsql' || connection === 'postgresql') {
        dumpCommand = `docker compose exec -T db pg_dump -U "${username}" -d "${database}" -F p > "${dumpFile}"`;
      } else {
        console.log(pc.red(`SGBD "${connection}" non supporté via Docker pour le moment.`));
        process.exit(1);
      }
    } else {
      console.log(pc.yellow('\n🖥️  Environnement local détecté. Utilisation des commandes natives...'));
      if (connection === 'mysql') {
        const passArg = password ? `-p"${password}"` : '';
        dumpCommand = `mysqldump -h "${host}" -P "${port}" -u "${username}" ${passArg} "${database}" > "${dumpFile}"`;
      } else if (connection === 'pgsql' || connection === 'postgresql') {
        // Définir la variable d'environnement PGPASSWORD de manière sécurisée
        envOpts.PGPASSWORD = password;
        dumpCommand = `pg_dump -h "${host}" -p "${port}" -U "${username}" -d "${database}" -F p -f "${dumpFile}"`;
      } else {
        console.log(pc.red(`SGBD "${connection}" non supporté localement pour le moment.`));
        process.exit(1);
      }
    }

    try {
      console.log(pc.yellow(`⏳ Création du dump SQL dans : ${pc.bold(dumpFile)}...`));
      execSync(dumpCommand, { stdio: 'pipe', env: envOpts, shell: true });
      console.log(pc.green(`\n✨ Base de données sauvegardée avec succès !`));
      console.log(pc.green(`📁 Fichier créé : ${pc.bold(dumpFile)}\n`));
    } catch (err) {
      console.log(pc.red(`\n❌ Échec du dump SQL.`));
      console.log(pc.yellow('Vérifiez que :'));
      console.log(pc.yellow(`  - L'utilitaire client (${connection === 'mysql' ? 'mysqldump' : 'pg_dump'}) est installé et accessible dans votre PATH.`));
      console.log(pc.yellow('  - Les identifiants et accès réseau du fichier .env sont corrects.'));
      console.log(pc.yellow('  - Si vous êtes sous Docker, le conteneur de base de données est actif et nommé "db".'));
      console.log(pc.gray(`Détails de l'erreur: ${err.message}\n`));
      
      // Supprimer le fichier de dump vide ou corrompu s'il a été créé
      const filePath = path.join(process.cwd(), dumpFile);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      process.exit(1);
    }
  } catch (error) {
    console.log(pc.red(`\n❌ Une erreur inattendue est survenue : ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = sqlDumpCommand;