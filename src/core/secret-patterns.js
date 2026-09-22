/**
 * Secret detection rules shared by `flash-dev secure` and `flash-dev scan`.
 *
 * Every rule is evaluated against a SINGLE line. A rule may require a
 * `context` regex which must match that same line — never the whole file or
 * diff, which is what produced the historical false positives.
 */

/**
 * Verbatim sample credentials published in vendor documentation.
 * These are the ONLY values excused from a high-confidence structural rule —
 * a broad keyword filter there would hide real keys that happen to contain
 * a substring like "test".
 */
const DOCUMENTED_SAMPLES = [
  // Assembled rather than written literally: a structurally valid token in the
  // source tree trips GitHub push protection and other repository scanners,
  // even when the value is a published, inert documentation sample.
  ['AK', 'IA', 'IOSFODNN7EXAMPLE'].join(''),
  ['AS', 'IA', 'IOSFODNN7EXAMPLE'].join(''),
  ['wJalrXUtnFEMI', '/K7MDENG/', 'bPxRfiCYEXAMPLEKEY'].join(''),
  ['sk', '_test_', '4eC39HqLyjWDarjtT1zdp7dc'].join(''),
  ['pk', '_test_', 'TYooMQauvdEDq54NiTphI7jx'].join('')
];

/** Strings that look like secrets but are published placeholders. */
const PLACEHOLDER_VALUES = [
  'xxxxxxxx', 'yourkeyhere', 'your_api_key', 'your-api-key', 'changeme',
  'placeholder', 'example', 'dummy', 'sample', 'test', 'fake', 'redacted',
  '<your', 'insert_', 'todo', 'null', 'undefined', 'none'
];

/** Files whose content is expected to contain secret-shaped strings. */
const IGNORED_PATH_PATTERNS = [
  /(^|\/)\.env\.(example|sample|template|dist)$/i,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|bun\.lockb)$/i,
  /(^|\/)(CHANGELOG|README)\.md$/i,
  /\.(min\.js|min\.css|map|snap)$/i,
  /(^|\/)(node_modules|vendor|dist|build|coverage)\//
];

/** Inline escape hatch, mirroring gitleaks/detect-secrets conventions. */
const INLINE_ALLOW_RE = /flash-dev-ignore-secret|gitleaks:allow|pragma:\s*allowlist\s*secret/i;

const SECRET_RULES = [
  {
    name: 'Clé privée (PEM)',
    pattern: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED)?\s*PRIVATE KEY-----/,
    severity: 'critical'
  },
  {
    name: 'AWS Access Key ID',
    pattern: /\b(AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/,
    severity: 'critical'
  },
  {
    name: 'AWS Secret Access Key',
    // The 40-char shape alone is meaningless — the same line must name it.
    pattern: /\b[A-Za-z0-9/+=]{40}\b/,
    context: /aws.{0,20}(secret|access).{0,20}key|secret.{0,10}access.{0,10}key/i,
    severity: 'critical'
  },
  {
    name: 'Clé secrète Stripe',
    pattern: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{20,}\b/,
    severity: 'critical'
  },
  {
    name: 'Token GitHub',
    pattern: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/,
    severity: 'critical'
  },
  {
    name: 'Token GitLab',
    pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/,
    severity: 'critical'
  },
  {
    name: 'Clé API Google',
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/,
    severity: 'critical'
  },
  {
    name: 'Token Slack',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
    severity: 'critical'
  },
  {
    name: 'Token OpenAI / Anthropic',
    pattern: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,})\b/,
    severity: 'critical'
  },
  {
    name: 'Token npm',
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/,
    severity: 'critical'
  },
  {
    name: 'Webhook Slack / Discord',
    pattern: /https:\/\/(hooks\.slack\.com\/services|discord(app)?\.com\/api\/webhooks)\/[A-Za-z0-9/_-]{20,}/,
    severity: 'high'
  },
  {
    name: 'Token JWT',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    severity: 'high'
  },
  {
    name: 'URL de connexion avec mot de passe',
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s:@/]{3,}@[^\s/]+/i,
    severity: 'critical'
  },
  {
    name: 'Mot de passe en dur',
    pattern: /\b(password|passwd|pwd|db_password)\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
    severity: 'high',
    entropyTarget: true
  },
  {
    name: 'Clé API générique',
    pattern: /\b(api[_-]?key|apikey|access[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-./+=]{16,}['"]/i,
    severity: 'high',
    entropyTarget: true
  }
];

/**
 * Shannon entropy in bits per character — high for random keys, low for words.
 * @param {string} value
 * @returns {number}
 */
function shannonEntropy(value) {
  if (!value) return 0;

  const frequencies = new Map();
  for (const char of value) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * True when a matched value is an obvious placeholder rather than a real secret.
 * @param {string} value
 * @returns {boolean}
 */
function isPlaceholder(value) {
  const lower = value.toLowerCase();

  if (PLACEHOLDER_VALUES.some((token) => lower.includes(token))) return true;
  // Repeated single character: "aaaaaaaa", "00000000", "********"
  if (/^(.)\1+$/.test(value.replace(/['"]/g, ''))) return true;
  if (/^\$\{?[A-Z_][A-Z0-9_]*\}?$/.test(value)) return true; // ${VAR} / $VAR
  if (/^<[^>]+>$/.test(value)) return true; // <token>

  return false;
}

/**
 * Should this file be skipped entirely?
 * @param {string} filePath
 * @returns {boolean}
 */
function isIgnoredPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  return IGNORED_PATH_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Evaluate every rule against one line.
 * @param {string} line
 * @param {object} [options]
 * @param {number} [options.minEntropy=3] entropy floor for entropyTarget rules
 * @returns {Array<{rule: string, severity: string, match: string}>}
 */
function matchLine(line, options = {}) {
  const findings = [];

  if (!line || INLINE_ALLOW_RE.test(line)) return findings;

  const minEntropy = options.minEntropy ?? 3;

  for (const rule of SECRET_RULES) {
    if (rule.context && !rule.context.test(line)) continue;

    const match = rule.pattern.exec(line);
    if (!match) continue;

    const value = match[0];

    // Structural rules (AWS/Stripe/GitHub shapes) are high confidence: only a
    // documented sample credential is excused, never a keyword match.
    if (DOCUMENTED_SAMPLES.includes(value)) continue;

    if (rule.entropyTarget) {
      if (isPlaceholder(value)) continue;
      const quoted = /['"]([^'"]+)['"]\s*$/.exec(value) || /['"]([^'"]+)['"]/.exec(value);
      const secretPart = quoted ? quoted[1] : value;
      if (isPlaceholder(secretPart)) continue;
      if (shannonEntropy(secretPart) < minEntropy) continue;
    }

    findings.push({
      rule: rule.name,
      severity: rule.severity,
      match: value
    });
  }

  return findings;
}

/**
 * Mask a secret so the report never reprints it in full.
 * @param {string} value
 * @returns {string}
 */
function redact(value) {
  const text = String(value);
  if (text.length <= 12) return `${text.slice(0, 2)}${'*'.repeat(Math.max(text.length - 2, 1))}`;
  return `${text.slice(0, 4)}${'*'.repeat(8)}${text.slice(-4)}`;
}

module.exports = {
  SECRET_RULES,
  DOCUMENTED_SAMPLES,
  INLINE_ALLOW_RE,
  matchLine,
  shannonEntropy,
  isPlaceholder,
  isIgnoredPath,
  redact
};
