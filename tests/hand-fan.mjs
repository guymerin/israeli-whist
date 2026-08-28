/**
 * Israeli Whist — fanned hand layout test.
 *
 * The fan is one CSS rule fed by --fan-t, the card's place in its own row,
 * which layoutHumanHand() stamps as a number from -1 (left end) through 0
 * (centre) to +1 (right end). These tests pin two things:
 *
 *   1. --fan-t is stamped per ROW, not across the whole hand, so a two-row
 *      portrait hand gets two independent -1 … +1 sweeps, and the rows the
 *      hand is broken into are even (6 + 7), not suit-shaped
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

/** A 13-card hand; every hand splits 6 + 7, straight down the middle. */
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

/* ── 1b. the two rows are even, whatever the suits do ────────────────── */
const splits = await page.evaluate(() => {
  const g = window.game;
  const S = ['clubs', 'diamonds', 'spades', 'hearts'];
  /** Builds a hand with the given suit lengths, e.g. [4,4,2,3]. */
  const hand = lens => lens.flatMap((n, i) =>
    Array.from({ length: n }, (_, k) => ({ rank: String(2 + k), suit: S[i] })));
  const shapes = [[4, 4, 2, 3], [6, 4, 2, 1], [13, 0, 0, 0], [5, 3, 3, 2], [4, 3, 3, 3]];
  return shapes.map(sh => {
    const cards = hand(sh);
    const at = g.findHandRowSplit(cards);
    return { shape: sh.join('-'), top: at, bottom: cards.length - at };
  });
});
check('a 13-card hand always splits 6 + 7',
  splits.every(s => s.top === 6 && s.bottom === 7),
  splits.map(s => `${s.shape}: ${s.top}+${s.bottom}`).join(', '));

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
    const el = document.getElementById('south-cards');
    document.body.classList.remove('hand-fanned');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const plainPeak = Math.min(...[...el.querySelectorAll('.card')].map(c => c.getBoundingClientRect().top));
    document.body.classList.add('hand-fanned');
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
    const el = document.getElementById('south-cards');
    document.body.classList.remove('hand-fanned');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const plainPeak = Math.min(...[...el.querySelectorAll('.card')].map(c => c.getBoundingClientRect().top));
    document.body.classList.add('hand-fanned');
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


/* ── 9. landscape is a HELD fan, not a curved row ───────────────────────
   One row of 13 with room to spare is the only place a real fan fits, so
   landscape overlaps its cards, sweeps them 36deg end to end and pivots them
   about a point far below the felt. The three things that can go wrong with a
   fan that size, at every landscape phone: it runs off the board's sides, it
   drops its end cards off the bottom edge, or its peak rises into the trick
   square, which paints above the seats and would swallow the taps. */
const LANDSCAPES = [
  { label: 'Air',      w: 912, h: 420, l: 62, r: 62, b: 21, deep: true },
  { label: '16',       w: 874, h: 402, l: 59, r: 59, b: 21, deep: true },
  { label: '14',       w: 844, h: 390, l: 47, r: 47, b: 21, deep: false },
  { label: 'SE-ish',   w: 780, h: 360, l: 47, r: 34, b: 21, deep: false },
  { label: 'no-notch', w: 667, h: 375, l: 0, r: 0, b: 0, deep: false }
];

/* Every measurement below is taken right after a class flip or a viewport
   change, and the seats and cards both carry transitions -- a synchronous read
   would catch the transition's START value and quietly measure the old layout.
   (Section 5 hits the same trap.) */
await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });

for (const lp of LANDSCAPES) {
  await page.setViewportSize({ width: lp.w, height: lp.h });
  const r = await page.evaluate((sa) => {
    const root = document.documentElement;
    root.style.setProperty('--sa-l', sa.l + 'px');
    root.style.setProperty('--sa-r', sa.r + 'px');
    root.style.setProperty('--sa-b', sa.b + 'px');
    const el = document.getElementById('south-cards');
    document.body.classList.remove('hand-fanned');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const plainPeak = Math.min(...[...el.querySelectorAll('.card')].map(c => c.getBoundingClientRect().top));
    document.body.classList.add('hand-fanned');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const cards = [...el.querySelectorAll('.card')];
    const rects = cards.map(c => c.getBoundingClientRect());
    const board = document.querySelector('.game-board').getBoundingClientRect();
    const safeBottom = innerHeight - sa.b;
    let clipped = 0, mishit = 0, centreBelow = 0;
    rects.forEach((b, i) => {
      if (b.left < board.left - 0.5 || b.right > board.right + 0.5) clipped++;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (cy > safeBottom) centreBelow++;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || hit.closest('.card') !== cards[i]) mishit++;
    });
    let pitch = Infinity;
    for (let i = 0; i < rects.length - 1; i++) pitch = Math.min(pitch, rects[i + 1].left - rects[i].left);
    // A fan this tall is one lift away from covering the two things above it:
    // the player's own bid/takes chip, and the trick square.
    const plate = document.querySelector('.south-player .player-info').getBoundingClientRect();
    const trick = document.querySelector('.trick-area').getBoundingClientRect();
    const peak = Math.min(...rects.map(r => r.top));
    // The chip sits directly on top of the row, so its bottom edge and the
    // fan's peak touch by construction; what must not happen is the fan
    // rising INTO it.
    const coversPlate = peak < plate.bottom - 4;
    const coversTrick = peak < trick.bottom - 0.5;
    root.style.removeProperty('--sa-l');
    root.style.removeProperty('--sa-r');
    root.style.removeProperty('--sa-b');
    // offsetWidth, not the rect: a rotated card's bounding box is wider than
    // the card, which would read as overlap on a row that has none.
    return { clipped, mishit, centreBelow, pitch, width: cards[0].offsetWidth, n: cards.length,
             coversPlate, coversTrick, peak: +peak.toFixed(0), plainPeak: +plainPeak.toFixed(0),
             bow: parseFloat(getComputedStyle(el).getPropertyValue('--fan-bow')) || 0,
             plateBottom: +plate.bottom.toFixed(0), trickBottom: +trick.bottom.toFixed(0) };
  }, lp);

  if (lp.deep) {
    check(`[landscape ${lp.label}] the cards overlap like a held fan`,
      r.pitch < r.width - 4, `${r.pitch.toFixed(1)}px of a ${r.width.toFixed(1)}px card showing`);
  } else {
    // Too short for the held fan: it keeps the gentle arc, and the cards it
    // leaves apart must stay wide enough to hit.
    check(`[landscape ${lp.label}] the short-screen arc keeps full-width cards`,
      r.pitch >= r.width - 4 && r.width >= 40,
      `${r.pitch.toFixed(1)}px pitch, ${r.width.toFixed(1)}px cards`);
  }
  check(`[landscape ${lp.label}] no card is clipped by the board`, r.clipped === 0, `${r.clipped} clipped`);
  check(`[landscape ${lp.label}] no card's centre falls off the bottom`, r.centreBelow === 0,
    `${r.centreBelow} below the safe area`);
  check(`[landscape ${lp.label}] every card centre still hits that card`, r.mishit === 0,
    `${r.mishit}/${r.n} mis-hits`);
  check(`[landscape ${lp.label}] the fan clears your own bid/takes chip`, !r.coversPlate,
    `peak ${r.peak} vs chip bottom ${r.plateBottom}`);
  if (lp.deep) {
    check(`[landscape ${lp.label}] the fan clears the trick square`, !r.coversTrick,
      `peak ${r.peak} vs trick bottom ${r.trickBottom}`);
  } else {
    // A short screen's plain row already sits within a few px of the trick
    // square, so the guard here is that the arc lifts the row by its declared
    // bow and not a pixel more -- a far pivot can raise a row all on its own.
    check(`[landscape ${lp.label}] the arc rises by its bow, no more`,
      r.peak >= r.plainPeak + r.bow - 4,
      `peak ${r.peak} vs plain row ${r.plainPeak} with a ${r.bow}px bow`);
  }
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
