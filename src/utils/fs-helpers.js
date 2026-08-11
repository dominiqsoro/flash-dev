const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Format bytes into a human-readable size string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Recursively compute directory size in bytes.
 * @param {string} dirPath
 * @returns {Promise<number>}
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  async function walk(currentPath) {
    try {
      const stats = await fs.stat(currentPath);

      if (stats.isDirectory()) {
        const entries = await fs.readdir(currentPath);
        for (const entry of entries) {
          await walk(path.join(currentPath, entry));
        }
      } else if (stats.isFile()) {
        totalSize += stats.size;
      }
    } catch {
      // Ignore inaccessible paths
    }
  }

  await walk(dirPath);
  return totalSize;
}

/**
 * Recursively delete a directory.
 * @param {string} dirPath
 * @returns {Promise<boolean>}
 */
async function deleteDirectory(dirPath) {
  try {
    if (!fsSync.existsSync(dirPath)) return false;
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether a path is older than N days (default 90).
 * @param {string} dirPath
 * @param {number} [days=90]
 * @returns {Promise<boolean>}
 */
async function isOlderThan(dirPath, days = 90) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.mtimeMs < Date.now() - days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

module.exports = {
  formatBytes,
  getDirectorySize,
  deleteDirectory,
  isOlderThan
};
