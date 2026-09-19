/**
 * Whist — the App Store rating ask fires once, and only on a win.
 *
 * `maybeAskForRating()` is the web half of the native ReviewPrompt plugin
 * (ios/App/App/ReviewPrompt.swift). Apple caps the real prompt at three a year
 * per user and silently drops the rest, so an ask spent on the wrong moment is
 * an ask wasted for months. The rules this pins:
 *
 *   one ask per release, only after the human wins a full game, never in a
 *   browser — and never a thrown error if the bridge isn't there.
 *
 * Run:  node tests/review-prompt.mjs      (or: npm run test:review)
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

// Stand in for the native plugin: the bridge only exists inside the packaged
// app, so the browser has to fake it to see anything at all.
await page.evaluate(() => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
  window.__asks = 0;
  window.Capacitor = { Plugins: { ReviewPrompt: { request: () => { window.__asks++; return Promise.resolve({ requested: true }); } } } };
});

/**
 * A finished gamlet that ends the full game, with `winner` on 195 points and
 * everyone else on nothing. Each seat's prediction is exact, so scoring runs
 * (a gamlet where everybody misses is cancelled unscored) and the leader after
 * it is the seat we put there.
 */
const endFullGameWon = winner => page.evaluate(w => {
  const g = window.game;
  g.currentPhase = 'phase3';
  g.gamletNumber = 1;
  g.trumpSuit = 'spades';
  g.trumpWinner = w;
  g.handType = 'under';
  g.players.forEach(p => { g.gameScores[p] = p === w ? 195 : 0; });
  g.phase2Bids = { north: 3, east: 3, south: 3, west: 3 };
  g.tricksWon  = { north: 3, east: 3, south: 3, west: 3 };
  g.endHand();
}, winner);

// ── 1. the human wins the full game → exactly one ask ─────────────────────
await endFullGameWon('south');
await sleep(3000);
let asks = await page.evaluate(() => window.__asks);
check('a full-game win asks for a rating', asks === 1, `${asks} ask(s)`);

const tag = await page.evaluate(() => localStorage.getItem('israeliWhist_reviewAsked'));
check('the ask is latched in localStorage', !!tag, `tag=${tag}`);

// ── 2. winning again in the same release doesn't ask again ────────────────
await endFullGameWon('south');
await sleep(3000);
asks = await page.evaluate(() => window.__asks);
check('a second win in the same release stays silent', asks === 1, `${asks} ask(s)`);

// ── 3. a bot winning never asks, latch or no latch ────────────────────────
await page.evaluate(() => { localStorage.removeItem('israeliWhist_reviewAsked'); });
await endFullGameWon('north');
await sleep(3000);
asks = await page.evaluate(() => window.__asks);
check('a bot winning the full game never asks', asks === 1, `${asks} ask(s)`);

// ── 4. no bridge (a browser) → no ask, no error ───────────────────────────
await page.evaluate(() => {
  delete window.Capacitor;
  localStorage.removeItem('israeliWhist_reviewAsked');
  window.game.maybeAskForRating();
});
await sleep(300);
const latched = await page.evaluate(() => localStorage.getItem('israeliWhist_reviewAsked'));
check('no native bridge: nothing asked and nothing latched', latched === null, `tag=${latched}`);
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
if (served) served.close();

const failed = results.filter(r => !r.pass);
console.log('\n=== RESULT ===');
if (failed.length) {
  console.log(`REVIEW PROMPT FAILED ❌ (${failed.length} of ${results.length})`);
  process.exit(1);
}
console.log(`REVIEW PROMPT PASSED ✅ (${results.length} checks: one ask per release, winners only, browser-safe)`);
