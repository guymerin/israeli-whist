/**
 * Israeli Whist — fanned hand layout test.
 *
 * The fan is one CSS rule fed by --fan-t, the card's place in its own row,
 * which layoutHumanHand() stamps as a number from -1 (left end) through 0
 * (centre) to +1 (right end). These tests pin two things:
 *
 *   1. --fan-t is stamped per ROW, not across the whole hand, so a two-row
 *      portrait hand gets two independent -1 … +1 sweeps
 *   2. with the fan on, no card overlaps its neighbour and no card escapes
 *      the hand's box — the whole point of arcing the existing rows rather
 *      than collapsing them into one overlapping sweep
 *
 * Run:  node tests/hand-fan.mjs      (or: npm run test:fan)
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

/** A 13-card hand that splits 6 + 7 on a suit boundary. */
const HAND = [
  { rank: '4', suit: 'clubs' }, { rank: '5', suit: 'clubs' },
  { rank: '8', suit: 'clubs' }, { rank: '9', suit: 'clubs' },
  { rank: 'Q', suit: 'clubs' }, { rank: 'A', suit: 'clubs' },
  { rank: '5', suit: 'diamonds' }, { rank: '8', suit: 'diamonds' },
  { rank: '9', suit: 'diamonds' }, { rank: '10', suit: 'diamonds' },
  { rank: '6', suit: 'spades' }, { rank: '9', suit: 'spades' },
  { rank: '3', suit: 'hearts' }
];

/** Lays `n` cards into the human seat and returns each card's --fan-t. */
async function fanValues(page, n) {
  return page.evaluate((count) => {
    const g = window.game;
    const hand = window.HAND_FIXTURE.slice(0, count);
    const el = document.getElementById('south-cards');
    g.layoutHumanHand(el, hand);
    return [...el.querySelectorAll('.card')]
      .map(c => parseFloat(c.style.getPropertyValue('--fan-t')));
  }, n);
}

const page = await browser.newPage({ viewport: { width: 420, height: 912 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate((hand) => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
  window.HAND_FIXTURE = hand;
}, HAND);

/* ── 1. a 13-card hand gets two independent sweeps ───────────────────── */
const thirteen = await fanValues(page, 13);
const split = await page.evaluate(() => window.game.findHandRowSplit(window.HAND_FIXTURE));
const rowA = thirteen.slice(0, split);
const rowB = thirteen.slice(split);
const near = (a, b) => Math.abs(a - b) < 0.001;

check('every card is stamped', thirteen.length === 13 && thirteen.every(v => Number.isFinite(v)),
  `${thirteen.filter(Number.isFinite).length}/13`);
check('row 1 runs -1 … +1', near(rowA[0], -1) && near(rowA[rowA.length - 1], 1),
  `${rowA[0]} … ${rowA[rowA.length - 1]}`);
check('row 2 runs -1 … +1 independently', near(rowB[0], -1) && near(rowB[rowB.length - 1], 1),
  `${rowB[0]} … ${rowB[rowB.length - 1]}`);
check('each row is symmetric about 0',
  near(rowA.reduce((a, b) => a + b, 0), 0) && near(rowB.reduce((a, b) => a + b, 0), 0));
check('values increase left to right',
  rowA.every((v, i) => i === 0 || v > rowA[i - 1]) &&
  rowB.every((v, i) => i === 0 || v > rowB[i - 1]));

/* ── 2. a short hand is one row ──────────────────────────────────────── */
const five = await fanValues(page, 5);
check('a 5-card hand is a single sweep',
  five.length === 5 && near(five[0], -1) && near(five[4], 1) && near(five[2], 0),
  five.join(', '));

/* ── 3. a single card sits upright ───────────────────────────────────── */
const one = await fanValues(page, 1);
check('a lone card is centred, not tilted', one.length === 1 && near(one[0], 0), String(one[0]));

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`HAND FAN FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`HAND FAN PASSED ✅ (${results.length} checks: per-row sweep, symmetry, short hands)`);
await browser.close();
served?.close();
