const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 4000;
const IS_WINDOWS = process.platform === 'win32';

/**
 * On Windows, npm/npx/yarn/pnpm/composer are .cmd or .bat wrappers, not .exe.
 * Node refuses to spawn those without a shell (CVE-2024-27980), so they must
 * go through cmd.exe — with every argument quoted by us rather than by the
 * shell, so a metacharacter in an argument can never become syntax.
 */
const WINDOWS_BATCH_EXT = new Set(['.cmd', '.bat']);

/**
 * Resolve a bare command name to a concrete executable on Windows,
 * walking PATH and PATHEXT the way the shell would.
 * @param {string} file
 * @returns {string|null} absolute path, or null when unresolved
 */
function resolveWindowsExecutable(file) {
  if (path.extname(file)) {
    return fs.existsSync(file) ? file : null;
  }

  const extensions = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean);
  const directories = (process.env.PATH || '').split(path.delimiter).filter(Boolean);

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.join(directory, file + extension);
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        // Unreadable PATH entry: keep looking
      }
    }
  }

  return null;
}

/**
 * Quote one argument for cmd.exe.
 * Wrapping in double quotes neutralises spaces and shell metacharacters;
 * the caret escapes the few characters cmd still expands inside quotes.
 * @param {string} argument
 * @returns {string}
 */
function quoteForCmd(argument) {
  const text = String(argument);
  const escaped = text
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\*)$/, '$1$1');

  return `"${escaped}"`.replace(/[\^&|<>]/g, '^$&');
}

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

  let target = file;
  let targetArgs = args;
  let useShell = false;

  if (IS_WINDOWS) {
    const resolved = resolveWindowsExecutable(file);

    if (resolved && WINDOWS_BATCH_EXT.has(path.extname(resolved).toLowerCase())) {
      // Batch wrapper: route through cmd.exe with arguments we quote ourselves
      const commandLine = [resolved, ...args].map(quoteForCmd).join(' ');
      target = process.env.COMSPEC || 'cmd.exe';
      targetArgs = ['/d', '/s', '/c', `"${commandLine}"`];
      useShell = false;
      rest.windowsVerbatimArguments = true;
    } else if (resolved) {
      target = resolved;
    }
  }

  const result = spawnSync(target, targetArgs, {
    encoding: 'utf-8',
    timeout,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    ...rest,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: useShell
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
  resolveWindowsExecutable,
  quoteForCmd,
  capture,
  ok,
  inherit,
  tokenize,
  runCapture,
  runOk,
  DEFAULT_TIMEOUT_MS
};
