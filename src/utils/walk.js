const fs = require('fs');
const path = require('path');

const DEFAULT_SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'vendor', 'dist', 'build',
  '.next', '.nuxt', 'coverage', '.cache', '.turbo', '__pycache__',
  'venv', '.venv', '.flash-dev-backup', '.idea', '.vscode'
]);

const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;

const IGNORE_FILE = '.flashdevignore';

/**
 * Translate one gitignore-style pattern into a RegExp matched against a
 * repository-relative POSIX path.
 * @param {string} pattern
 * @returns {RegExp|null}
 */
function compileIgnorePattern(pattern) {
  let clean = pattern.trim();
  if (!clean || clean.startsWith('#')) return null;

  const anchored = clean.startsWith('/');
  if (anchored) clean = clean.slice(1);

  const dirOnly = clean.endsWith('/');
  if (dirOnly) clean = clean.slice(0, -1);
  if (!clean) return null;

  const body = clean
    .replace(/[.+^$(){}|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*')
    .replace(/\?/g, '[^/]');

  const prefix = anchored ? '^' : '(^|.*/)';
  const suffix = dirOnly ? '(/.*)?$' : '(/.*)?$';

  try {
    return new RegExp(`${prefix}${body}${suffix}`);
  } catch {
    return null;
  }
}

/**
 * Load ignore rules from `<root>/.flashdevignore`.
 * @param {string} rootDir
 * @returns {RegExp[]}
 */
function loadIgnoreRules(rootDir) {
  try {
    const content = fs.readFileSync(path.join(rootDir, IGNORE_FILE), 'utf8');
    return content
      .split(/\r?\n/)
      .map(compileIgnorePattern)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Cheap binary sniff: a NUL byte in the first block means "not text".
 * @param {string} filePath
 * @returns {boolean}
 */
function isBinaryFile(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } catch {
    return true;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* already closed */ }
    }
  }
}

/**
 * Recursively yield text file paths, skipping heavy and generated directories.
 * @param {string} dir
 * @param {object} [options]
 * @param {Set<string>} [options.skipDirs]
 * @param {number} [options.maxFileBytes]
 * @param {string[]} [options.extensions] restrict to these extensions
 * @returns {Generator<string>}
 */
function* walkFiles(dir, options = {}) {
  const rootDir = options.rootDir || dir;
  const ignoreRules = options.ignoreRules || loadIgnoreRules(rootDir);
  const childOptions = { ...options, rootDir, ignoreRules };

  const skipDirs = options.skipDirs || DEFAULT_SKIP_DIRS;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const extensions = options.extensions || null;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

    if (entry.isSymbolicLink()) continue;
    if (ignoreRules.some((rule) => rule.test(relativePath))) continue;

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      yield* walkFiles(fullPath, childOptions);
      continue;
    }

    if (!entry.isFile()) continue;
    if (extensions && !extensions.includes(path.extname(entry.name))) continue;

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stats.size > maxFileBytes) continue;
    if (isBinaryFile(fullPath)) continue;

    yield fullPath;
  }
}

module.exports = { walkFiles, isBinaryFile, loadIgnoreRules, compileIgnorePattern, DEFAULT_SKIP_DIRS, IGNORE_FILE };
