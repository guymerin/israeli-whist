/**
 * Israeli Whist — card selection interaction test.
 *
 * Selection in Phase 3 is deliberately two-stage (see "Card selection" in
 * script.js): a press lifts a card out of the fan and only a drag onto the
 * trick area or a second tap commits it. On a phone each card is a ~22px
 * sliver, so the whole point is that a single stray touch can NEVER play a
 * card. These tests pin that contract:
 *
 *   1. one tap arms and plays nothing
 *   2. a second tap on the armed card plays it
 *   3. tapping a different card moves the lift instead of playing
 *   4. drag onto the trick area plays
 *   5. drag released away from the trick area plays nothing, stays lifted
 *   6. tapping the trick area plays the lifted card
 *   7. a card that breaks follow-suit is dimmed and refuses the lift
 *   8. mouse hover lifts the card under the cursor
 *   9. pressing and sliding along the fan moves the lift (touch's hover)
 *  10. pressing and pulling up carries the card immediately — press to table
 *      in one movement, without a separate lift step
 *
 * The board is driven straight into a known Phase 3 position rather than
 * bidding its way there, so each case is deterministic.
 *
 * Run:  node tests/card-selection.mjs      (or: npm run test:cards)
 */
import { chromium } from 'playwright';
import { ensureServer } from './static-server.mjs';

const served = process.env.WHIST_URL ? null : await ensureServer();
const URL = process.env.WHIST_URL || served.url;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate(() => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;   // stale timers from a finished case resolve quickly
});

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ok  ' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/** Puts south on lead (or on turn behind `led`) with a known hand. */
async function setUp(led = null) {
  // Park the state machine and let the previous case's timers drain before
  // forcing a new position. Without this the bots keep answering in the
  // background, tricks complete, and the gamlet can end and re-deal in the
  // middle of a case. Phase stays non-'phase3' so playCard() refuses, and the
  // old trick is left in place so a late nextPlayerInTrick() still finds a
  // seat to read.
  await page.evaluate(() => { window.game.currentPhase = 'idle'; });
  await page.waitForTimeout(700);
  await page.evaluate(({ led }) => {
    const g = window.game;
    g.currentPhase = 'phase3';
    g.trumpSuit = 'clubs';
    g.tricksWon = { north: 0, east: 0, south: 0, west: 0 };
    // All four seats get the same number of cards: an incoherent position
    // (south short, bots holding 13) ends the gamlet early and re-deals in
    // the middle of a case.
    g.hands.south = [
      { rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'spades' }, { rank: '9', suit: 'hearts' },
      { rank: '4', suit: 'hearts' }, { rank: '7', suit: 'clubs' }
    ];
    g.hands.north = [
      { rank: '2', suit: 'spades' }, { rank: '3', suit: 'spades' },
      { rank: '2', suit: 'hearts' }, { rank: '3', suit: 'hearts' },
      { rank: '2', suit: 'clubs' }, { rank: '3', suit: 'clubs' }
    ];
    g.hands.east = [
      { rank: '4', suit: 'spades' }, { rank: '5', suit: 'spades' },
      { rank: '5', suit: 'hearts' }, { rank: '6', suit: 'hearts' },
      { rank: '4', suit: 'clubs' }, { rank: '5', suit: 'clubs' }
    ];
    g.hands.west = [
      { rank: '6', suit: 'spades' }, { rank: '7', suit: 'spades' },
      { rank: '7', suit: 'hearts' }, { rank: '8', suit: 'hearts' },
      { rank: '6', suit: 'clubs' }, { rank: '8', suit: 'clubs' }
    ];
    // `led` puts east's card on the table, which makes south next to act.
    g.currentTrick = led ? [{ player: 'east', card: led }] : [];
    g.trickLeader = g.southIndex;
    g.clearArmedCard();
    g.updateHumanPlayerCards();
    g.enableCardSelection();
  }, { led });
  await page.waitForTimeout(250);
}

const state = () => page.evaluate(() => ({
  armed: window.game.armedCard,
  armedNodes: document.querySelectorAll('#south-cards .card.card-armed').length,
  illegal: [...document.querySelectorAll('#south-cards .card.card-illegal')].length,
  handSize: window.game.hands.south.length,
  trick: window.game.currentTrick.length
}));

/** Click point on a card's visible sliver — its centre is under its neighbour. */
async function cardPoint(i) {
  const box = await (await page.$$('#south-cards .card'))[i].boundingBox();
  return { x: box.x + 8, y: box.y + box.height / 2 };
}
/**
 * A point on actual felt. .game-controls (the Deal button) is a child of
 * .trick-area and covers its middle — it is display:none once a hand is
 * dealt, but this position is forced without pressing Deal, so aim below it.
 */
/**
 * Dispatches a touch-flavoured pointer sequence. A mouse gets hover — it lifts
 * the card under the cursor, so one deliberate click plays. A finger has no
 * hover, so it lifts by pressing and only commits on a second tap or a drag to
 * the felt. Those touch-only rules need real pointerType:'touch' events.
 *
 * pointerdown goes to the element under the point (so target.closest('.card')
 * resolves); move/up go to the container, which is what pointer capture does
 * for a real finger.
 */
async function touchSeq(steps) {
  await page.evaluate(steps => {
    const container = document.getElementById('south-cards');
    for (const s of steps) {
      const target = s.type === 'pointerdown'
        ? (document.elementFromPoint(s.x, s.y) || container)
        : container;
      target.dispatchEvent(new PointerEvent(s.type, {
        pointerId: 7, pointerType: 'touch', isPrimary: true,
        clientX: s.x, clientY: s.y, bubbles: true, cancelable: true,
        buttons: s.type === 'pointerup' ? 0 : 1
      }));
    }
  }, steps);
}
const touchTap = p => touchSeq([
  { type: 'pointerdown', x: p.x, y: p.y }, { type: 'pointerup', x: p.x, y: p.y }
]);
async function touchSlide(from, to, steps = 12) {
  const seq = [{ type: 'pointerdown', x: from.x, y: from.y }];
  for (let i = 1; i <= steps; i++) {
    seq.push({ type: 'pointermove',
               x: from.x + (to.x - from.x) * i / steps,
               y: from.y + (to.y - from.y) * i / steps });
  }
  return touchSeq(seq);
}
/** Parks the mouse away from the hand so a stale hover can't arm anything. */
const parkMouse = () => page.mouse.move(5, 5);

async function trickPoint() {
  const box = await (await page.$('.trick-area')).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height - 24 };
}

/* ── 1. one TAP arms, plays nothing (touch has no hover) ─────────────── */
await parkMouse();
await setUp();
let p = await cardPoint(0);
await touchTap(p);
await page.waitForTimeout(150);
let s = await state();
check('one tap arms and plays nothing', s.armedNodes === 1 && s.trick === 0 && s.handSize === 6,
  `armed=${s.armedNodes} trick=${s.trick} hand=${s.handSize}`);

/* ── 2. second tap on the armed card plays it ────────────────────────── */
await touchTap(p);
await page.waitForTimeout(250);
s = await state();
check('second tap plays', s.trick === 1 && s.handSize === 5 && s.armed === null,
  `trick=${s.trick} hand=${s.handSize}`);

/* ── 3. tapping another card moves the lift, plays nothing ───────────── */
await parkMouse();
await setUp();
p = await cardPoint(0);
await touchTap(p);
await page.waitForTimeout(120);
const p2 = await cardPoint(2);
await touchTap(p2);
await page.waitForTimeout(150);
s = await state();
check('tapping a different card moves the lift', s.armedNodes === 1 && s.trick === 0,
  `armed=${s.armedNodes} trick=${s.trick}`);

/* ── 4. drag onto the trick area plays ───────────────────────────────── */
await setUp();
p = await cardPoint(1);
let t = await trickPoint();
await page.mouse.move(p.x, p.y);
await page.mouse.down();
await page.mouse.move(t.x, t.y, { steps: 12 });
const ringLit = await page.evaluate(() => !!document.querySelector('.trick-area.drop-active'));
await page.mouse.up();
await page.waitForTimeout(250);
s = await state();
check('drop ring lights while dragging over the trick area', ringLit);
check('drag onto the trick area plays', s.trick === 1 && s.handSize === 5,
  `trick=${s.trick} hand=${s.handSize}`);

/* ── 5. drag released elsewhere plays nothing and stays lifted ───────── */
await setUp();
p = await cardPoint(1);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
await page.mouse.move(p.x - 120, p.y + 40, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(200);
s = await state();
check('drag released off the felt plays nothing', s.trick === 0 && s.handSize === 6,
  `trick=${s.trick} hand=${s.handSize}`);
check('...and the card stays lifted', s.armedNodes === 1 && s.armed !== null,
  `armed=${s.armedNodes}`);

/* ── 6. tapping the trick area plays the lifted card ─────────────────── */
await setUp();
p = await cardPoint(0);
await page.mouse.click(p.x, p.y);          // lift
await page.waitForTimeout(150);
t = await trickPoint();
await page.mouse.click(t.x, t.y);          // commit on the felt
await page.waitForTimeout(250);
s = await state();
check('tapping the felt plays the lifted card', s.trick === 1 && s.handSize === 5,
  `trick=${s.trick} hand=${s.handSize}`);

/* ── 7. follow-suit: illegal cards are dimmed and refuse the lift ────── */
await setUp({ rank: '5', suit: 'hearts' });   // east led hearts; south holds two
s = await state();
check('cards that break follow-suit are dimmed', s.illegal === 4, `dimmed=${s.illegal} (expected 4)`);

const illegalIndex = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#south-cards .card')];
  return cards.findIndex(c => c.classList.contains('card-illegal'));
});
p = await cardPoint(illegalIndex);
await parkMouse();
await touchTap(p);
await page.waitForTimeout(120);
await touchTap(p);
await page.waitForTimeout(200);
s = await state();
check('a dimmed card cannot be lifted or played', s.armedNodes === 0 && s.trick === 1 && s.handSize === 6,
  `armed=${s.armedNodes} trick=${s.trick} hand=${s.handSize}`);

/* ── 8. mouse hover lifts the card under the cursor ──────────────────── */
await setUp();
p = await cardPoint(3);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(150);
s = await state();
const hoveredIsThird = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#south-cards .card')];
  return cards.findIndex(c => c.classList.contains('card-armed'));
});
check('hover lifts the card under the cursor', s.armedNodes === 1 && s.trick === 0 && hoveredIsThird === 3,
  `armed=${s.armedNodes} index=${hoveredIsThird}`);

// ...and with it already lifted, one deliberate click plays it
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(250);
s = await state();
check('a click on the hovered card plays it', s.trick === 1 && s.handSize === 5,
  `trick=${s.trick} hand=${s.handSize}`);

/* ── 9. press + slide along the fan moves the lift, plays nothing ─────── */
await parkMouse();
await setUp();
p = await cardPoint(0);
const p4 = await cardPoint(4);
await touchSlide(p, p4, 14);            // slide sideways, staying in the hand
const scrubbed = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#south-cards .card')];
  return cards.findIndex(c => c.classList.contains('card-armed'));
});
await touchSeq([{ type: 'pointerup', x: p4.x, y: p4.y }]);
await page.waitForTimeout(200);
s = await state();
check('sliding along the fan moves the lift', scrubbed === 4 && s.trick === 0 && s.handSize === 6,
  `lifted=${scrubbed} trick=${s.trick}`);

/* ── 10. press + pull up carries the card straight away ──────────────── */
await parkMouse();
await setUp();
p = await cardPoint(2);
// A short upward move, still inside the hand row: the card should already be
// travelling with the finger, not merely lifted.
await touchSlide(p, { x: p.x + 2, y: p.y - 22 }, 6);
const carrying = await page.evaluate(() => {
  const el = document.querySelector('#south-cards .card.card-armed');
  return !!el && /translate/.test(el.style.transform);
});
check('pulling up carries the card immediately', carrying);

// ...and continuing to the felt in the same movement plays it
t = await trickPoint();
await touchSeq([
  { type: 'pointermove', x: t.x, y: t.y },
  { type: 'pointerup', x: t.x, y: t.y }
]);
await page.waitForTimeout(250);
s = await state();
check('press → drag → drop plays in one movement', s.trick === 1 && s.handSize === 5,
  `trick=${s.trick} hand=${s.handSize}`);

/* ── 11. the played card actually flies (flip animation runs) ────────── */
await setUp();
const flies = await page.evaluate(async () => {
  const g = window.game;
  const slot = document.getElementById('south-played');
  g.armedCard = { ...g.hands.south[0] };
  g.playArmedCard();
  await new Promise(r => setTimeout(r, 40));
  const card = slot.querySelector('.card');
  return !!card && card.getAnimations().length > 0;
});
check('the played card animates into its slot', flies);

/* ── 12. the suit watermark is gone from the card face ───────────────── */
const watermarkHidden = await page.evaluate(() => {
  const el = document.querySelector('#south-cards .card .card-center-suit');
  return !!el && getComputedStyle(el).display === 'none' && !!el.textContent.trim();
});
check('centre suit is not drawn but still readable by the code', watermarkHidden);

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`CARD SELECTION FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`CARD SELECTION PASSED ✅ (${results.length} checks: hover, scrub, arm/commit, drag, cancel, follow-suit, flight)`);
await browser.close();
served?.close();
