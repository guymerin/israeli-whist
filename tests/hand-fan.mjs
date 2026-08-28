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

/* ── 4. with the fan on, nothing overlaps and nothing escapes ────────── */

/** Turns the fan on, lays out 13 cards, and measures what the user can hit. */
async function fanGeometry(page) {
  return page.evaluate(() => {
    document.body.classList.add('hand-fanned');
    const el = document.getElementById('south-cards');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const cards = [...el.querySelectorAll('.card')];
    const host = el.getBoundingClientRect();
    let escaped = 0, mishit = 0, tilted = 0;
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      if (b.left < host.left - 0.5 || b.right > host.right + 0.5) escaped++;
      // The point a thumb aims at must resolve to this card, not a neighbour.
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (!hit || hit.closest('.card') !== c) mishit++;
      if (getComputedStyle(c).transform !== 'none') tilted++;
    }
    return { n: cards.length, escaped, mishit, tilted };
  });
}

const geo = await fanGeometry(page);
check('the fan actually applies a transform', geo.tilted === geo.n, `${geo.tilted}/${geo.n} transformed`);
check('no card escapes the hand box', geo.escaped === 0, `${geo.escaped} escaped`);
check('every card centre hits that card', geo.mishit === 0, `${geo.mishit} mis-hits`);

/* ── 5. the lift still works when fanned ─────────────────────────────── */
const liftWorks = await page.evaluate(async () => {
  // The hand carries `transition: transform .3s ease` (styles.css), so a
  // synchronous read right after the class flip can catch the transition's
  // start value. Suppress transitions for the measurement only — the real
  // app keeps its glide.
  const kill = document.createElement('style');
  kill.textContent = '#south-cards .card { transition: none !important; }';
  document.head.appendChild(kill);
  const el = document.getElementById('south-cards');
  const card = el.querySelector('.card');
  card.classList.add('card-armed');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const m = new DOMMatrixReadOnly(getComputedStyle(card).transform);
  card.classList.remove('card-armed');
  kill.remove();
  return m.m42;   // translateY in px; the armed lift is -24
});
check('an armed card still rises', liftWorks < -20, `translateY ${liftWorks.toFixed(1)}px`);

/* ── 6. the setting persists and defaults to the current layout ──────── */
const pref = await page.evaluate(() => {
  const g = window.game;
  const key = g.HAND_LAYOUT_KEY;
  localStorage.removeItem(key);
  document.body.classList.remove('hand-fanned');
  const defaultsOff = g.applyHandLayout() === false &&
                      !document.body.classList.contains('hand-fanned');
  g.setHandLayout(true);
  const onNow = document.body.classList.contains('hand-fanned') &&
                localStorage.getItem(key) === 'fan';
  document.body.classList.remove('hand-fanned');
  const restored = g.applyHandLayout() === true &&
                   document.body.classList.contains('hand-fanned');
  const box = document.getElementById('fan-layout-checkbox');
  const boxSynced = !!box && box.checked === true;
  g.setHandLayout(false);
  const offAgain = localStorage.getItem(key) === 'rows';
  return { defaultsOff, onNow, restored, boxSynced, offAgain };
});
check('defaults to the straight rows', pref.defaultsOff);
check('turning it on sets the class and remembers it', pref.onNow);
check('a reload restores the fan', pref.restored);
check('the menu checkbox reflects the saved value', pref.boxSynced);
check('turning it off is remembered too', pref.offAgain);

/* The preference must outlive a session reset. */
const survives = await page.evaluate(() => {
  window.game.setHandLayout(true);
  window.clearWhistSession();
  return localStorage.getItem(window.game.HAND_LAYOUT_KEY) === 'fan';
});
check('clearing the session keeps the layout choice', survives);

/* ── 7. the fan applies, and stays inside the board, at every breakpoint ── */
const BREAKPOINTS = [
  { label: 'desktop',   w: 1280, h: 900 },
  { label: 'portrait',  w: 420,  h: 912 },
  { label: 'landscape', w: 844,  h: 390 }
];

for (const bp of BREAKPOINTS) {
  await page.setViewportSize({ width: bp.w, height: bp.h });
  const r = await page.evaluate(() => {
    document.body.classList.add('hand-fanned');
    const el = document.getElementById('south-cards');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const cards = [...el.querySelectorAll('.card')];
    const cs = getComputedStyle(el);
    const board = document.querySelector('.game-board').getBoundingClientRect();
    const distinct = new Set(cards.map(c => getComputedStyle(c).transform));
    let clipped = 0;
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      if (b.left < board.left - 0.5 || b.right > board.right + 0.5) clipped++;
    }
    return {
      n: cards.length,
      distinct: distinct.size,
      tilt: cs.getPropertyValue('--fan-tilt').trim(),
      bow: cs.getPropertyValue('--fan-bow').trim(),
      clipped
    };
  });
  check(`[${bp.label}] the fan is actually applied`,
    r.n === 13 && r.distinct > 1 && r.tilt !== '' && r.bow !== '',
    `${r.distinct} distinct transforms, tilt "${r.tilt}", bow "${r.bow}"`);
  check(`[${bp.label}] no card is clipped by the board`, r.clipped === 0,
    `${r.clipped} clipped`);

  /* The hand must arc the way it is DRAWN, not the way it is stored. Every
     breakpoint but portrait hides the row break, so the two logical rows are
     drawn as one row — and that row has to be one sweep. Two sweeps inside a
     single drawn row is a W, not a hand of cards, and the two inner ends
     collide where they meet. */
  const shape = await page.evaluate(() => {
    const el = document.getElementById('south-cards');
    const brk = el.querySelector('.hand-break');
    const drawnRows = brk && getComputedStyle(brk).display !== 'none' ? 2 : 1;
    const angles = [...el.querySelectorAll('.card')].map(c => {
      const m = new DOMMatrixReadOnly(getComputedStyle(c).transform);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    });
    let restarts = 0;
    for (let i = 1; i < angles.length; i++) if (angles[i] < angles[i - 1] - 0.01) restarts++;
    return {
      drawnRows, restarts,
      first: angles[0], last: angles[angles.length - 1],
      tilt: parseFloat(getComputedStyle(el).getPropertyValue('--fan-tilt'))
    };
  });
  check(`[${bp.label}] one sweep per DRAWN row`,
    shape.restarts === shape.drawnRows - 1,
    `${shape.drawnRows} drawn row(s), ${shape.restarts + 1} sweep(s)`);
  check(`[${bp.label}] the sweep reaches the full tilt at both ends`,
    Math.abs(shape.first + shape.tilt) < 0.2 && Math.abs(shape.last - shape.tilt) < 0.2,
    `${shape.first.toFixed(2)}deg … ${shape.last.toFixed(2)}deg of ${shape.tilt}deg`);
}

/* ── 8. the notch: a landscape phone's hand fits BETWEEN the safe areas ──
   The board is inset by the safe areas in landscape, but the card width was
   budgeted from 100vw, so on a notched phone the row was wider than the board
   it sits in — and the board clips, so the end cards were cut in half. The
   insets come through --sa-l / --sa-r so a test can stand in for a notch that
   Chromium has no way to emulate. */
await page.setViewportSize({ width: 912, height: 420 });
for (const fanned of [false, true]) {
  const r = await page.evaluate((fan) => {
    document.body.classList.toggle('hand-fanned', fan);
    const root = document.documentElement;
    root.style.setProperty('--sa-l', '62px');
    root.style.setProperty('--sa-r', '62px');
    const el = document.getElementById('south-cards');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const board = document.querySelector('.game-board').getBoundingClientRect();
    let clipped = 0, worst = 0;
    for (const c of el.querySelectorAll('.card')) {
      const b = c.getBoundingClientRect();
      const over = Math.max(board.left - b.left, b.right - board.right);
      if (over > 0.5) { clipped++; worst = Math.max(worst, over); }
    }
    root.style.removeProperty('--sa-l');
    root.style.removeProperty('--sa-r');
    return { clipped, worst, board: board.width };
  }, fanned);
  check(`[notched landscape${fanned ? ', fanned' : ''}] every card clears the notch`,
    r.clipped === 0, `${r.clipped} cut, worst ${r.worst.toFixed(1)}px over a ${r.board.toFixed(0)}px board`);
}

await page.setViewportSize({ width: 420, height: 912 });

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
