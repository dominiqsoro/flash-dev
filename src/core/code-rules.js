/**
 * Static analysis rules for `flash-dev scan`.
 *
 * Design constraints learned from the previous engine:
 *  - No /g flag. A global regex keeps `lastIndex` between calls, which made
 *    `.test()` in a loop skip every second occurrence.
 *  - Every rule must describe a plausible exploit, not a syntax shape.
 *    "String concatenation" is not SQL injection.
 */

/**
 * SQL shapes that cannot be confused with ordinary JavaScript.
 * A bare `JOIN` is deliberately absent: it matched `array.join(', ')`, which
 * made every template literal in the codebase a "critical SQL injection".
 */
const SQL_KEYWORDS =
  /\bSELECT\b[\s\S]*\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b[\s\S]*\bSET\b|\bDELETE\s+FROM\b|\bDROP\s+TABLE\b|\bWHERE\b\s|\b(INNER|LEFT|RIGHT|FULL|OUTER|CROSS)\s+JOIN\b/i;

/** Method calls whose name collides with a SQL keyword. */
const SQL_LOOKALIKE = /\.\s*(join|update|select|delete|where|insert)\s*\(/i;

const CODE_RULES = [
  {
    id: 'sql-injection',
    name: 'Concaténation dans une requête SQL',
    severity: 'critical',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.php', '.py', '.rb'],
    // Interpolation or concatenation inside a string that actually looks like SQL
    test: (line) => {
      if (!SQL_KEYWORDS.test(line)) return false;
      // `rows.join(', ')` / `store.update(...)` are not queries
      if (SQL_LOOKALIKE.test(line) && !/['"`][^'"`]*\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(line)) {
        return false;
      }
      return (
        /\$\{[^}]+\}/.test(line) ||
        /['"]\s*\+\s*(?!['"])\w/.test(line) ||
        /\.\s*format\s*\(/.test(line) ||
        /%s/.test(line)
      );
    },
    explain: 'Une valeur dynamique est injectée dans une requête SQL.',
    fix: 'Utilisez des requêtes paramétrées (placeholders ?/$1) ou un ORM.'
  },
  {
    id: 'shell-injection',
    name: 'Interpolation dans une commande shell',
    severity: 'critical',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    test: (line) =>
      /\b(execSync|execFileSync|exec|spawnSync|spawn)\s*\(\s*[`'"]/.test(line) &&
      (/\$\{[^}]+\}/.test(line) || /['"]\s*\+\s*(?!['"])\w/.test(line)),
    explain: 'Une valeur dynamique est concaténée dans une commande shell.',
    fix: 'Passez les arguments en tableau argv (spawnSync(cmd, [args])) sans shell.'
  },
  {
    id: 'eval-usage',
    name: 'Exécution dynamique de code',
    severity: 'high',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    test: (line) => /(^|[^\w.])eval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line),
    explain: 'eval() / new Function() exécute une chaîne comme du code.',
    fix: 'Utilisez JSON.parse, une table de correspondance ou un module dédié.'
  },
  {
    id: 'weak-crypto',
    name: 'Algorithme de hachage obsolète',
    severity: 'high',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.php', '.py'],
    test: (line) => /createHash\s*\(\s*['"](md5|sha1)['"]/i.test(line) || /\b(md5|sha1)\s*\(/i.test(line),
    explain: 'MD5 et SHA-1 sont cassés pour tout usage de sécurité.',
    fix: 'Utilisez SHA-256 pour l\'intégrité, bcrypt/argon2 pour les mots de passe.'
  },
  {
    id: 'insecure-random',
    name: 'Aléa non cryptographique pour un secret',
    severity: 'high',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    test: (line) =>
      /Math\.random\s*\(\)/.test(line) &&
      /\b(token|secret|password|salt|nonce|otp|session|key|uuid)\b/i.test(line),
    explain: 'Math.random() est prédictible et ne doit pas générer de secret.',
    fix: 'Utilisez crypto.randomBytes() ou crypto.randomUUID().'
  },
  {
    id: 'tls-disabled',
    name: 'Vérification TLS désactivée',
    severity: 'critical',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py'],
    test: (line) =>
      /rejectUnauthorized\s*:\s*false/.test(line) ||
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/.test(line) ||
      /verify\s*=\s*False/.test(line),
    explain: 'Le certificat du serveur n\'est plus vérifié (MITM possible).',
    fix: 'Rétablissez la vérification et installez le certificat racine requis.'
  },
  {
    id: 'insecure-http',
    name: 'URL en HTTP non chiffré',
    severity: 'medium',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.env'],
    test: (line) =>
      /\bhttp:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)[\w.-]+/i.test(line) &&
      !/^\s*(\/\/|\*|#)/.test(line),
    explain: 'Le trafic vers cet hôte circule en clair.',
    fix: 'Passez l\'URL en https:// .'
  },
  {
    id: 'debug-statement',
    name: 'Instruction de debug',
    severity: 'low',
    enabled: false,
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    test: (line) => /\bdebugger\b/.test(line) || /console\.(debug|trace)\s*\(/.test(line),
    explain: 'Instruction de debug laissée dans le code.',
    fix: 'Supprimez-la avant la mise en production.'
  }
];

/**
 * Evaluate the enabled rules against one line of a given file type.
 * @param {string} line
 * @param {string} extension e.g. ".js"
 * @param {object} [options]
 * @param {boolean} [options.includeDisabled]
 * @returns {Array<{id: string, name: string, severity: string, explain: string, fix: string}>}
 */
function matchCodeLine(line, extension, options = {}) {
  const findings = [];

  if (!line) return findings;

  for (const rule of CODE_RULES) {
    if (rule.enabled === false && !options.includeDisabled) continue;
    if (!rule.extensions.includes(extension)) continue;

    if (rule.test(line)) {
      findings.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        explain: rule.explain,
        fix: rule.fix
      });
    }
  }

  return findings;
}

module.exports = { CODE_RULES, matchCodeLine };
