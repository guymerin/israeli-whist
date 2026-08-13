// Render the source images @capacitor/assets needs: a 1024 app icon and a
// 2732 splash (light + dark), using the Whist mark — four cards crossed in a
// cream ring on felt. The artwork itself lives in scripts/icon-art.mjs so the
// web icons (scripts/make-icons.mjs) and the native ones can't drift apart.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { whistMark, whistSplash } from './icon-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets'); await mkdir(OUT, { recursive: true });

const b = await chromium.launch();
async function shot(name, size, svg) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0}</style>${svg}`, { waitUntil: 'load' });
  await p.screenshot({ path: path.join(OUT, name), type: 'png' });
  await p.close();
  console.log('  assets/' + name + ' (' + size + ')');
}

await shot('icon.png', 1024, whistMark(1024));                  // full-bleed app icon
await shot('splash.png', 2732, whistSplash(2732, false));       // centred mark on felt
await shot('splash-dark.png', 2732, whistSplash(2732, true));

await b.close(); console.log('done');
