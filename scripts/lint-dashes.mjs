#!/usr/bin/env node
// Em/en dash lint for user-facing text files. Part of `npm run verify`.
// Scope: root and docs markdown plus index.html. Manifest strings are
// covered separately by lint-greek.mjs. OBSERVED_SESSIONS.md is excluded
// (local-only, gitignored). Code comments are not linted; new comments
// should still avoid dashes per CLAUDE.md.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['index.html', 'CLAUDE.md', 'WORKPLAN.md', 'docs/INSTALL.md'];

const errors = [];
for (const rel of FILES) {
  const p = join(root, rel);
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/[–—]/.test(line)) errors.push(`  ${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
  });
}

if (errors.length) {
  console.error(`lint-dashes: ${errors.length} em/en dash line(s) in user-facing docs\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('lint-dashes: OK');
