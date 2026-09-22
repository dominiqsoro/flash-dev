const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const config = require('../core/config');

/**
 * License risk classification for a typical closed-source or SaaS project.
 * `strong` copyleft is the category that usually forces a legal decision.
 */
const LICENSE_CLASSES = {
  permissive: {
    label: 'Permissive',
    color: pc.green,
    patterns: [/^MIT$/i, /^ISC$/i, /^BSD/i, /^Apache/i, /^0BSD$/i, /^Unlicense$/i, /^CC0/i, /^Zlib$/i, /^Python-2/i, /^WTFPL$/i, /^BlueOak/i]
  },
  weak: {
    label: 'Copyleft faible',
    color: pc.yellow,
    patterns: [/^LGPL/i, /^MPL/i, /^EPL/i, /^CDDL/i, /^Artistic/i, /^OSL/i]
  },
  strong: {
    label: 'Copyleft fort',
    color: pc.red,
    patterns: [/^GPL/i, /^AGPL/i, /^SSPL/i, /^EUPL/i, /^CC-BY-SA/i]
  },
  proprietary: {
    label: 'Propriétaire / restreinte',
    color: pc.red,
    patterns: [/^UNLICENSED$/i, /^SEE LICENSE/i, /^Commercial/i, /^BUSL/i, /^Elastic/i]
  }
};

/**
 * Classify a SPDX-ish license expression.
 * @param {string} license
 * @returns {'permissive'|'weak'|'strong'|'proprietary'|'unknown'}
 */
function classifyLicense(license) {
  if (!license) return 'unknown';

  // "(MIT OR Apache-2.0)" — the most permissive option is the one that applies
  const options = String(license)
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((part) => part.trim());

  const classes = options.map((option) => {
    for (const [name, definition] of Object.entries(LICENSE_CLASSES)) {
      if (definition.patterns.some((pattern) => pattern.test(option))) return name;
    }
    return 'unknown';
  });

  for (const preference of ['permissive', 'weak', 'unknown', 'strong', 'proprietary']) {
    if (classes.includes(preference)) return preference;
  }

  return 'unknown';
}

/**
 * Normalise the many shapes a package.json "license" field takes.
 * @param {object} packageJson
 * @returns {string}
 */
function readLicenseField(packageJson) {
  if (typeof packageJson.license === 'string') return packageJson.license;
  if (packageJson.license && typeof packageJson.license.type === 'string') return packageJson.license.type;

  if (Array.isArray(packageJson.licenses) && packageJson.licenses.length > 0) {
    return packageJson.licenses
      .map((entry) => (typeof entry === 'string' ? entry : entry.type))
      .filter(Boolean)
      .join(' OR ');
  }

  return '';
}

/**
 * Walk node_modules (including scoped packages) and collect license metadata.
 * @param {string} rootDir
 * @returns {Array<{name: string, version: string, license: string, class: string}>}
 */
function collectLicenses(rootDir) {
  const modulesDir = path.join(rootDir, 'node_modules');
  const packages = [];

  if (!fs.existsSync(modulesDir)) return packages;

  const readPackage = (packageDir, name) => {
    const manifestPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(manifestPath)) return;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const license = readLicenseField(manifest);

      packages.push({
        name: manifest.name || name,
        version: manifest.version || '?',
        license: license || 'UNKNOWN',
        class: classifyLicense(license)
      });
    } catch {
      // Unreadable manifest: nothing to report
    }
  };

  let entries;
  try {
    entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  } catch {
    return packages;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(modulesDir, entry.name);
      let scoped = [];
      try {
        scoped = fs.readdirSync(scopeDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const scopedEntry of scoped) {
        if (!scopedEntry.isDirectory()) continue;
        readPackage(path.join(scopeDir, scopedEntry.name), `${entry.name}/${scopedEntry.name}`);
      }
      continue;
    }

    readPackage(path.join(modulesDir, entry.name), entry.name);
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * flash-dev licenses — audit dependency licenses for compliance risk.
 * @param {object} [options]
 * @param {boolean} [options.json]
 * @param {string} [options.failOn] 'strong' | 'weak' | 'unknown'
 * @returns {number} exit code
 */
function licensesCommand(options = {}) {
  const asJson = Boolean(options.json) || config.isJson();
  const rootDir = process.cwd();

  if (!asJson) {
    console.log(pc.cyan('\n⚖️  flash-dev licenses - Audit de conformité des dépendances\n'));
  }

  if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
    console.log(pc.red('Aucun package.json trouvé dans ce répertoire.\n'));
    process.exitCode = 1;
    return 1;
  }

  const packages = collectLicenses(rootDir);

  if (packages.length === 0) {
    console.log(pc.yellow('Aucune dépendance installée.'));
    console.log(pc.cyan('Lancez "npm install" puis relancez cette commande.\n'));
    return 0;
  }

  const byClass = {
    permissive: [], weak: [], strong: [], proprietary: [], unknown: []
  };
  for (const entry of packages) byClass[entry.class].push(entry);

  // Own license, for the compatibility note
  let ownLicense = '';
  try {
    ownLicense = readLicenseField(JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')));
  } catch {
    ownLicense = '';
  }

  if (asJson) {
    console.log(JSON.stringify({
      total: packages.length,
      ownLicense,
      counts: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.length])),
      packages
    }, null, 2));
  } else {
    console.log(pc.bold(`${packages.length} dépendance(s) analysée(s)`));
    if (ownLicense) console.log(pc.gray(`Licence du projet : ${ownLicense}\n`));

    for (const [name, definition] of Object.entries(LICENSE_CLASSES)) {
      const group = byClass[name];
      if (group.length === 0) continue;

      console.log(definition.color(`${definition.label} : ${group.length}`));

      if (name === 'strong' || name === 'proprietary') {
        for (const entry of group) {
          console.log(definition.color(`    ${entry.name}@${entry.version}  ${pc.bold(entry.license)}`));
        }
      } else {
        const distribution = new Map();
        for (const entry of group) {
          distribution.set(entry.license, (distribution.get(entry.license) || 0) + 1);
        }
        const summary = [...distribution.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([license, count]) => `${license} (${count})`)
          .join(', ');
        console.log(pc.gray(`    ${summary}`));
      }
      console.log();
    }

    if (byClass.unknown.length > 0) {
      console.log(pc.yellow(`Licence indéterminée : ${byClass.unknown.length}`));
      for (const entry of byClass.unknown.slice(0, 8)) {
        console.log(pc.gray(`    ${entry.name}@${entry.version}  ${entry.license}`));
      }
      if (byClass.unknown.length > 8) {
        console.log(pc.gray(`    … et ${byClass.unknown.length - 8} autre(s)`));
      }
      console.log();
    }

    const risky = byClass.strong.length + byClass.proprietary.length;
    if (risky === 0) {
      console.log(pc.green('✅ Aucune licence à forte contrainte détectée.\n'));
    } else {
      console.log(pc.red(`⚠️  ${risky} dépendance(s) à forte contrainte de licence.`));
      console.log(pc.cyan('   Une licence copyleft fort peut obliger à publier votre code source.'));
      console.log(pc.cyan('   Faites valider ces dépendances avant toute distribution.\n'));
    }
  }

  // --fail-on turns the audit into a CI gate
  const thresholds = {
    strong: byClass.strong.length + byClass.proprietary.length,
    weak: byClass.strong.length + byClass.proprietary.length + byClass.weak.length,
    unknown: packages.length - byClass.permissive.length
  };

  if (options.failOn && thresholds[options.failOn] > 0) {
    if (!asJson) {
      console.log(pc.red(`Échec: --fail-on=${options.failOn} (${thresholds[options.failOn]} dépendance(s) concernée(s))\n`));
    }
    process.exitCode = 1;
    return 1;
  }

  return 0;
}

module.exports = licensesCommand;
module.exports.classifyLicense = classifyLicense;
module.exports.readLicenseField = readLicenseField;
module.exports.collectLicenses = collectLicenses;
