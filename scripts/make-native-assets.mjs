// Render the source images @capacitor/assets needs: a 1024 app icon and a
// 2732 splash (light + dark), using the brass medallion on felt.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets'); await mkdir(OUT, { recursive: true });

const coin = (s, inset) => `
  <div style="position:absolute;inset:${inset}%;border-radius:50%;
    background:radial-gradient(circle at 38% 32%, #f0d898 0%, #dcbb63 34%, #cba552 55%, #a9863a 78%, #8a6c2c 100%);
    box-shadow:0 ${s*0.02}px ${s*0.05}px rgba(0,0,0,.45), inset 0 ${s*0.01}px ${s*0.02}px rgba(255,255,255,.35), inset 0 -${s*0.01}px ${s*0.03}px rgba(0,0,0,.28);">
    <div style="position:absolute;inset:11%;border-radius:50%;box-shadow:inset 0 0 0 ${Math.max(2,s*0.012)}px rgba(90,66,20,.55), inset 0 0 0 ${Math.max(3,s*0.018)}px rgba(255,247,214,.35);"></div>
    ${[['♠','#211d16','top:12%;left:50%;transform:translateX(-50%)'],['♥','#9e2f26','top:50%;right:12%;transform:translateY(-50%)'],
       ['♦','#9e2f26','bottom:12%;left:50%;transform:translateX(-50%)'],['♣','#211d16','top:50%;left:12%;transform:translateY(-50%)']]
      .map(([g,c,pos])=>`<span style="position:absolute;${pos};font-family:'Iowan Old Style',Georgia,serif;font-size:${s*0.155}px;line-height:1;color:${c};text-shadow:0 1px 0 rgba(255,255,255,.25)">${g}</span>`).join('')}
  </div>`;
const page = (s, feltStops, inset) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${s}px;height:${s}px}
  .bg{width:100%;height:100%;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 42%, ${feltStops})}</style></head>
  <body><div class="bg">${coin(s, inset)}</div></body></html>`;

const b = await chromium.launch();
async function shot(name, size, stops, inset){ const p=await b.newPage({viewport:{width:size,height:size},deviceScaleFactor:1}); await p.setContent(page(size,stops,inset),{waitUntil:'load'}); await p.screenshot({path:path.join(OUT,name),type:'png'}); await p.close(); console.log('  assets/'+name+' ('+size+')'); }
await shot('icon.png',     1024, '#2c5643 0%, #163020 58%, #0d1c13 100%', 12);   // full-bleed app icon
await shot('splash.png',   2732, '#1b3527 0%, #12251a 60%, #0c1712 100%', 40);   // centred coin, felt
await shot('splash-dark.png', 2732, '#152a1f 0%, #0d1c14 60%, #081109 100%', 40);
await b.close(); console.log('done');
