// One-off: render the PWA/web icons — the Whist mark (four cards crossed in a
// cream ring on felt; see scripts/icon-art.mjs) — at the sizes iOS/PWA need,
// using headless Chromium. Not part of the app.  node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { whistMark } from './icon-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
async function render(name, size, radius) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0}</style>${whistMark(size, radius)}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(OUT, name), type: 'png' });
  await page.close();
  console.log(`  icons/${name} (${size}x${size})`);
}

// "any" icons: the ring close to the edges.
await render('icon-192.png', 192, 0.365);
await render('icon-512.png', 512, 0.365);
// Apple touch icon: iOS rounds the corners itself, so full-bleed felt.
await render('apple-touch-icon.png', 180, 0.375);
// Maskable: a smaller ring so the mark survives an aggressive circular crop.
await render('icon-maskable-512.png', 512, 0.30);

await browser.close();
console.log('done');
