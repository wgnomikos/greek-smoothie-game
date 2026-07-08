#!/usr/bin/env node
// Precache budget gate, part of `npm run verify`. Sums the files workbox
// will precache (dist/**/*.{js,css,html,svg,json}, matching the globPatterns
// in vite.config.ts) and fails if the total exceeds the budget.
//
// Budget is 250 KB: the v0.7 build precaches ~90 KB, so this leaves real
// headroom for content growth (new SVGs, phrase JSON) while still catching a
// runaway dependency or an accidentally-bundled asset. Raise it only via a
// WORKPLAN card, not ad hoc.

import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, relative } from 'node:path';

const BUDGET_KB = 250;
const PRECACHE_EXT = new Set(['.js', '.css', '.html', '.svg', '.json']);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push({ path: p, size: st.size });
  }
  return out;
}

let files;
try {
  files = walk(dist).filter((f) => PRECACHE_EXT.has(extname(f.path)));
} catch {
  console.error('check-budget: dist/ not found. Run the build first.');
  process.exit(1);
}

const total = files.reduce((sum, f) => sum + f.size, 0);
const totalKb = total / 1024;

const top = files
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .map((f) => `  ${(f.size / 1024).toFixed(1).padStart(7)} KB  ${relative(dist, f.path)}`)
  .join('\n');

if (totalKb > BUDGET_KB) {
  console.error(`check-budget: FAIL. Precache total ${totalKb.toFixed(1)} KB exceeds ${BUDGET_KB} KB budget.\nLargest files:\n${top}`);
  process.exit(1);
}
console.log(`check-budget: OK. Precache total ${totalKb.toFixed(1)} KB of ${BUDGET_KB} KB budget.\nLargest files:\n${top}`);
