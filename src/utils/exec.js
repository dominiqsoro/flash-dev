const { spawnSync } = require('child_process');

const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Split a legacy "cmd arg arg" string into argv, honouring quoted segments.
 * Only used by the compatibility wrappers below; new code passes argv directly.
 * @param {string} command
 * @returns {string[]}
 */
function tokenize(command) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;

  while ((match = re.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
}

/**
 * Core primitive: run a binary with a discrete argv array.
 * No shell is spawned, so arguments can never be re-interpreted as syntax.
 * @param {string} file
 * @param {string[]} [args]
 * @param {object} [options]
 * @returns {{ok: boolean, status: number|null, stdout: string, stderr: string, error: Error|null}}
 */
function run(file, args = [], options = {}) {
  const { capture = true, timeout = DEFAULT_TIMEOUT_MS, ...rest } = options;

  const result = spawnSync(file, args, {
    encoding: 'utf-8',
    timeout,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    ...rest,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
    error: result.error || null
  };
}

/**
 * Run a command and return trimmed stdout, or null when it fails.
 * @param {string} file
 * @param {string[]} [args]
 * @param {object} [options]
 * @returns {string|null}
 */
function capture(file, args = [], options = {}) {
  const result = run(file, args, options);
  return result.ok ? result.stdout.trim() : null;
}

/**
 * Run a command for its exit code only.
 * @param {string} file
 * @param {string[]} [args]
 * @param {object} [options]
 * @returns {boolean}
 */
function ok(file, args = [], options = {}) {
  return run(file, args, options).ok;
}

/**
 * Run a command with the parent stdio attached (interactive/long-running).
 * @param {string} file
 * @param {string[]} [args]
 * @param {object} [options]
 * @returns {{ok: boolean, status: number|null}}
 */
function inherit(file, args = [], options = {}) {
  const result = run(file, args, { ...options, capture: false, timeout: options.timeout ?? 0 });
  return { ok: result.ok, status: result.status };
}

/**
 * Compatibility wrapper for the historical string API.
 * The string is tokenized, never handed to a shell.
 * @param {string} command
 * @param {object} [options]
 * @returns {string|null}
 */
function runCapture(command, options = {}) {
  const [file, ...args] = tokenize(command);
  if (!file) return null;
  return capture(file, args, options);
}

/**
 * Compatibility wrapper for the historical string API.
 * @param {string} command
 * @param {object} [options]
 * @returns {boolean}
 */
function runOk(command, options = {}) {
  const [file, ...args] = tokenize(command);
  if (!file) return false;
  return ok(file, args, options);
}

module.exports = {
  run,
  capture,
  ok,
  inherit,
  tokenize,
  runCapture,
  runOk,
  DEFAULT_TIMEOUT_MS
};
