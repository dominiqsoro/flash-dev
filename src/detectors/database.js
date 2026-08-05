

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

    
    try {
      result.mysql.version = execSync('mysql --version', { stdio: 'pipe' }).trim();
      result.mysql.installed = true;
      try {
        execSync('mysqladmin ping', { stdio: 'pipe' });
        result.mysql.running = true;
      } catch (error) {}
    } catch (error) {}

    
    try {
      result.postgresql.version = execSync('psql --version', { stdio: 'pipe' }).split('\n')[0].trim();
      result.postgresql.installed = true;
      try {
        execSync('pg_isready', { stdio: 'pipe' });
        result.postgresql.running = true;
      } catch (error) {}
    } catch (error) {}

    
    try {
      result.mariadb.version = execSync('mariadb --version', { stdio: 'pipe' }).trim();
      result.mariadb.installed = true;
    } catch (error) {}

    
    try {
      require('sqlite3');
      result.sqlite.installed = true;
      result.sqlite.running = true;
    } catch (error) {}

    
    try {
      result.redis.version = execSync('redis-cli --version', { stdio: 'pipe' }).trim();
      result.redis.installed = true;
      try {
        execSync('redis-cli ping', { stdio: 'pipe' });
        result.redis.running = true;
      } catch (error) {}
    } catch (error) {}

    
    const envPath = path.join(this.root, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const dbConnection = envContent.match(/DB_CONNECTION=(\w+)/i);
        if (dbConnection) {
          result.detected = dbConnection[1].toLowerCase();
          
          
          if (result.detected === 'mysql' && result.mysql.running) {
            result.connection = 'configured';
          } else if (result.detected === 'pgsql' && result.postgresql.running) {
            result.connection = 'configured';
          } else if (result.detected === 'sqlite') {
            result.connection = 'configured';
          }
        }
      } catch (error) {}
    }

    return result;
  }
}

module.exports = DatabaseDetector;
