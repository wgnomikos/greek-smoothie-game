// Scans public/audio/ and public/images/ and emits an index of what's
// actually on disk. The game uses this at runtime to choose between
// real audio/photos and TTS/emoji placeholders. Ensures that recording
// 3 words ships 3 words, not "all 24 or nothing."
//
// Run automatically by `npm run dev` and `npm run build`.

import { readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const audioRoot = join(root, 'public', 'audio');
const imageRoot = join(root, 'public', 'images');

function listFiles(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith('.')) continue; // skip .gitkeep, .DS_Store
    if (entry.isDirectory()) {
      const sub = listFiles(join(dir, name), exts);
      out.push(...sub.map((s) => `${name}/${s}`));
    } else if (exts.some((e) => name.toLowerCase().endsWith(e))) {
      out.push(name);
    }
  }
  return out;
}

const audio = listFiles(audioRoot, ['.m4a', '.mp3']);
const images = listFiles(imageRoot, ['.jpg', '.jpeg', '.png', '.webp']);

const outPath = join(root, 'src', 'data', 'assets.generated.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ audio, images }, null, 2) + '\n');

console.log(
  `Asset index: ${audio.length} audio + ${images.length} image files → ${outPath}`,
);
