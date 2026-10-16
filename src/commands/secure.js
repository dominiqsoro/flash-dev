const pc = require('picocolors');
const { isGitRepository, tryGit } = require('../utils/git');
const { parseAddedLines } = require('../core/diff-parser');
const { matchLine, isIgnoredPath, redact } = require('../core/secret-patterns');

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Audit a unified diff for leaked secrets.
 * Only ADDED lines are inspected, so deleting a previously leaked key is
 * never reported as a new leak.
 * @param {string} diff
 * @returns {Array<{file: string, line: number, rule: string, severity: string, match: string}>}
 */
function auditDiff(diff) {
  const issues = [];

  for (const added of parseAddedLines(diff)) {
    if (isIgnoredPath(added.file)) continue;

    for (const finding of matchLine(added.content)) {
      issues.push({
        file: added.file,
        line: added.line,
        rule: finding.rule,
        severity: finding.severity,
        match: finding.match
      });
    }
  }

  return issues.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
  );
}

function printIssues(issues, label, colorFn) {
  if (issues.length === 0) return;

  console.log(colorFn(`\n${label} (${issues.length})`));
  for (const issue of issues) {
    console.log(colorFn(`  ${issue.file}:${issue.line}  ${issue.rule}`));
    console.log(pc.gray(`    valeur: ${redact(issue.match)}`));
  }
}

/**
 * flash-dev secure — pre-commit secret leak audit.
 * @param {object} [options]
 * @param {boolean} [options.all] audit the whole tracked tree, not just the index
 * @param {boolean} [options.json] machine-readable output
 * @returns {Promise<number>} process exit code
 */
async function secureCommand(options = {}) {
  const asJson = Boolean(options.json);

  if (!asJson) {
    console.log(pc.cyan('flash-dev secure - Audit anti-fuite de secrets\n'));
  }

  if (!isGitRepository()) {
    if (asJson) {
      console.log(JSON.stringify({ ok: false, reason: 'not_a_git_repository', issues: [] }, null, 2));
    } else {
      console.log(pc.red('Ce dossier n\'est pas un dépôt Git.'));
      console.log(pc.cyan('Initialisez un dépôt avec: git init\n'));
    }
    process.exitCode = 1;
    return 1;
  }

  // `--all` diffs against the empty tree, i.e. audits every tracked line.
  const diffResult = options.all
    ? tryGit(['diff', '--no-color', '4b825dc642cb6eb9a060e54bf8d69288fbee4904'])
    : tryGit(['diff', '--cached', '--no-color']);

  if (!diffResult.ok) {
    if (asJson) {
      console.log(JSON.stringify({ ok: false, reason: 'diff_failed', issues: [] }, null, 2));
    } else {
      console.log(pc.yellow('Impossible de lire le diff Git.'));
      console.log(pc.gray(diffResult.stderr));
    }
    process.exitCode = 1;
    return 1;
  }

  const diff = diffResult.stdout;

  if (!diff.trim()) {
    if (asJson) {
      console.log(JSON.stringify({ ok: true, scanned: 0, issues: [] }, null, 2));
    } else {
      console.log(pc.green('Aucun changement indexé à auditer.'));
      console.log(pc.cyan('Astuce: git add . puis relancez, ou utilisez --all.\n'));
    }
    return 0;
  }

  const issues = auditDiff(diff);
  const addedCount = parseAddedLines(diff).length;

  if (asJson) {
    console.log(JSON.stringify({ ok: issues.length === 0, scanned: addedCount, issues }, null, 2));
    process.exitCode = issues.length === 0 ? 0 : 1;
    return issues.length === 0 ? 0 : 1;
  }

  if (issues.length === 0) {
    console.log(pc.green(`Aucun secret détecté (${addedCount} ligne(s) ajoutée(s) auditée(s)).`));
    console.log(pc.cyan('Vous pouvez procéder au commit en toute sécurité.\n'));
    return 0;
  }

  console.log(pc.red(`${issues.length} secret(s) potentiel(s) détecté(s) sur ${addedCount} ligne(s) ajoutée(s).`));

  printIssues(issues.filter((i) => i.severity === 'critical'), 'CRITIQUE', pc.red);
  printIssues(issues.filter((i) => i.severity === 'high'), 'ÉLEVÉ', pc.yellow);
  printIssues(issues.filter((i) => i.severity === 'medium'), 'MOYEN', pc.yellow);

  console.log(pc.red('\nBLOCAGE: commit interrompu pour protéger vos secrets.'));
  console.log(pc.cyan('Actions recommandées:'));
  console.log(pc.cyan('  1. Déplacez la valeur dans une variable d\'environnement (.env)'));
  console.log(pc.cyan('  2. Vérifiez que .env est bien dans votre .gitignore'));
  console.log(pc.cyan('  3. Si la clé a déjà été poussée, RÉVOQUEZ-LA puis régénérez-la'));
  console.log(pc.gray('\nFaux positif ? Ajoutez le commentaire "flash-dev-ignore-secret" sur la ligne.\n'));

  process.exitCode = 1;
  return 1;
}

module.exports = secureCommand;
module.exports.auditDiff = auditDiff;
