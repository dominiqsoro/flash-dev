const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const pc = require('picocolors');
const { ValidationError } = require('../core/errors');
const { run, capture, ok } = require('../utils/exec');

const CACHE_DIR = path.join(os.homedir(), '.flash-dev', 'node-versions');
const BIN_DIR = path.join(os.homedir(), '.flash-dev', 'bin');
const DIST_BASE = 'https://nodejs.org/dist';

/** Strict semver: nothing else can reach the filesystem or the network. */
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function ensureDirs() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

/**
 * Validate and normalise a user-supplied version string.
 * Rejects anything that is not a bare semver, which closes the shell
 * injection and path traversal surface in one place.
 * @param {string} input
 * @returns {string}
 * @throws {Error}
 */
function normalizeVersion(input) {
  const candidate = String(input || '').trim().replace(/^v/i, '');

  if (!VERSION_RE.test(candidate)) {
    throw new ValidationError(
      `Version invalide: "${input}". Format attendu: 18.20.4 (MAJEUR.MINEUR.CORRECTIF).`,
      'Consultez les versions disponibles sur https://nodejs.org/dist/'
    );
  }

  return candidate;
}

/**
 * Map process.arch to the identifier used by nodejs.org releases.
 * @returns {string}
 * @throws {Error} on unsupported architectures
 */
function resolveArch() {
  const map = { x64: 'x64', arm64: 'arm64', arm: 'armv7l', ppc64: 'ppc64le', s390x: 's390x' };
  const arch = map[process.arch];

  if (!arch) {
    throw new Error(`Architecture non supportée: ${process.arch}`);
  }

  return arch;
}

/**
 * Download a URL to disk using whichever fetcher is available.
 * Arguments are passed as argv — never interpolated into a shell string.
 * @param {string} url
 * @param {string} destination
 * @returns {boolean}
 */
function download(url, destination) {
  if (ok('curl', ['--version'], { timeout: 3000 })) {
    return run('curl', ['-fsSL', '--proto', '=https', '--tlsv1.2', url, '-o', destination], {
      timeout: 300000
    }).ok;
  }

  if (ok('wget', ['--version'], { timeout: 3000 })) {
    return run('wget', ['-q', '--https-only', url, '-O', destination], { timeout: 300000 }).ok;
  }

  throw new Error('Ni curl ni wget n\'est disponible pour télécharger Node.js.');
}

/**
 * Fetch SHASUMS256.txt for a release and return the digest for one file.
 * @param {string} version
 * @param {string} fileName
 * @returns {string|null}
 */
function fetchExpectedChecksum(version, fileName) {
  const checksumPath = path.join(CACHE_DIR, `SHASUMS256-v${version}.txt`);

  try {
    if (!download(`${DIST_BASE}/v${version}/SHASUMS256.txt`, checksumPath)) {
      return null;
    }

    const content = fs.readFileSync(checksumPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const [digest, name] = line.trim().split(/\s+/);
      if (name === fileName && /^[a-f0-9]{64}$/i.test(digest || '')) {
        return digest.toLowerCase();
      }
    }
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(checksumPath); } catch { /* best effort */ }
  }

  return null;
}

/**
 * SHA-256 of a file on disk.
 * @param {string} filePath
 * @returns {string}
 */
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function cleanup(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch { /* best effort */ }
}

/**
 * flash-dev node-switch <version>
 * Downloads a Node.js release into ~/.flash-dev and points a local shim at it.
 * @param {string} versionArg
 * @returns {number} exit code
 */
function nodeSwitchCommand(versionArg) {
  // Validate first: a ValidationError is rendered centrally by bin/index.js,
  // together with its suggested fix.
  const version = normalizeVersion(versionArg);

  console.log(pc.cyan('\n⚡  Basculeur de version Node.js local\n'));

  try {
    ensureDirs();

    const isWin = process.platform === 'win32';
    const arch = resolveArch();
    const versionDir = path.join(CACHE_DIR, `v${version}`);
    const nodeBinaryPath = isWin
      ? path.join(versionDir, 'node.exe')
      : path.join(versionDir, 'bin', 'node');

    if (fs.existsSync(nodeBinaryPath)) {
      console.log(pc.green(`✨ Node v${version} déjà présent dans le cache.`));
    } else {
      const platformName = isWin ? 'win' : (process.platform === 'darwin' ? 'darwin' : 'linux');
      const extension = isWin ? 'zip' : 'tar.gz';
      const archiveName = `node-v${version}-${platformName}-${arch}.${extension}`;
      const archivePath = path.join(CACHE_DIR, archiveName);
      const url = `${DIST_BASE}/v${version}/${archiveName}`;

      console.log(pc.yellow(`📦 Téléchargement de Node v${version}...`));
      console.log(pc.gray(`   ${url}`));

      if (!download(url, archivePath)) {
        cleanup(archivePath);
        console.log(pc.red(`\n❌ Téléchargement échoué. La version v${version} existe-t-elle ?`));
        console.log(pc.cyan('   Versions disponibles: https://nodejs.org/dist/'));
        process.exitCode = 1;
        return 1;
      }

      // --- Integrity verification (was entirely missing) --------------------
      console.log(pc.yellow('🔐 Vérification de l\'empreinte SHA-256...'));
      const expected = fetchExpectedChecksum(version, archiveName);

      if (!expected) {
        cleanup(archivePath);
        console.log(pc.red('\n❌ Impossible de récupérer SHASUMS256.txt — installation annulée.'));
        console.log(pc.cyan('   Un binaire non vérifié ne sera jamais installé.'));
        process.exitCode = 1;
        return 1;
      }

      const actual = sha256File(archivePath);
      if (actual !== expected) {
        cleanup(archivePath);
        console.log(pc.red('\n❌ EMPREINTE INVALIDE — archive rejetée et supprimée.'));
        console.log(pc.gray(`   attendu : ${expected}`));
        console.log(pc.gray(`   obtenu  : ${actual}`));
        console.log(pc.yellow('   Le téléchargement a pu être altéré (proxy, MITM). N\'insistez pas.'));
        process.exitCode = 1;
        return 1;
      }

      console.log(pc.green('✅ Empreinte vérifiée.'));

      fs.mkdirSync(versionDir, { recursive: true });
      console.log(pc.yellow('⏳ Extraction...'));

      const extraction = isWin
        ? run('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-Command',
            'Expand-Archive -LiteralPath $env:FD_ARCHIVE -DestinationPath $env:FD_DEST -Force'
          ], { timeout: 300000, env: { ...process.env, FD_ARCHIVE: archivePath, FD_DEST: versionDir } })
        : run('tar', ['-xzf', archivePath, '-C', versionDir, '--strip-components=1'], { timeout: 300000 });

      cleanup(archivePath);

      if (!extraction.ok) {
        cleanup(versionDir);
        console.log(pc.red('\n❌ Extraction échouée.'));
        console.log(pc.gray(extraction.stderr || ''));
        process.exitCode = 1;
        return 1;
      }

      console.log(pc.green('✅ Extraction terminée.'));
    }

    // --- Shim -----------------------------------------------------------------
    console.log(pc.yellow('\n⚙️  Mise à jour du lien local...'));

    if (isWin) {
      fs.writeFileSync(path.join(BIN_DIR, 'node.cmd'), `@echo off\r\n"${nodeBinaryPath}" %*\r\n`, 'utf8');

      const npmCliPath = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (fs.existsSync(npmCliPath)) {
        fs.writeFileSync(
          path.join(BIN_DIR, 'npm.cmd'),
          `@echo off\r\n"${nodeBinaryPath}" "${npmCliPath}" %*\r\n`,
          'utf8'
        );
      }

      console.log(pc.green('✅ Shims Windows créés.'));
      console.log(pc.cyan('\n💡 Session courante (PowerShell) :'));
      console.log(pc.white(`  $env:PATH = "${BIN_DIR};" + $env:PATH`));
    } else {
      fs.writeFileSync(
        path.join(BIN_DIR, 'node'),
        `#!/bin/sh\nexec "${nodeBinaryPath}" "$@"\n`,
        { encoding: 'utf8', mode: 0o755 }
      );

      const npmCliPath = path.join(versionDir, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (fs.existsSync(npmCliPath)) {
        fs.writeFileSync(
          path.join(BIN_DIR, 'npm'),
          `#!/bin/sh\nexec "${nodeBinaryPath}" "${npmCliPath}" "$@"\n`,
          { encoding: 'utf8', mode: 0o755 }
        );
      }

      console.log(pc.green('✅ Shims Unix créés.'));
      console.log(pc.cyan('\n💡 Ajoutez à votre ~/.bashrc ou ~/.zshrc :'));
      console.log(pc.white(`  export PATH="${BIN_DIR}:$PATH"`));
    }

    const installed = capture(nodeBinaryPath, ['--version'], { timeout: 5000 });
    if (installed) {
      console.log(pc.green(`\n🚀 Node ${installed} prêt.\n`));
    } else {
      console.log(pc.yellow('\n⚠️  Binaire installé mais non exécutable sur cette plateforme.\n'));
    }

    return 0;
  } catch (error) {
    console.log(pc.red(`\n❌ Erreur : ${error.message}\n`));
    process.exitCode = 1;
    return 1;
  }
}

module.exports = nodeSwitchCommand;
module.exports.normalizeVersion = normalizeVersion;
module.exports.resolveArch = resolveArch;
