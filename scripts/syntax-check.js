#!/usr/bin/env node
/**
 * Lightweight syntax check for all project JS sources.
 * Used by CI in place of a heavier linter dependency.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['bin', 'src'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'coverage') continue;
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }

  return files;
}

const files = TARGETS.flatMap((dir) => walk(path.join(ROOT, dir)));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failed += 1;
    const relative = path.relative(ROOT, file);
    const detail = (error.stderr || error.stdout || Buffer.from(error.message)).toString();
    console.error(`FAIL ${relative}\n${detail}`);
  }
}

if (failed > 0) {
  console.error(`\nSyntax check failed: ${failed}/${files.length} file(s)`);
  process.exit(1);
}

console.log(`Syntax check passed: ${files.length} file(s)`);
