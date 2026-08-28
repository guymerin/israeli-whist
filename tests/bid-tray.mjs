/**
 * Israeli Whist — the bid trays must never sit on the player's cards.
 *
 * Portrait phones lay the game out as a flex column inside .game-container,
 * which is padded by the safe areas; the two bid trays are position: fixed and
 * were centred on the RAW viewport instead, with only a vh cap for height. On
 * a phone with a notch and a home indicator the hand rises and the chrome
 * drops, but the tray did not move — so its lower half landed on the top row
 * of the hand and hid the ranks. These tests pin the invariant that fixes:
 *
 *   at every phone size, with the safe areas of a real phone, neither tray
 *   overlaps a single card, and neither tray runs off-screen.
 *
 * The insets come through --sa-t / --sa-b / --sa-l / --sa-r (:root, section 0
 * of theme-cardroom.css) precisely so a test can stand in for a notch that
 * Chromium cannot emulate.
 *
 * Run:  node tests/bid-tray.mjs      (or: npm run test:tray)
 */
import { chromium } from 'playwright';
import { ensureServer } from './static-server.mjs';

const served = process.env.WHIST_URL ? null : await ensureServer();
const URL = process.env.WHIST_URL || served.url;

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ok  ' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/* Real phones, with the safe areas iOS actually reports in portrait. */
const PHONES = [
  { label: 'iPhone Air',  w: 420, h: 912, t: 59, b: 34 },
  { label: 'iPhone 16',   w: 402, h: 874, t: 59, b: 34 },
  { label: 'iPhone 12',   w: 390, h: 844, t: 47, b: 34 },
  { label: 'iPhone mini', w: 375, h: 812, t: 44, b: 34 }
];

const page = await browser.newPage({ viewport: { width: 420, height: 912 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate(() => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
});

/**
 * Shows one tray over a freshly dealt hand and measures the collision.
 * `phase` is 'phase1' (trump bidding) or 'phase2' (takes, as the trump winner
 * with a minimum of 6 — the tallest the tray ever gets).
 */
async function trayVsHand(page, phase, fanned) {
  return page.evaluate(({ phase, fanned }) => {
    const g = window.game;
    g.setHandLayout(fanned);
    g.dealCards();
    g.hideBiddingInterface();
    document.getElementById('second-phase-bidding').style.display = 'none';

    let tray;
    if (phase === 'phase1') {
      g.currentPhase = 'phase1';
      g.currentBidder = g.southIndex;
      g.showBiddingInterface();
      tray = document.getElementById('bidding-interface');
    } else {
      g.currentPhase = 'phase2';
      g.trumpSuit = 'hearts';
      g.trumpWinner = 'south';
      g.minimumTakes = 6;
      g.currentBidder = g.southIndex;
      g.showPhase2Interface();
      g.showHumanPhase2Controls();
      tray = document.getElementById('second-phase-bidding');
    }
    g.layoutHumanHand(document.getElementById('south-cards'), g.sortCards(g.hands.south));

    const t = tray.getBoundingClientRect();
    const cards = [...document.querySelectorAll('#south-cards .card')];
    let covered = 0, worst = 0;
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      const over = Math.min(t.bottom, b.bottom) - Math.max(t.top, b.top);
      const across = Math.min(t.right, b.right) - Math.max(t.left, b.left);
      if (over > 0.5 && across > 0.5) { covered++; worst = Math.max(worst, over); }
    }
    const sa = getComputedStyle(document.documentElement);
    return {
      covered, worst, n: cards.length,
      trayTop: t.top, trayBottom: t.bottom, trayH: t.height,
      safeTop: parseFloat(sa.getPropertyValue('--sa-t')) || 0,
      safeBottom: innerHeight - (parseFloat(sa.getPropertyValue('--sa-b')) || 0)
    };
  }, { phase, fanned });
}

for (const p of PHONES) {
  await page.setViewportSize({ width: p.w, height: p.h });
  await page.evaluate(({ t, b }) => {
    document.documentElement.style.setProperty('--sa-t', t + 'px');
    document.documentElement.style.setProperty('--sa-b', b + 'px');
  }, p);

  for (const phase of ['phase1', 'phase2']) {
    for (const fanned of [false, true]) {
      const r = await trayVsHand(page, phase, fanned);
      const who = `${p.label} ${phase}${fanned ? ' fanned' : ''}`;
      check(`[${who}] the tray covers no card`, r.covered === 0,
        `${r.covered}/${r.n} covered by up to ${r.worst.toFixed(1)}px`);
      check(`[${who}] the tray stays inside the safe area`,
        r.trayTop >= r.safeTop - 0.5 && r.trayBottom <= r.safeBottom + 0.5,
        `tray ${r.trayTop.toFixed(0)}..${r.trayBottom.toFixed(0)} in ${r.safeTop.toFixed(0)}..${r.safeBottom.toFixed(0)}`);
    }
  }
}

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`BID TRAY FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`BID TRAY PASSED ✅ (${results.length} checks: both trays × ${PHONES.length} phones × rows and fanned)`);
await browser.close();
served?.close();
