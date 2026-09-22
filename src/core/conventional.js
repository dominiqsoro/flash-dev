/**
 * Conventional Commits parsing and validation.
 * Shared by `flash-dev hooks` (commit-msg) and `flash-dev changelog`.
 * Spec: https://www.conventionalcommits.org/en/v1.0.0/
 */

const COMMIT_TYPES = {
  feat: { label: 'Fonctionnalités', emoji: '✨', bump: 'minor', order: 1 },
  fix: { label: 'Corrections', emoji: '🐛', bump: 'patch', order: 2 },
  perf: { label: 'Performances', emoji: '⚡', bump: 'patch', order: 3 },
  refactor: { label: 'Refactoring', emoji: '♻️', bump: 'patch', order: 4 },
  docs: { label: 'Documentation', emoji: '📚', bump: null, order: 5 },
  test: { label: 'Tests', emoji: '🧪', bump: null, order: 6 },
  build: { label: 'Build', emoji: '📦', bump: null, order: 7 },
  ci: { label: 'Intégration continue', emoji: '🤖', bump: null, order: 8 },
  style: { label: 'Style', emoji: '💄', bump: null, order: 9 },
  chore: { label: 'Maintenance', emoji: '🔧', bump: null, order: 10 },
  revert: { label: 'Reverts', emoji: '⏪', bump: 'patch', order: 11 }
};

const HEADER_RE = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s(?<subject>.+)$/;

const MAX_SUBJECT_LENGTH = 72;

/** Prefixes Git itself produces; they must never be rejected by a hook. */
const AUTO_GENERATED_RE = /^(Merge |Revert |fixup! |squash! |Applied? |Initial commit$)/;

/**
 * Parse a commit message into its Conventional Commits parts.
 * @param {string} message full commit message (header + body)
 * @returns {{valid: boolean, type: string|null, scope: string|null, subject: string|null,
 *            breaking: boolean, header: string, body: string, errors: string[]}}
 */
function parseCommit(message) {
  const text = String(message || '');
  // Strip comment lines that git adds to the message template
  const lines = text.split(/\r?\n/).filter((line) => !line.startsWith('#'));
  const header = (lines[0] || '').trim();
  const body = lines.slice(1).join('\n').trim();

  const result = {
    valid: false,
    type: null,
    scope: null,
    subject: null,
    breaking: false,
    header,
    body,
    errors: []
  };

  if (!header) {
    result.errors.push('Le message de commit est vide.');
    return result;
  }

  if (AUTO_GENERATED_RE.test(header)) {
    result.valid = true;
    result.type = 'chore';
    result.subject = header;
    return result;
  }

  const match = HEADER_RE.exec(header);

  if (!match) {
    result.errors.push(
      'Format attendu: <type>(<scope>): <description>  —  ex: feat(auth): add refresh token'
    );
    return result;
  }

  const { type, scope, breaking, subject } = match.groups;

  result.type = type;
  result.scope = scope || null;
  result.subject = subject;
  result.breaking = Boolean(breaking) || /^BREAKING[ -]CHANGE:/m.test(body);

  if (!COMMIT_TYPES[type]) {
    result.errors.push(
      `Type "${type}" inconnu. Types autorisés: ${Object.keys(COMMIT_TYPES).join(', ')}`
    );
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    result.errors.push(
      `Description trop longue (${subject.length} > ${MAX_SUBJECT_LENGTH} caractères).`
    );
  }

  if (/\.$/.test(subject)) {
    result.errors.push('La description ne doit pas se terminer par un point.');
  }

  if (/^[A-Z][a-z]/.test(subject)) {
    result.errors.push('La description doit commencer par une minuscule.');
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Semver bump implied by a set of commits.
 * @param {Array<{type: string, breaking: boolean}>} commits
 * @returns {'major'|'minor'|'patch'|null}
 */
function inferBump(commits) {
  let bump = null;

  for (const commit of commits) {
    if (commit.breaking) return 'major';

    const rule = COMMIT_TYPES[commit.type];
    if (!rule || !rule.bump) continue;

    if (rule.bump === 'minor') bump = 'minor';
    else if (rule.bump === 'patch' && bump !== 'minor') bump = 'patch';
  }

  return bump;
}

/**
 * Apply a semver bump to a version string.
 * @param {string} version e.g. "3.0.1"
 * @param {'major'|'minor'|'patch'} bump
 * @returns {string}
 */
function bumpVersion(version, bump) {
  const [major, minor, patch] = String(version)
    .split('.')
    .map((part) => parseInt(part, 10) || 0);

  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

module.exports = {
  COMMIT_TYPES,
  MAX_SUBJECT_LENGTH,
  parseCommit,
  inferBump,
  bumpVersion
};
