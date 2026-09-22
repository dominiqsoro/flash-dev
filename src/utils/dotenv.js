const fs = require('fs');

/**
 * Parse a .env file body into a plain object.
 * Handles quoted values, `export` prefixes, inline comments and escapes.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseEnv(content) {
  const result = {};
  if (!content) return result;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = withoutExport.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = withoutExport.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue;

    let value = withoutExport.slice(separatorIndex + 1).trim();

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
      }
    } else {
      // Unquoted values end at the first inline comment
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();
    }

    result[key] = value;
  }

  return result;
}

/**
 * Read and parse a .env file from disk.
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function readEnvFile(filePath) {
  try {
    return parseEnv(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = { parseEnv, readEnvFile };
