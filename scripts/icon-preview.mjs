// Preview several app-icon directions side by side to choose from.
// node scripts/icon-preview.mjs  → writes scratch previews.
import { chromium } from 'playwright';
import path from 'node:path';
const OUT = '/private/tmp/claude-501/-Users-guymerin-Projects-israeli-whist/2e30149d-c394-4ad6-a594-b0bb52c447d0/scratchpad';

const FELT = 'radial-gradient(circle at 50% 40%, #2c5643 0%, #163020 60%, #0e2016 100%)';
const RED = '#c0433a', INK = '#20242a', IVORY = '#f3eede', BRASS = '#cba552';

// A: fanned hand of four cards, one suit each
const A = `<div style="width:100%;height:100%;background:${FELT};position:relative;overflow:hidden;">
  ${[['♣',INK,-24],['♦',RED,-8],['♥',RED,8],['♠',INK,24]].map(([s,c,r],i)=>`
    <div style="position:absolute;left:50%;bottom:14%;width:34%;height:50%;
      transform:translateX(-50%) rotate(${r}deg);transform-origin:50% 92%;
      background:linear-gradient(160deg,#fff,${IVORY});border:2px solid ${BRASS};border-radius:12px;
      box-shadow:0 6px 14px rgba(0,0,0,.35);display:grid;place-items:center;z-index:${i};">
      <span style="font-family:'Iowan Old Style',Georgia,serif;font-size:60px;color:${c};">${s}</span>
    </div>`).join('')}
</div>`;

// B: brass medallion with a four-suit rosette
const B = `<div style="width:100%;height:100%;background:${FELT};position:relative;display:grid;place-items:center;overflow:hidden;">
  <div style="width:66%;height:66%;border-radius:50%;background:radial-gradient(circle at 40% 35%, #e6c877, ${BRASS} 55%, #8f6f2c);
    box-shadow:0 8px 20px rgba(0,0,0,.4), inset 0 0 0 5px rgba(255,255,255,.15), inset 0 0 0 10px rgba(0,0,0,.12);
    position:relative;">
    ${[['♠',INK,'top:9%;left:50%;transform:translateX(-50%)'],['♥',RED,'top:50%;right:9%;transform:translateY(-50%)'],
       ['♦',RED,'bottom:9%;left:50%;transform:translateX(-50%)'],['♣',INK,'top:50%;left:9%;transform:translateY(-50%)']]
      .map(([s,c,pos])=>`<span style="position:absolute;${pos};font-family:Georgia,serif;font-size:52px;color:${c};">${s}</span>`).join('')}
  </div>
</div>`;

// C: single card with a big spade + IW monogram (heritage playing-card look)
const C = `<div style="width:100%;height:100%;background:${FELT};position:relative;display:grid;place-items:center;overflow:hidden;">
  <div style="width:56%;height:74%;background:linear-gradient(160deg,#fff,${IVORY});border-radius:16px;border:2px solid ${BRASS};
    box-shadow:0 10px 24px rgba(0,0,0,.4);position:relative;display:grid;place-items:center;">
    <span style="font-family:'Iowan Old Style',Georgia,serif;font-size:150px;color:${INK};line-height:1;">♠</span>
    <span style="position:absolute;top:6%;left:9%;font-family:Georgia,serif;font-weight:700;font-size:34px;color:${BRASS};">A</span>
    <span style="position:absolute;bottom:6%;right:9%;font-family:Georgia,serif;font-weight:700;font-size:22px;color:${RED};">IW</span>
  </div>
</div>`;

// D: two overlapping suit "pips" as a bold mark — spade + heart, brass ring
const D = `<div style="width:100%;height:100%;background:${FELT};position:relative;display:grid;place-items:center;overflow:hidden;">
  <div style="position:absolute;inset:8%;border-radius:24%;box-shadow:inset 0 0 0 3px rgba(203,165,82,.5);"></div>
  <span style="position:absolute;font-family:Georgia,serif;font-size:230px;color:${IVORY};transform:translate(-14%,-4%);">♠</span>
  <span style="position:absolute;font-family:Georgia,serif;font-size:120px;color:${RED};transform:translate(48%,40%);text-shadow:0 3px 8px rgba(0,0,0,.4);">♥</span>
</div>`;

const variants = { A, B, C, D };
const b = await chromium.launch();
for (const [name, html] of Object.entries(variants)) {
  const page = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(OUT, `iconopt-${name}.png`) });
  await page.close();
  console.log(`iconopt-${name}.png`);
}
await b.close();
