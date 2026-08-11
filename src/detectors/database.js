const path = require('path');
const fs = require('fs');
const { runCapture, runOk } = require('../utils/exec');

class DatabaseDetector {
  constructor() {
    this.root = process.cwd();
  }

  async detect() {
    const result = {
      mysql: { installed: false, running: false, version: null },
      postgresql: { installed: false, running: false, version: null },
      mariadb: { installed: false, running: false, version: null },
      sqlite: { installed: false, running: false, version: null },
      redis: { installed: false, running: false, version: null },
      detected: null,
      connection: null
    };

    // Prefer .env signal first (fast, no process spawn)
    const envPath = path.join(this.root, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^DB_CONNECTION\s*=\s*(.+)$/m);
        if (match) {
          result.connection = match[1].trim().replace(/^["']|["']$/g, '');
          result.detected = result.connection;
        }
      } catch {
        // ignore
      }
    }

    const mysqlVersion = runCapture('mysql --version', { timeout: 1500 });
    if (mysqlVersion) {
      result.mysql.version = mysqlVersion;
      result.mysql.installed = true;
      // Skip ping by default — it often hangs on Windows services
      result.mysql.running = false;
    }

    const pgVersion = runCapture('psql --version', { timeout: 1500 });
    if (pgVersion) {
      result.postgresql.version = pgVersion.split('\n')[0].trim();
      result.postgresql.installed = true;
      result.postgresql.running = runOk('pg_isready', { timeout: 1000 });
    }

    const mariaVersion = runCapture('mariadb --version', { timeout: 1500 });
    if (mariaVersion) {
      result.mariadb.version = mariaVersion;
      result.mariadb.installed = true;
    }

    try {
      require.resolve('sqlite3');
      result.sqlite.installed = true;
      result.sqlite.running = true;
    } catch {
      // optional
    }

    const redisVersion = runCapture('redis-cli --version', { timeout: 1500 });
    if (redisVersion) {
      result.redis.version = redisVersion;
      result.redis.installed = true;
      result.redis.running = false;
    }

    return result;
  }
}

module.exports = DatabaseDetector;
