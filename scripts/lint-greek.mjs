#!/usr/bin/env node
// Deterministic Greek + schema linter for src/data/manifest.json.
// Part of `npm run verify`. Exit 0 = pass, exit 1 = violations listed.
//
// Encodes the May 2026 council's language findings as rules:
//   1. Object nouns take indefinite articles (ena/mia), no English-calque
//      anarthrous nouns.
//   2. Article and adjective gender must agree with the noun.
//   3. Transliteration uses `h` never `ch` (ahladi, Ohi) so English readers
//      don't produce /tʃ/.
//   4. No em or en dashes in any user-facing string.
// Plus schema sanity: unique ids, valid levels, answers reference real fruits,
// every phrase/silly item carries tts text and an audio path.
//
// The lexicon below is the ground truth for gender/plural. New nouns enter
// here ONLY after Will approves them (see CLAUDE.md: no model freestyles
// Greek).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'src/data/manifest.json'), 'utf8'));

// gender: n = neuter (ena / megalo / mikro / polla), f = feminine (mia / megali / mikri / polles)
const LEXICON = {
  'μήλο':      { gender: 'n', plural: 'μήλα' },
  'μπανάνα':   { gender: 'f', plural: 'μπανάνες' },
  'πορτοκάλι': { gender: 'n', plural: 'πορτοκάλια' },
  'σταφύλι':   { gender: 'n', plural: 'σταφύλια' },
  'φράουλα':   { gender: 'f', plural: 'φράουλες' },
  'καρπούζι':  { gender: 'n', plural: 'καρπούζια' },
  'λεμόνι':    { gender: 'n', plural: 'λεμόνια' },
  'αχλάδι':    { gender: 'n', plural: 'αχλάδια' },
};

const ARTICLES = { n: 'ένα', f: 'μία' };
const ADJ = {
  n: ['μεγάλο', 'μικρό'],
  f: ['μεγάλη', 'μικρή'],
};
const PLURAL_QUANT = { n: 'πολλά', f: 'πολλές' };

const errors = [];
const err = (id, msg) => errors.push(`  ${id}: ${msg}`);

const fruitIds = new Set(manifest.fruits.map((f) => f.id));
const seenIds = new Set();

for (const p of manifest.phrases) {
  // ---- schema ----
  if (seenIds.has(p.id)) err(p.id, 'duplicate phrase id');
  seenIds.add(p.id);
  if (![1, 2, 3, 4].includes(p.level)) err(p.id, `invalid level ${p.level}`);
  if (p.modifier && p.level !== 4) err(p.id, 'modifier on non-L4 phrase');
  for (const field of ['el', 'translit', 'en', 'audio']) {
    if (!p[field] || typeof p[field] !== 'string') err(p.id, `missing field: ${field}`);
  }
  if (!Array.isArray(p.answers) || p.answers.length === 0) {
    err(p.id, 'missing answers');
  } else {
    for (const a of p.answers) {
      if (!fruitIds.has(a)) err(p.id, `answer "${a}" is not a fruit id`);
    }
  }

  const el = p.el ?? '';
  const translit = p.translit ?? '';

  // ---- transliteration: h never ch ----
  if (/ch/i.test(translit)) err(p.id, `translit contains "ch": ${translit}`);

  // ---- dashes ----
  for (const field of ['el', 'translit', 'en']) {
    if (/[–—]/.test(p[field] ?? '')) err(p.id, `em/en dash in ${field}`);
  }

  // ---- articles + gender agreement ----
  // lowercase for comparisons so sentence-initial articles (Μία, Ένα) match
  const words = el.replace(/[!;,.]/g, '').toLowerCase().split(/\s+/);
  for (const [noun, info] of Object.entries(LEXICON)) {
    // singular noun present: must be preceded by the right article,
    // optionally with a gender-agreeing adjective in between.
    const idx = words.indexOf(noun);
    if (idx !== -1) {
      const prev = words[idx - 1] ?? '';
      const prev2 = words[idx - 2] ?? '';
      const art = ARTICLES[info.gender];
      const adjOk = ADJ[info.gender].includes(prev) && prev2 === art;
      const artOk = prev === art;
      if (!artOk && !adjOk) {
        err(p.id, `"${noun}" needs "${art}" (optionally + ${ADJ[info.gender].join('/')}) before it, got "${prev2} ${prev}"`.trim());
      }
      // wrong-gender adjective directly before the noun
      const wrongAdj = ADJ[info.gender === 'n' ? 'f' : 'n'];
      if (wrongAdj.includes(prev)) err(p.id, `adjective "${prev}" does not agree with ${info.gender === 'n' ? 'neuter' : 'feminine'} "${noun}"`);
    }
    // plural noun present: must be preceded by the right quantifier.
    const pidx = words.indexOf(info.plural);
    if (pidx !== -1) {
      const prev = words[pidx - 1] ?? '';
      if (prev !== PLURAL_QUANT[info.gender]) {
        err(p.id, `plural "${info.plural}" needs "${PLURAL_QUANT[info.gender]}" before it, got "${prev}"`);
      }
    }
  }
}

// ---- fruits + silly items ----
for (const f of manifest.fruits) {
  for (const field of ['el', 'translit', 'image', 'audio']) {
    if (!f[field]) err(f.id, `fruit missing field: ${field}`);
  }
  if (/ch/i.test(f.translit ?? '')) err(f.id, `translit contains "ch": ${f.translit}`);
  if (!LEXICON[f.el]) err(f.id, `fruit noun "${f.el}" missing from linter LEXICON (add with Will's approval)`);
}
for (const s of manifest.silly) {
  for (const field of ['el', 'translit', 'reactionEl', 'reactionTranslit', 'reactionAudio']) {
    if (!s[field]) err(s.id, `silly item missing field: ${field}`);
  }
  if (/ch/i.test(`${s.translit} ${s.reactionTranslit}`)) err(s.id, 'translit contains "ch"');
}

if (errors.length) {
  console.error(`lint-greek: ${errors.length} violation(s)\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`lint-greek: OK (${manifest.phrases.length} phrases, ${manifest.fruits.length} fruits, ${manifest.silly.length} silly items)`);
