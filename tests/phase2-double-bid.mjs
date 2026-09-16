/**
 * Whist — a takes prediction counts once.
 *
 * The takes buttons stay on screen for about a second after a click. When
 * south predicted last, a second click re-ran makePhase2Bid's "all bids in"
 * branch and scheduled startPhase3() twice; the doubled trick loop then froze
 * for good on trick 13. A click from a seat that isn't on turn (or has already
 * bid) could also overwrite a prediction. These tests pin the invariant:
 *
 *   one seat, one prediction, one Phase 3 — however many times it's asked.
 *
 * Run:  node tests/phase2-double-bid.mjs      (or: npm run test:phase2)
 */
import { chromium } from 'playwright';
import { ensureServer } from './static-server.mjs';

const served = process.env.WHIST_URL ? null : await ensureServer();
const URL = process.env.WHIST_URL || served.url;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ok  ' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate(() => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
});

/**
 * A dealt hand parked in Phase 2 with the given predictions already in and
 * `bidder` on turn. North won the trump at 5. Phase 3 is counted, not played:
 * the bots would otherwise start taking turns underneath the checks.
 */
async function phase2(bids, bidder) {
  await page.evaluate(({ bids, bidder }) => {
    const g = window.game;
    g.dealCards();
    g.currentPhase = 'phase2';
    g.trumpSuit = 'spades';
    g.trumpWinner = 'north';
    g.minimumTakes = 5;
    g.phase2Bids = { north: null, east: null, south: null, west: null, ...bids };
    g.currentBidder = g.players.indexOf(bidder);
    window.__phase3Starts = 0;
    g.startPhase3 = () => { window.__phase3Starts++; };
  }, { bids, bidder });
}

const clickTakes = n => page.evaluate(n =>
  document.querySelector(`.trick-btn[data-value="${n}"]`).click(), n);

// ── South predicts last and double-clicks ───────────────────────────────
await phase2({ north: 5, east: 3, west: 2 }, 'south');
await clickTakes(2);
await clickTakes(2);
await sleep(600);                           // past Turbo's 1s→100ms transition delay
let s = await page.evaluate(() => ({ starts: window.__phase3Starts, south: window.game.phase2Bids.south }));
check('double click as the last bidder starts Phase 3 once', s.starts === 1, `startPhase3 ran ${s.starts}×`);
check('the first click is the prediction that counts', s.south === 2, `south = ${s.south}`);

// ── A second, different number after bidding doesn't replace the first ──
await phase2({ north: 5, east: 3, west: 2 }, 'south');
await clickTakes(2);
await clickTakes(4);
await sleep(600);
s = await page.evaluate(() => ({ starts: window.__phase3Starts, south: window.game.phase2Bids.south }));
check('a follow-up click on another number is ignored', s.south === 2 && s.starts === 1,
  `south = ${s.south}, startPhase3 ran ${s.starts}×`);

// ── South clicks while another seat is on turn ──────────────────────────
await phase2({ north: 5, east: 3 }, 'west');
await clickTakes(3);
s = await page.evaluate(() => window.game.phase2Bids.south);
check('a click out of turn records nothing', s === null, `south = ${s}`);

// ── A bot's bid firing twice (overlapping timers) ───────────────────────
// West's own bot timer may land first in Turbo; whichever bid lands first
// must be the one that stays.
await phase2({ north: 5, east: 3 }, 'south');
await clickTakes(1);                        // south bids, west is now on turn
s = await page.evaluate(() => {
  const g = window.game;
  g.makePhase2Bid('west', 6);
  const first = g.phase2Bids.west;
  g.makePhase2Bid('west', first === 1 ? 2 : 1);
  return { first, after: g.phase2Bids.west };
});
await sleep(600);
const starts = await page.evaluate(() => window.__phase3Starts);
check("a seat's second bid is ignored", s.first !== null && s.after === s.first && starts === 1,
  `west ${s.first} → ${s.after}, startPhase3 ran ${starts}×`);

// ── Outside Phase 2 nothing is recorded ─────────────────────────────────
await phase2({}, 'south');
await page.evaluate(() => { window.game.currentPhase = 'phase3'; });
await clickTakes(3);
s = await page.evaluate(() => window.game.phase2Bids.south);
check('a stale click after Phase 2 records nothing', s === null, `south = ${s}`);

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`PHASE 2 DOUBLE BID FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`PHASE 2 DOUBLE BID PASSED ✅ (${results.length} checks: double click, late click, out of turn, bot double-fire, stale click)`);
await browser.close();
served?.close();
