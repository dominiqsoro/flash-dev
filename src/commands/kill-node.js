const os = require('os');
const pc = require('picocolors');
const prompts = require('prompts');
const { run, capture } = require('../utils/exec');

/**
 * Processes that are almost never "ghosts": killing them breaks the user's
 * editor, language server or the very shell running flash-dev.
 */
const PROTECTED_PATTERNS = [
  /vscode-server|vscode|code-server|cursor|windsurf/i,
  /language-server|tsserver|typescript-language|eslint-server/i,
  /electron/i,
  /claude|copilot/i,
  /pm2|systemd/i
];

/**
 * Collect every ancestor PID of the current process, so we never kill the
 * terminal, the npm wrapper or the shell that launched us.
 * @returns {Set<number>}
 */
function collectAncestors() {
  const ancestors = new Set([process.pid]);

  if (process.platform === 'win32') {
    if (process.ppid) ancestors.add(process.ppid);
    return ancestors;
  }

  let pid = process.ppid;
  let guard = 0;

  while (pid && pid > 1 && guard < 32) {
    ancestors.add(pid);
    const parent = capture('ps', ['-o', 'ppid=', '-p', String(pid)], { timeout: 2000 });
    const parsed = parseInt((parent || '').trim(), 10);
    if (!parsed || parsed === pid) break;
    pid = parsed;
    guard += 1;
  }

  return ancestors;
}

/**
 * List candidate Node processes with their command line.
 * @returns {Array<{pid: number, command: string}>}
 */
function listNodeProcesses() {
  if (process.platform === 'win32') {
    const output = capture('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'" | ForEach-Object { "$($_.ProcessId)|$($_.CommandLine)" }'
    ], { timeout: 8000 });

    if (!output) return [];

    return output
      .split(/\r?\n/)
      .map((line) => {
        const [pid, ...rest] = line.split('|');
        return { pid: parseInt(pid, 10), command: rest.join('|').trim() };
      })
      .filter((entry) => Number.isInteger(entry.pid));
  }

  const output = capture('ps', ['-eo', 'pid=,args='], { timeout: 5000 });
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => {
      const match = /^\s*(\d+)\s+(.*)$/.exec(line);
      if (!match) return null;
      return { pid: parseInt(match[1], 10), command: match[2].trim() };
    })
    .filter((entry) => entry && /(^|\/)node( |$)|(^|\/)node$/.test(entry.command));
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
 * flash-dev kill-node — terminate stray Node processes, with review and consent.
 * @param {object} [options]
 * @param {boolean} [options.yes] skip the confirmation prompt
 * @param {boolean} [options.all] include processes normally protected
 * @returns {Promise<number>} exit code
 */
async function killNodeCommand(options = {}) {
  console.log(pc.cyan('\n⚙️  Recherche de processus Node.js orphelins\n'));

  const ancestors = collectAncestors();
  const all = listNodeProcesses();

  const candidates = all.filter((proc) => {
    if (ancestors.has(proc.pid)) return false;
    if (options.all) return true;
    return !PROTECTED_PATTERNS.some((pattern) => pattern.test(proc.command));
  });

  const protectedCount = all.length - candidates.length - ancestors.size;

  if (candidates.length === 0) {
    console.log(pc.green('✨ Aucun processus Node.js à arrêter.'));
    if (protectedCount > 0) {
      console.log(pc.gray(`   ${protectedCount} processus protégé(s) ignoré(s) (éditeur, LSP, …).`));
      console.log(pc.gray('   Utilisez --all pour les inclure.'));
    }
    console.log();
    return 0;
  }

  console.log(pc.yellow(`${candidates.length} processus candidat(s) :\n`));
  for (const proc of candidates) {
    const summary = proc.command.length > 90 ? `${proc.command.slice(0, 87)}…` : proc.command;
    console.log(pc.gray(`  PID ${String(proc.pid).padEnd(8)} ${summary}`));
  }

  if (protectedCount > 0) {
    console.log(pc.gray(`\n  ${protectedCount} processus protégé(s) exclu(s) (éditeur, LSP, …).`));
  }

  console.log(pc.yellow('\n⚠️  Un serveur de dev ou un watcher en cours sera interrompu.'));

  if (!options.yes) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Arrêter ces ${candidates.length} processus ?`,
      initial: false
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return 0;
    }
  }

  // Graceful first: SIGTERM lets a dev server flush and close its sockets.
  console.log(pc.yellow('\nArrêt en douceur (SIGTERM)...'));
  const stillRunning = [];

  for (const proc of candidates) {
    terminate(proc.pid, 'SIGTERM');
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  for (const proc of candidates) {
    if (isAlive(proc.pid)) stillRunning.push(proc);
  }

  let forced = 0;
  if (stillRunning.length > 0) {
    console.log(pc.yellow(`${stillRunning.length} processus résistant(s) — SIGKILL...`));
    for (const proc of stillRunning) {
      if (terminate(proc.pid, 'SIGKILL')) forced += 1;
    }
  }

  const stopped = candidates.length - stillRunning.length + forced;
  console.log(pc.green(`\n✨ ${stopped}/${candidates.length} processus arrêté(s).`));

  const freed = Math.round(os.freemem() / 1024 / 1024);
  console.log(pc.gray(`   RAM libre : ${freed} Mo\n`));

  return 0;
}

module.exports = killNodeCommand;
module.exports.listNodeProcesses = listNodeProcesses;
