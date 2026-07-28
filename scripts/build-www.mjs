// Assemble a clean web bundle for Capacitor into www/ — just the game's runtime
// files, none of the repo tooling (node_modules, tests, scripts, .git).
// Capacitor's webDir points here.   node scripts/build-www.mjs
import { rm, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(ROOT, 'www');

// Everything index.html loads at runtime.
const FILES = [
  'index.html', 'script.js', 'mc-engine.js', 'styles.css', 'theme-cardroom.css',
  'manifest.webmanifest', 'sw.js',
];
const DIRS = ['fonts', 'icons'];

await rm(WWW, { recursive: true, force: true });
await mkdir(WWW, { recursive: true });
for (const f of FILES) await cp(path.join(ROOT, f), path.join(WWW, f));
for (const d of DIRS) await cp(path.join(ROOT, d), path.join(WWW, d), { recursive: true });

console.log(`www/ assembled: ${FILES.length} files + ${DIRS.join(', ')}/`);
