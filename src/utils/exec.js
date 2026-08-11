const { execSync } = require('child_process');

const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Run a shell command with timeout and UTF-8 capture.
 * Returns trimmed stdout, or null on failure/timeout.
 * @param {string} command
 * @param {object} [options]
 * @returns {string|null}
 */
function runCapture(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      windowsHide: true,
      ...options,
      // Keep encoding/stdio authoritative
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Run a command for side effects / exit code only.
 * @param {string} command
 * @param {object} [options]
 * @returns {boolean}
 */
function runOk(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'ignore',
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      windowsHide: true,
      ...options,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  runCapture,
  runOk,
  DEFAULT_TIMEOUT_MS
};
