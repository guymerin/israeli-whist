// One-off: render the app icons (Card Room spade on felt) at the sizes iOS/PWA
// need, using headless Chromium. Not part of the app.  node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
await mkdir(OUT, { recursive: true });

// spadeScale: fraction of the icon the spade occupies. Smaller for maskable so
// the glyph stays inside the platform's safe zone when cropped to a circle.
const icon = (spadeScale, border) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;}
  .bg{width:100%;height:100%;position:relative;overflow:hidden;
      background:radial-gradient(circle at 50% 42%, #2c5643 0%, #163020 58%, #0e2016 100%);}
  .ring{position:absolute;inset:7%;border-radius:22%;
        box-shadow: inset 0 0 0 1.6% rgba(203,165,82,.55);}
  .glow{position:absolute;left:50%;top:47%;width:64%;height:64%;transform:translate(-50%,-50%);
        background:radial-gradient(circle, rgba(203,165,82,.28), rgba(203,165,82,0) 68%);}
  .spade{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);
         font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
         color:#f1ecdd;line-height:1;text-shadow:0 2.2% 5% rgba(0,0,0,.45);}
</style></head><body>
  <div class="bg">
    ${border ? '<div class="ring"></div>' : ''}
    <div class="glow"></div>
    <div class="spade" style="font-size:${spadeScale}px">&spades;</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
async function render(name, size, spadeFrac, border) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(icon(Math.round(size * spadeFrac), border), { waitUntil: 'load' });
    await page.screenshot({ path: path.join(OUT, name), type: 'png' });
    await page.close();
    console.log(`  icons/${name} (${size}x${size})`);
}

// "any" icons: full spade + brass ring.
await render('icon-192.png', 192, 0.62, true);
await render('icon-512.png', 512, 0.62, true);
// Apple touch icon: iOS rounds corners itself, so no ring, slightly larger spade.
await render('apple-touch-icon.png', 180, 0.66, false);
// Maskable: no ring, smaller spade kept inside the circular safe zone.
await render('icon-maskable-512.png', 512, 0.5, false);

await browser.close();
console.log('done');
