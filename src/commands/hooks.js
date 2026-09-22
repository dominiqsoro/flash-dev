const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const { isGitRepository, getRepoRoot, capture } = (() => {
  const git = require('../utils/git');
  const exec = require('../utils/exec');
  return { ...git, capture: exec.capture };
})();
const { parseCommit, COMMIT_TYPES } = require('../core/conventional');

/** Marker that identifies a hook flash-dev owns, so uninstall is surgical. */
const MARKER = '# >>> flash-dev managed hook >>>';
const END_MARKER = '# <<< flash-dev managed hook <<<';

/**
 * Locate the flash-dev binary at hook runtime.
 *
 * Critical property: when flash-dev cannot be found, the hook WARNS and exits
 * 0. A missing tool must never make a repository un-committable.
 */
const RESOLVE_BINARY = [
  'FD_BIN=""',
  'if command -v flash-dev >/dev/null 2>&1; then',
  '  FD_BIN="flash-dev"',
  'elif [ -x "./node_modules/.bin/flash-dev" ]; then',
  '  FD_BIN="./node_modules/.bin/flash-dev"',
  'fi',
  '',
  'if [ -z "$FD_BIN" ]; then',
  '  echo "flash-dev introuvable — garde-fou ignoré (npm install -g flash-dev)" >&2',
  '  exit 0',
  'fi'
];

const MANAGED_HOOKS = {
  'pre-commit': {
    description: 'Bloque le commit si un secret est détecté dans l\'index',
    body: [...RESOLVE_BINARY, '', '"$FD_BIN" secure || exit 1']
  },
  'commit-msg': {
    description: 'Valide le format Conventional Commits du message',
    body: [...RESOLVE_BINARY, '', '"$FD_BIN" hooks run commit-msg "$1" || exit 1']
  },
  'pre-push': {
    description: 'Lance l\'analyse de sécurité statique avant un push',
    body: [...RESOLVE_BINARY, '', '"$FD_BIN" scan || exit 1']
  }
};

/**
 * Resolve the hooks directory, honouring a custom core.hooksPath.
 * @returns {string|null}
 */
function resolveHooksDir() {
  const root = getRepoRoot();
  if (!root) return null;

  const custom = capture('git', ['config', '--get', 'core.hooksPath'], { timeout: 5000 });
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(root, custom);
  }

  const gitDir = capture('git', ['rev-parse', '--git-dir'], { timeout: 5000 }) || '.git';
  const absoluteGitDir = path.isAbsolute(gitDir) ? gitDir : path.join(root, gitDir);

  return path.join(absoluteGitDir, 'hooks');
}

/**
 * Build the full script for a managed hook.
 * @param {string} name
 * @returns {string}
 */
function renderHook(name) {
  const hook = MANAGED_HOOKS[name];
  return [
    '#!/bin/sh',
    MARKER,
    `# ${hook.description}`,
    '# Retirez ce bloc avec: flash-dev hooks uninstall',
    ...hook.body,
    END_MARKER,
    ''
  ].join('\n');
}

/**
 * Describe the current state of each managed hook.
 * @param {string} hooksDir
 * @returns {Array<{name: string, state: 'managed'|'foreign'|'absent', description: string}>}
 */
function inspectHooks(hooksDir) {
  return Object.keys(MANAGED_HOOKS).map((name) => {
    const hookPath = path.join(hooksDir, name);

    if (!fs.existsSync(hookPath)) {
      return { name, state: 'absent', description: MANAGED_HOOKS[name].description };
    }

    let content = '';
    try {
      content = fs.readFileSync(hookPath, 'utf8');
    } catch {
      content = '';
    }

    return {
      name,
      state: content.includes(MARKER) ? 'managed' : 'foreign',
      description: MANAGED_HOOKS[name].description
    };
  });
}

function printStatus(hooksDir) {
  console.log(pc.bold('État des hooks Git\n'));
  console.log(pc.gray(`  Répertoire: ${hooksDir}\n`));

  for (const hook of inspectHooks(hooksDir)) {
    const badge = {
      managed: pc.green('[installé]  '),
      foreign: pc.yellow('[externe]   '),
      absent: pc.gray('[absent]    ')
    }[hook.state];

    console.log(`  ${badge} ${pc.bold(hook.name.padEnd(12))} ${pc.gray(hook.description)}`);
  }

  console.log();
}

/**
 * Install the managed hooks, never clobbering a hook flash-dev does not own.
 * @param {string} hooksDir
 * @param {object} options
 * @returns {Promise<number>}
 */
async function install(hooksDir, options) {
  fs.mkdirSync(hooksDir, { recursive: true });

  const state = inspectHooks(hooksDir);
  const foreign = state.filter((hook) => hook.state === 'foreign');

  if (foreign.length > 0 && !options.force) {
    console.log(pc.yellow(`${foreign.length} hook(s) existant(s) non gérés par flash-dev :\n`));
    foreign.forEach((hook) => console.log(pc.gray(`  - ${hook.name}`)));

    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Les sauvegarder en .bak et les remplacer ?',
      initial: false
    });

    if (!overwrite) {
      console.log(pc.yellow('\nInstallation limitée aux hooks absents.\n'));
    } else {
      options.force = true;
    }
  }

  let installed = 0;
  let skipped = 0;

  for (const hook of state) {
    const hookPath = path.join(hooksDir, hook.name);

    if (hook.state === 'foreign') {
      if (!options.force) {
        skipped += 1;
        continue;
      }
      fs.copyFileSync(hookPath, `${hookPath}.bak`);
      console.log(pc.gray(`  Sauvegarde: ${hook.name}.bak`));
    }

    fs.writeFileSync(hookPath, renderHook(hook.name), { mode: 0o755 });
    try {
      fs.chmodSync(hookPath, 0o755);
    } catch {
      // Windows: the execute bit is irrelevant
    }

    installed += 1;
    console.log(pc.green(`  ✔ ${hook.name}`));
  }

  console.log(pc.green(`\n${installed} hook(s) installé(s)${skipped > 0 ? `, ${skipped} ignoré(s)` : ''}.`));
  console.log(pc.cyan('\nVos commits sont désormais audités automatiquement.'));
  console.log(pc.gray('Contourner ponctuellement: git commit --no-verify\n'));

  return 0;
}

/**
 * Remove only the hooks flash-dev installed, restoring .bak when present.
 * @param {string} hooksDir
 * @returns {number}
 */
function uninstall(hooksDir) {
  let removed = 0;

  for (const hook of inspectHooks(hooksDir)) {
    if (hook.state !== 'managed') continue;

    const hookPath = path.join(hooksDir, hook.name);
    const backupPath = `${hookPath}.bak`;

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, hookPath);
      fs.unlinkSync(backupPath);
      console.log(pc.green(`  ✔ ${hook.name} restauré depuis la sauvegarde`));
    } else {
      fs.unlinkSync(hookPath);
      console.log(pc.green(`  ✔ ${hook.name} supprimé`));
    }

    removed += 1;
  }

  console.log(
    removed > 0
      ? pc.green(`\n${removed} hook(s) retiré(s).\n`)
      : pc.yellow('\nAucun hook géré par flash-dev n\'était installé.\n')
  );

  return 0;
}

/**
 * Hook runtime entry point: `flash-dev hooks run commit-msg <file>`
 * @param {string} hookName
 * @param {string} argument
 * @returns {number} exit code
 */
function runHook(hookName, argument) {
  if (hookName !== 'commit-msg') {
    console.log(pc.red(`Hook inconnu: ${hookName}`));
    process.exitCode = 1;
    return 1;
  }

  if (!argument || !fs.existsSync(argument)) {
    console.log(pc.red('Fichier de message de commit introuvable.'));
    process.exitCode = 1;
    return 1;
  }

  const message = fs.readFileSync(argument, 'utf8');
  const parsed = parseCommit(message);

  if (parsed.valid) {
    return 0;
  }

  console.log(pc.red('\n✖ Message de commit non conforme\n'));
  console.log(pc.gray(`  ${parsed.header || '(vide)'}\n`));

  parsed.errors.forEach((error) => console.log(pc.yellow(`  · ${error}`)));

  console.log(pc.cyan('\n  Types autorisés :'));
  const types = Object.entries(COMMIT_TYPES)
    .map(([type, meta]) => `${type} (${meta.label.toLowerCase()})`)
    .join(', ');
  console.log(pc.gray(`  ${types}`));

  console.log(pc.cyan('\n  Exemples :'));
  console.log(pc.white('    feat(auth): add refresh token rotation'));
  console.log(pc.white('    fix(api): handle empty payload'));
  console.log(pc.white('    chore(deps)!: drop node 16 support'));
  console.log(pc.gray('\n  Astuce: "flash-dev push" génère un message conforme automatiquement.\n'));

  process.exitCode = 1;
  return 1;
}

/**
 * flash-dev hooks [action] [argument]
 * @param {string} [action] status | install | uninstall | run
 * @param {string} [argument]
 * @param {object} [options]
 * @returns {Promise<number>}
 */
async function hooksCommand(action = 'status', argument, options = {}) {
  // `hooks run` is invoked by Git itself: keep its output minimal.
  if (action === 'run') {
    return runHook(argument, options.file || process.argv[process.argv.length - 1]);
  }

  console.log(pc.cyan('\n🪝 flash-dev hooks - Automatisation des garde-fous Git\n'));

  if (!isGitRepository()) {
    console.log(pc.red('Ce dossier n\'est pas un dépôt Git.'));
    console.log(pc.cyan('Initialisez avec: git init\n'));
    process.exitCode = 1;
    return 1;
  }

  const hooksDir = resolveHooksDir();
  if (!hooksDir) {
    console.log(pc.red('Impossible de localiser le répertoire des hooks.\n'));
    process.exitCode = 1;
    return 1;
  }

  switch (action) {
    case 'install':
      return install(hooksDir, { force: Boolean(options.force) });
    case 'uninstall':
    case 'remove':
      return uninstall(hooksDir);
    case 'status':
      printStatus(hooksDir);
      console.log(pc.cyan('Installer : flash-dev hooks install'));
      console.log(pc.cyan('Retirer   : flash-dev hooks uninstall\n'));
      return 0;
    default:
      console.log(pc.red(`Action inconnue: ${action}`));
      console.log(pc.cyan('Actions: status, install, uninstall\n'));
      process.exitCode = 1;
      return 1;
  }
}

module.exports = hooksCommand;
module.exports.resolveHooksDir = resolveHooksDir;
module.exports.inspectHooks = inspectHooks;
module.exports.runHook = runHook;
module.exports.MARKER = MARKER;
