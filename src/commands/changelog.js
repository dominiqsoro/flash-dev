const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const prompts = require('prompts');
const { isGitRepository, tryGit, getRepoRoot } = require('../utils/git');
const { parseCommit, COMMIT_TYPES, inferBump, bumpVersion } = require('../core/conventional');

/** Field separator unlikely to appear in a commit message. */
const FIELD = '\u001f';
const RECORD = '\u001e';

/**
 * Most recent semver tag reachable from HEAD.
 * @returns {string|null}
 */
function lastTag() {
  const tag = tryGit(['describe', '--tags', '--abbrev=0', '--match', 'v*']);
  if (tag.ok && tag.stdout) return tag.stdout;

  const anyTag = tryGit(['describe', '--tags', '--abbrev=0']);
  return anyTag.ok && anyTag.stdout ? anyTag.stdout : null;
}

/**
 * Read commits in a range and parse them as Conventional Commits.
 * @param {string|null} since tag or ref; null means the whole history
 * @returns {Array<object>}
 */
function collectCommits(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const format = ['%H', '%h', '%s', '%b', '%an'].join(FIELD) + RECORD;

  const log = tryGit(['log', range, `--format=${format}`, '--no-merges']);
  if (!log.ok || !log.stdout) return [];

  return log.stdout
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortHash, subject, body, author] = record.split(FIELD);
      const parsed = parseCommit(`${subject}\n${body || ''}`);

      return {
        hash,
        shortHash,
        subject,
        author,
        type: parsed.type || 'chore',
        scope: parsed.scope,
        description: parsed.subject || subject,
        breaking: parsed.breaking,
        conventional: parsed.valid && Boolean(parsed.type)
      };
    });
}

/**
 * Render one release section in Keep a Changelog style.
 * @param {string} version
 * @param {Array<object>} commits
 * @param {object} [options]
 * @returns {string}
 */
function renderSection(version, commits, options = {}) {
  const date = options.date || new Date().toISOString().slice(0, 10);
  const repoUrl = options.repoUrl;

  const lines = [`## [${version}] — ${date}`, ''];

  const breaking = commits.filter((commit) => commit.breaking);
  if (breaking.length > 0) {
    lines.push('### ⚠️ Changements incompatibles', '');
    for (const commit of breaking) {
      lines.push(`- ${formatEntry(commit, repoUrl)}`);
    }
    lines.push('');
  }

  const grouped = new Map();
  for (const commit of commits) {
    if (!COMMIT_TYPES[commit.type]) continue;
    if (!grouped.has(commit.type)) grouped.set(commit.type, []);
    grouped.get(commit.type).push(commit);
  }

  const orderedTypes = [...grouped.keys()].sort(
    (a, b) => (COMMIT_TYPES[a]?.order ?? 99) - (COMMIT_TYPES[b]?.order ?? 99)
  );

  for (const type of orderedTypes) {
    const meta = COMMIT_TYPES[type];
    // Housekeeping types stay out of a user-facing changelog by default
    if (!options.includeAll && ['chore', 'style', 'ci', 'build', 'test'].includes(type)) continue;

    lines.push(`### ${meta.emoji} ${meta.label}`, '');
    for (const commit of grouped.get(type)) {
      lines.push(`- ${formatEntry(commit, repoUrl)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatEntry(commit, repoUrl) {
  const scope = commit.scope ? `**${commit.scope}**: ` : '';
  const link = repoUrl ? ` ([${commit.shortHash}](${repoUrl}/commit/${commit.hash}))` : ` (${commit.shortHash})`;
  return `${scope}${commit.description}${link}`;
}

/**
 * Derive the https repo URL from the origin remote.
 * @returns {string|null}
 */
function detectRepoUrl() {
  const remote = tryGit(['remote', 'get-url', 'origin']);
  if (!remote.ok || !remote.stdout) return null;

  const url = remote.stdout
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '');

  return /^https?:\/\//.test(url) ? url : null;
}

/**
 * flash-dev changelog [version]
 * @param {string} [versionArg]
 * @param {object} [options]
 * @returns {Promise<number>} exit code
 */
async function changelogCommand(versionArg, options = {}) {
  console.log(pc.cyan('\n📝 flash-dev changelog - Génération depuis les Conventional Commits\n'));

  if (!isGitRepository()) {
    console.log(pc.red('Ce dossier n\'est pas un dépôt Git.\n'));
    process.exitCode = 1;
    return 1;
  }

  const since = options.since || lastTag();
  const commits = collectCommits(since);

  if (commits.length === 0) {
    console.log(
      since
        ? pc.yellow(`Aucun commit depuis ${since}.\n`)
        : pc.yellow('Aucun commit dans l\'historique.\n')
    );
    return 0;
  }

  const conventional = commits.filter((commit) => commit.conventional);
  console.log(pc.gray(`Base          : ${since || 'début de l\'historique'}`));
  console.log(pc.gray(`Commits       : ${commits.length}`));
  console.log(pc.gray(`Conformes     : ${conventional.length}/${commits.length}`));

  if (conventional.length === 0) {
    console.log(pc.yellow('\nAucun commit au format Conventional Commits.'));
    console.log(pc.cyan('Installez le garde-fou: flash-dev hooks install\n'));
    return 0;
  }

  if (conventional.length < commits.length) {
    console.log(
      pc.yellow(`\n⚠️  ${commits.length - conventional.length} commit(s) non conformes seront ignorés.`)
    );
    console.log(pc.gray('   Installez le hook commit-msg: flash-dev hooks install'));
  }

  // --- Version ---------------------------------------------------------------
  const rootDir = getRepoRoot() || process.cwd();
  const packageJsonPath = path.join(rootDir, 'package.json');

  let currentVersion = '0.0.0';
  try {
    currentVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version || '0.0.0';
  } catch {
    // Not a Node project — the version must then be supplied explicitly
  }

  const bump = inferBump(conventional);
  const suggested = bump ? bumpVersion(currentVersion, bump) : currentVersion;
  const version = versionArg || suggested;

  console.log(pc.gray(`Version       : ${currentVersion} → ${pc.bold(version)}${bump ? ` (${bump})` : ''}\n`));

  const section = renderSection(version, conventional, {
    repoUrl: detectRepoUrl(),
    includeAll: Boolean(options.all)
  });

  console.log(pc.gray('─'.repeat(64)));
  console.log(section.trimEnd());
  console.log(pc.gray('─'.repeat(64)));

  if (options.dryRun) {
    console.log(pc.cyan('\nMode --dry-run : aucun fichier modifié.\n'));
    return 0;
  }

  const changelogPath = path.join(rootDir, options.file || 'CHANGELOG.md');
  const exists = fs.existsSync(changelogPath);

  if (!options.yes) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: exists
        ? `Insérer cette section en tête de ${path.basename(changelogPath)} ?`
        : `Créer ${path.basename(changelogPath)} ?`,
      initial: true
    });

    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return 0;
    }
  }

  let output;
  if (exists) {
    const existing = fs.readFileSync(changelogPath, 'utf8');

    if (existing.includes(`## [${version}]`)) {
      console.log(pc.yellow(`\n⚠️  Une section [${version}] existe déjà — aucune modification.\n`));
      return 0;
    }

    // Insert after the leading header block, before the first release section
    const firstRelease = existing.search(/^##\s+\[/m);
    output = firstRelease === -1
      ? `${existing.trimEnd()}\n\n${section}`
      : `${existing.slice(0, firstRelease)}${section}\n${existing.slice(firstRelease)}`;
  } else {
    output = [
      '# Changelog',
      '',
      'Ce fichier documente toutes les modifications notables du projet.',
      '',
      'Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)',
      'et [Semantic Versioning](https://semver.org/lang/fr/).',
      '',
      section
    ].join('\n');
  }

  fs.writeFileSync(changelogPath, output);

  console.log(pc.green(`\n✅ ${path.basename(changelogPath)} mis à jour.`));
  console.log(pc.cyan('\nProchaines étapes :'));
  console.log(pc.white(`  npm version ${version} --no-git-tag-version`));
  console.log(pc.white(`  git add CHANGELOG.md package.json && git commit -m "chore(release): ${version}"`));
  console.log(pc.white(`  git tag v${version}\n`));

  return 0;
}

module.exports = changelogCommand;
module.exports.collectCommits = collectCommits;
module.exports.renderSection = renderSection;
module.exports.lastTag = lastTag;
