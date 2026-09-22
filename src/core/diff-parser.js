/**
 * Minimal unified-diff parser.
 *
 * Yields only ADDED lines with their real position in the new file, so a
 * report can point at `src/app.js:42` instead of an offset inside the diff,
 * and so removing a leaked secret is never flagged as adding one.
 */

const HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

/**
 * @typedef {{file: string, line: number, content: string}} AddedLine
 */

/**
 * Extract added lines from a unified diff.
 * @param {string} diff
 * @returns {AddedLine[]}
 */
function parseAddedLines(diff) {
  if (!diff) return [];

  const added = [];
  let currentFile = null;
  let newLineNumber = 0;

  for (const rawLine of diff.split('\n')) {
    if (rawLine.startsWith('diff --git ')) {
      currentFile = null;
      continue;
    }

    if (rawLine.startsWith('+++ ')) {
      const target = rawLine.slice(4).trim();
      currentFile = target === '/dev/null' ? null : target.replace(/^b\//, '');
      continue;
    }

    if (rawLine.startsWith('--- ')) continue;

    const hunk = HUNK_RE.exec(rawLine);
    if (hunk) {
      newLineNumber = parseInt(hunk[1], 10);
      continue;
    }

    if (!currentFile) continue;

    if (rawLine.startsWith('+')) {
      added.push({
        file: currentFile,
        line: newLineNumber,
        content: rawLine.slice(1)
      });
      newLineNumber += 1;
    } else if (rawLine.startsWith('-')) {
      // Removed line: consumes no position in the new file.
      continue;
    } else if (rawLine.startsWith('\\')) {
      // "\ No newline at end of file"
      continue;
    } else {
      // Context line
      newLineNumber += 1;
    }
  }

  return added;
}

/**
 * List the files touched by a diff.
 * @param {string} diff
 * @returns {string[]}
 */
function parseChangedFiles(diff) {
  if (!diff) return [];

  const files = new Set();
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4).trim();
      if (target !== '/dev/null') files.add(target.replace(/^b\//, ''));
    }
  }

  return [...files];
}

module.exports = { parseAddedLines, parseChangedFiles };
