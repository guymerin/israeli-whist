/**
 * Monte Carlo engine unit/parity checks — runs the REAL methods on window.game.
 *
 * Loads the page (so window.game and its mc* methods exist) and, with no game
 * driving needed, calls the engine with controlled inputs to verify:
 *   1. mcTrickWinner agrees with the live determineTrickWinner over random tricks.
 *   2. mcPlayout of a full random 4×13 deal always resolves exactly 13 tricks.
 *   3. mcSampleDeal produces consistent deals (sizes, full coverage, no dups,
 *      acting seat keeps its hand) and respects suitVoids constraints.
 *
 * Run: serve repo (python3 -m http.server 8000), then `node tests/mc-parity.mjs`.
 * Exits non-zero on any failure.
 */
import { chromium } from 'playwright';

const URL = process.env.WHIST_URL || 'http://localhost:8000/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });

const result = await page.evaluate(() => {
  const g = window.game;
  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const fails = [];
  const ri = n => (Math.random() * n) | 0;

  // ---- 1. Trick-winner parity vs determineTrickWinner ----
  const savedTrick = g.currentTrick, savedTrump = g.trumpSuit;
  let parityChecked = 0;
  for (let it = 0; it < 5000; it++) {
    // 4 distinct cards
    const ids = new Set();
    while (ids.size < 4) ids.add(ri(52));
    const cardIds = [...ids];
    const seatsPerm = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const trumpChoice = ri(5); // 0..3 suit, 4 = notrump
    const trumpSuit = trumpChoice < 4 ? SUITS[trumpChoice] : 'notrump';
    const trumpIdx = trumpChoice < 4 ? trumpChoice : -1;

    const objTrick = cardIds.map((id, i) => ({ player: g.players[seatsPerm[i]], card: g.mcDecode(id) }));
    const intTrick = cardIds.map((id, i) => ({ seat: seatsPerm[i], card: id }));

    g.currentTrick = objTrick;
    g.trumpSuit = trumpSuit;
    const winA = g.determineTrickWinner();          // real method, object cards
    const winB = g.players[g.mcTrickWinner(intTrick, trumpIdx)]; // int method
    if (winA !== winB) {
      fails.push(`parity: trump=${trumpSuit} cards=${cardIds} → DTW=${winA} MC=${winB}`);
      if (fails.length > 5) break;
    }
    parityChecked++;
  }
  g.currentTrick = savedTrick; g.trumpSuit = savedTrump;

  // ---- 2. Playout always resolves 13 tricks ----
  let playoutChecked = 0;
  for (let it = 0; it < 2000; it++) {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    g._mcShuffle(deck);
    const hands = [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39, 52)];
    const sim = {
      hands, trumpIdx: ri(5) < 4 ? ri(4) : -1, leader: ri(4),
      trick: [], tricksWon: new Int32Array(4), bids: [0, 0, 0, 0], allWant: it % 2 === 0
    };
    const tw = g.mcPlayout(sim);
    const sum = tw[0] + tw[1] + tw[2] + tw[3];
    if (sum !== 13) { fails.push(`playout: sum=${sum} (expected 13)`); break; }
    playoutChecked++;
  }

  // ---- 3. Sampler consistency + void respect ----
  // Acting seat 0 holds ids 0..12; pool = 13..51; others need 13 each.
  const mkPs = (voids) => ({
    actingIdx: 0,
    trumpIdx: 0,
    ownHand: Array.from({ length: 13 }, (_, i) => i),
    need: [13, 13, 13, 13],
    won: [0, 0, 0, 0],
    bids: [0, 0, 0, 0],
    voids: voids || [[false, false, false, false], [false, false, false, false], [false, false, false, false], [false, false, false, false]],
    pool: Array.from({ length: 39 }, (_, i) => i + 13),
    trickInts: [],
    leader: 0
  });

  let samplerChecked = 0;
  for (let it = 0; it < 300; it++) {
    const ps = mkPs();
    const deal = g.mcSampleDeal(ps);
    if (!deal) { fails.push('sampler: returned null on unconstrained deal'); break; }
    const sizes = deal.map(h => h.length);
    if (sizes.join(',') !== '13,13,13,13') { fails.push(`sampler: sizes=${sizes}`); break; }
    if (deal[0].join(',') !== ps.ownHand.join(',')) { fails.push('sampler: acting hand changed'); break; }
    const all = new Set([...deal[0], ...deal[1], ...deal[2], ...deal[3]]);
    if (all.size !== 52) { fails.push(`sampler: coverage=${all.size} (dups or gaps)`); break; }
    samplerChecked++;
  }

  // Void respect: seat 1 void in clubs (suit 0) and hearts (suit 2).
  let voidChecked = 0;
  for (let it = 0; it < 300; it++) {
    const voids = [[false, false, false, false], [true, false, true, false], [false, false, false, false], [false, false, false, false]];
    const ps = mkPs(voids);
    const deal = g.mcSampleDeal(ps);
    if (!deal) { fails.push('sampler(void): returned null'); break; }
    const seat1 = deal[1];
    const bad = seat1.some(id => { const s = (id / 13) | 0; return s === 0 || s === 2; });
    if (bad) { fails.push('sampler(void): seat1 got a void suit card'); break; }
    voidChecked++;
  }

  return { fails, parityChecked, playoutChecked, samplerChecked, voidChecked };
});

await browser.close();

console.log(`parity tricks checked : ${result.parityChecked}/5000`);
console.log(`playouts checked      : ${result.playoutChecked}/2000`);
console.log(`sampler deals checked : ${result.samplerChecked}/300`);
console.log(`void-respect checked  : ${result.voidChecked}/300`);
if (errors.length) result.fails.push(...errors);

console.log('\n=== RESULT ===');
if (result.fails.length) {
  console.log('MC PARITY/UNIT FAILED:');
  for (const f of result.fails.slice(0, 10)) console.log('  - ' + f);
  process.exit(1);
}
console.log('MC PARITY/UNIT PASSED ✅ (trick-winner parity, playout=13, sampler sizes/coverage/voids)');
