const pc = require('picocolors');
const prompts = require('prompts');
const { capture, run } = require('../utils/exec');

/** Ports developers hit most often, annotated for the overview. */
const WELL_KNOWN = {
  3000: 'Next.js / React / Express',
  3001: 'Next.js (port alternatif)',
  4200: 'Angular',
  5000: 'Flask / .NET',
  5173: 'Vite',
  5432: 'PostgreSQL',
  6379: 'Redis',
  8000: 'Django / Laravel',
  8080: 'Tomcat / proxy HTTP',
  8443: 'HTTPS alternatif',
  9000: 'PHP-FPM / SonarQube',
  27017: 'MongoDB',
  3306: 'MySQL / MariaDB'
};

/**
 * Parse `lsof -nP -iTCP -sTCP:LISTEN` output.
 * @param {string} output
 * @returns {Array<object>}
 */
function parseLsof(output) {
  const entries = [];

  for (const line of output.split(/\r?\n/).slice(1)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 9) continue;

    const address = columns[8];
    const portMatch = /:(\d+)$/.exec(address);
    if (!portMatch) continue;

    entries.push({
      port: parseInt(portMatch[1], 10),
      pid: parseInt(columns[1], 10),
      process: columns[0],
      address: address.replace(/:\d+$/, '') || '*'
    });
  }

  return entries;
}

/**
 * Parse `ss -tlnp` output.
 * @param {string} output
 * @returns {Array<object>}
 */
function parseSs(output) {
  const entries = [];

  for (const line of output.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;

    const portMatch = /(?:^|\s)(\S+):(\d+)\s+\S+:\S+/.exec(line);
    if (!portMatch) continue;

    const processMatch = /users:\(\("([^"]+)",pid=(\d+)/.exec(line);

    entries.push({
      port: parseInt(portMatch[2], 10),
      pid: processMatch ? parseInt(processMatch[2], 10) : null,
      process: processMatch ? processMatch[1] : 'inconnu',
      address: portMatch[1]
    });
  }

  return entries;
}

/**
 * Parse `netstat -ano` output (Windows).
 * @param {string} output
 * @returns {Array<object>}
 */
function parseNetstat(output) {
  const entries = [];

  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[0] !== 'TCP') continue;
    if (!/LISTENING/i.test(columns[3])) continue;

    const portMatch = /:(\d+)$/.exec(columns[1]);
    if (!portMatch) continue;

    entries.push({
      port: parseInt(portMatch[1], 10),
      pid: parseInt(columns[4], 10),
      process: 'inconnu',
      address: columns[1].replace(/:\d+$/, '')
    });
  }

  return entries;
}

/**
 * List listening TCP sockets using whichever tool the platform provides.
 * @returns {Array<{port: number, pid: number|null, process: string, address: string}>}
 */
function listListeningPorts() {
  if (process.platform === 'win32') {
    const output = capture('netstat', ['-ano'], { timeout: 10000 });
    return output ? parseNetstat(output) : [];
  }

  const lsof = capture('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeout: 10000 });
  if (lsof) return parseLsof(lsof);

  const ss = capture('ss', ['-tlnp'], { timeout: 10000 });
  if (ss) return parseSs(ss);

  const netstat = capture('netstat', ['-tlnp'], { timeout: 10000 });
  if (netstat) return parseSs(netstat);

  return [];
}

/**
 * Resolve a process command line for extra context.
 * @param {number} pid
 * @returns {string|null}
 */
function describeProcess(pid) {
  if (!pid) return null;

  if (process.platform === 'win32') {
    return capture('tasklist', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV'], { timeout: 5000 });
  }

  return capture('ps', ['-o', 'args=', '-p', String(pid)], { timeout: 5000 });
}

function terminate(pid, signal) {
  if (process.platform === 'win32') {
    return run('taskkill', signal === 'SIGKILL' ? ['/F', '/PID', String(pid)] : ['/PID', String(pid)], {
      timeout: 5000
    }).ok;
  }

  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * flash-dev ports [port]
 * Without an argument: overview of every listening TCP port.
 * With a port: identify the holder and offer to free it.
 * @param {string} [portArg]
 * @param {object} [options]
 * @returns {Promise<number>} exit code
 */
async function portsCommand(portArg, options = {}) {
  const asJson = Boolean(options.json);

  if (!asJson) {
    console.log(pc.cyan('\n🔌 flash-dev ports - Inspection des ports TCP en écoute\n'));
  }

  const entries = listListeningPorts();

  if (entries.length === 0 && !asJson) {
    console.log(pc.yellow('Aucun port en écoute détecté.'));
    console.log(pc.gray('(lsof, ss ou netstat est requis pour l\'inspection.)\n'));
    return 0;
  }

  // ---- Targeted mode -------------------------------------------------------
  if (portArg !== undefined && portArg !== null && portArg !== '') {
    const port = parseInt(portArg, 10);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.log(pc.red(`Port invalide: "${portArg}" (attendu: 1-65535)\n`));
      process.exitCode = 1;
      return 1;
    }

    const holders = entries.filter((entry) => entry.port === port);

    if (asJson) {
      console.log(JSON.stringify({ port, free: holders.length === 0, holders }, null, 2));
      return 0;
    }

    if (holders.length === 0) {
      console.log(pc.green(`✅ Le port ${port} est libre.\n`));
      return 0;
    }

    console.log(pc.yellow(`Le port ${port} est occupé :\n`));
    for (const holder of holders) {
      console.log(pc.gray(`  PID ${holder.pid ?? '?'}  ${holder.process}  (${holder.address})`));
      const description = describeProcess(holder.pid);
      if (description) {
        const summary = description.trim().split('\n')[0];
        console.log(pc.gray(`    ${summary.length > 100 ? `${summary.slice(0, 97)}…` : summary}`));
      }
    }

    const killable = holders.filter((holder) => holder.pid && holder.pid !== process.pid);
    if (killable.length === 0) {
      console.log(pc.yellow('\nImpossible d\'identifier un PID à arrêter (droits insuffisants ?).\n'));
      return 0;
    }

    if (!options.yes) {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Libérer le port ${port} en arrêtant ${killable.length} processus ?`,
        initial: false
      });

      if (!confirm) {
        console.log(pc.yellow('\nOpération annulée.\n'));
        return 0;
      }
    }

    for (const holder of killable) {
      terminate(holder.pid, 'SIGTERM');
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    let freed = 0;
    for (const holder of killable) {
      if (isAlive(holder.pid)) {
        terminate(holder.pid, 'SIGKILL');
      }
      if (!isAlive(holder.pid)) freed += 1;
    }

    console.log(
      freed === killable.length
        ? pc.green(`\n✅ Port ${port} libéré.\n`)
        : pc.yellow(`\n⚠️  ${freed}/${killable.length} processus arrêté(s) — droits insuffisants ?\n`)
    );

    return 0;
  }

  // ---- Overview mode -------------------------------------------------------
  const sorted = [...entries].sort((a, b) => a.port - b.port);

  if (asJson) {
    console.log(JSON.stringify({ count: sorted.length, ports: sorted }, null, 2));
    return 0;
  }

  console.log(pc.bold('  PORT     PID       PROCESSUS            USAGE COURANT'));
  console.log(pc.gray('  ' + '-'.repeat(70)));

  const seen = new Set();
  for (const entry of sorted) {
    const key = `${entry.port}:${entry.pid}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const hint = WELL_KNOWN[entry.port] || '';
    console.log(
      `  ${String(entry.port).padEnd(8)} ${String(entry.pid ?? '?').padEnd(9)} ` +
      `${entry.process.slice(0, 20).padEnd(20)} ${pc.gray(hint)}`
    );
  }

  console.log(pc.cyan(`\n${seen.size} port(s) en écoute.`));
  console.log(pc.gray('Libérer un port : flash-dev ports 3000\n'));

  return 0;
}

module.exports = portsCommand;
module.exports.listListeningPorts = listListeningPorts;
module.exports.parseLsof = parseLsof;
module.exports.parseSs = parseSs;
module.exports.parseNetstat = parseNetstat;
