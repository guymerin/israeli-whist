// One-off: render the app icons — a brass "card-room" medallion with the four
// suits in a rosette, on deep felt — at the sizes iOS/PWA need, using headless
// Chromium. Not part of the app.  node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
await mkdir(OUT, { recursive: true });

// coinInset: distance from icon edge to the coin (bigger inset = smaller coin,
// used for the maskable icon so the coin stays inside the circular safe zone).
const icon = (size, coinInset, felt = true) => {
  const s = size;
  const suit = Math.round(s * 0.155);       // suit glyph size
  const ring1 = Math.max(2, Math.round(s * 0.012));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${s}px;height:${s}px}
    .bg{width:100%;height:100%;position:relative;overflow:hidden;
        background:${felt ? `radial-gradient(circle at 50% 40%, #2c5643 0%, #163020 58%, #0d1c13 100%)` : '#163020'};}
    .coin{position:absolute;inset:${coinInset}%;border-radius:50%;
      background:
        radial-gradient(circle at 38% 32%, #f0d898 0%, #dcbb63 34%, #cba552 55%, #a9863a 78%, #8a6c2c 100%);
      box-shadow:
        0 ${Math.round(s*0.02)}px ${Math.round(s*0.05)}px rgba(0,0,0,.45),
        inset 0 ${Math.round(s*0.01)}px ${Math.round(s*0.02)}px rgba(255,255,255,.35),
        inset 0 -${Math.round(s*0.01)}px ${Math.round(s*0.03)}px rgba(0,0,0,.28);}
    /* engraved inner ring where the suits sit */
    .ring{position:absolute;inset:${coinInset+ (14*32/ s)}%;}
    .ring2{position:absolute;border-radius:50%;
      box-shadow: inset 0 0 0 ${ring1}px rgba(90,66,20,.55), inset 0 0 0 ${ring1+Math.max(1,Math.round(s*0.006))}px rgba(255,247,214,.35);}
    .s{position:absolute;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
       font-size:${suit}px;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,.25), 0 -1px 1px rgba(0,0,0,.25);}
    .ink{color:#211d16;} .red{color:#9e2f26;}
  </style></head><body>
    <div class="bg">
      <div class="coin">
        <div class="ring2" style="inset:11%;"></div>
        <span class="s ink" style="top:12%;left:50%;transform:translateX(-50%)">&spades;</span>
        <span class="s red"  style="top:50%;right:12%;transform:translateY(-50%)">&hearts;</span>
        <span class="s red"  style="bottom:12%;left:50%;transform:translateX(-50%)">&diams;</span>
        <span class="s ink"  style="top:50%;left:12%;transform:translateY(-50%)">&clubs;</span>
      </div>
    </div>
  </body></html>`;
};

const browser = await chromium.launch();
async function render(name, size, coinInset, felt) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(icon(size, coinInset, felt), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(OUT, name), type: 'png' });
  await page.close();
  console.log(`  icons/${name} (${size}x${size})`);
}

// "any" icons: coin near the edges on felt.
await render('icon-192.png', 192, 12, true);
await render('icon-512.png', 512, 12, true);
// Apple touch icon: iOS rounds corners; full-bleed felt, coin slightly larger.
await render('apple-touch-icon.png', 180, 11, true);
// Maskable: bigger inset so the coin stays within the circular safe zone.
await render('icon-maskable-512.png', 512, 20, true);

await browser.close();
console.log('done');
