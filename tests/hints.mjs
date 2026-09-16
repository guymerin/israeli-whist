/**
 * Whist — the Hint button gives advice the rules allow.
 *
 * Two old faults this pins down:
 *   • The takes hint ignored the real table. It passed a running total of 0,
 *     a floor of 0 and a cap of 7, so it could suggest less than the trump
 *     winner's contract, the one number the over/under rule forbids, and
 *     never 8 or more.
 *   • The card hint came from a rule set that ignored trump when judging who
 *     was winning the trick. It now asks the bots' engine, which may only be
 *     consulted on south's own turn.
 *
 * Run:  node tests/hints.mjs      (or: npm run test:hints)
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

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate(() => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
});

const DEALS = 30;

// ── Takes hint: south predicts last, after three real bot predictions ───
const last = await page.evaluate((DEALS) => {
  const g = window.game;
  const out = [];
  for (let i = 0; i < DEALS; i++) {
    g.dealCards();
    g.currentPhase = 'phase2';
    g.trumpSuit = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'][i % 5];
    g.trumpWinner = 'west';
    g.minimumTakes = 5 + (i % 3);
    // West won the trump, so the order is west, north, east, south.
    const w = g.minimumTakes, n = i % 5, e = (i * 3) % 6;
    g.phase2Bids = { north: n, east: e, south: null, west: w };
    g.currentBidder = g.southIndex;
    const html = g.generateHint();
    const m = /Suggested: (\d+)/.exec(html);
    out.push({ forbidden: 13 - (n + e + w), suggested: m ? +m[1] : null, warns: /can't choose/.test(html) });
  }
  return out;
}, DEALS);
const lastBad = last.filter(r => r.suggested === null || r.suggested === r.forbidden || r.suggested < 0 || r.suggested > 13);
check(`predicting last, the hint never suggests the forbidden number (${DEALS} deals)`, lastBad.length === 0,
  lastBad.length ? JSON.stringify(lastBad.slice(0, 3)) : '');
const warnBad = last.filter(r => r.forbidden >= 0 && r.forbidden <= 13 && !r.warns);
check('predicting last, the hint names the number you cannot choose', warnBad.length === 0,
  warnBad.length ? JSON.stringify(warnBad.slice(0, 3)) : '');

// ── Takes hint: south won the trump, so predicts first with a floor ─────
const first = await page.evaluate((DEALS) => {
  const g = window.game;
  const out = [];
  for (let i = 0; i < DEALS; i++) {
    g.dealCards();
    g.currentPhase = 'phase2';
    g.trumpSuit = ['spades', 'hearts', 'notrump'][i % 3];
    g.trumpWinner = 'south';
    g.minimumTakes = 5 + (i % 5);
    g.phase2Bids = { north: null, east: null, south: null, west: null };
    g.currentBidder = g.southIndex;
    const m = /Suggested: (\d+)/.exec(g.generateHint());
    out.push({ min: g.minimumTakes, suggested: m ? +m[1] : null });
  }
  return out;
}, DEALS);
const floorBad = first.filter(r => r.suggested === null || r.suggested < r.min);
check('as trump winner, the hint never suggests less than your contract', floorBad.length === 0,
  floorBad.length ? JSON.stringify(floorBad.slice(0, 3)) : '');
const high = first.filter(r => r.suggested >= 8).length;
check('the hint can suggest 8 or more (the old cap was 7)', high > 0, `${high} of ${DEALS} suggestions were 8+`);

// ── Card hint: a legal card from south's own hand, only on south's turn ─
const play = await page.evaluate((DEALS) => {
  const g = window.game;
  const out = [];
  for (let i = 0; i < DEALS; i++) {
    g.dealCards();
    g.currentPhase = 'phase3';
    g.trumpSuit = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'][i % 5];
    g.handType = 'over';
    g.phase2Bids = { north: 4, east: 3, south: 1 + (i % 6), west: 5 };
    g.tricksWon = { north: 0, east: 0, south: 0, west: 0 };
    g.tricksPlayed = 0;

    // Half the time south leads; otherwise west, north and east have played.
    const leads = i % 2 === 0;
    g.currentTrick = [];
    if (leads) {
      g.trickLeader = g.southIndex;
    } else {
      g.trickLeader = g.players.indexOf('west');
      for (const p of ['west', 'north', 'east']) {
        g.currentTrick.push({ player: p, card: g.hands[p].shift() });
      }
    }
    const html = g.generateHint();
    const m = /Play: ([0-9JQKA]+)(.)/.exec(html);
    const card = m && g.hands.south.find(c => c.rank === m[1] && g.getSuitSymbol(c.suit) === m[2]);
    out.push({ suggested: m ? m[1] + m[2] : null, inHand: !!card, legal: !!card && g.isValidCardPlay('south', card) });

    // Not south's turn: north is to lead.
    g.currentTrick = [];
    g.trickLeader = g.players.indexOf('north');
    out[out.length - 1].offTurn = /Play:/.test(g.generateHint());
  }
  return out;
}, DEALS);
const playBad = play.filter(r => !r.inHand || !r.legal);
check(`on south's turn the hint suggests a legal card from south's hand (${DEALS} deals)`, playBad.length === 0,
  playBad.length ? JSON.stringify(playBad.slice(0, 3)) : '');
const offBad = play.filter(r => r.offTurn);
check("when it isn't south's turn, no card is suggested", offBad.length === 0, `${offBad.length} suggested anyway`);

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`HINTS FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`HINTS PASSED ✅ (${results.length} checks: forbidden number, contract floor, no cap at 7, legal card, turn only)`);
await browser.close();
served?.close();
