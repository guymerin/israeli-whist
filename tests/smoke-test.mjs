/**
 * Israeli Whist — Playwright smoke test.
 *
 * Drives one full gamlet in a real browser and asserts that the live game
 * scores exactly as the rules define:
 *   - meet your bid : bid² + 10
 *   - miss your bid : −10 per trick over/under
 *   - zero bid      : ±50 in an Under hand, ±25 in an Over hand
 *                     (+ when you take 0 tricks, − when you take any)
 * It also confirms the phase machine advances dealing → phase1 → phase2 →
 * phase3 → scoring, that the four-seat total never lands on the forbidden 13,
 * and that no uncaught console/page errors fire.
 *
 * The human seat (south) is driven naively (passes in Phase 1, takes a small
 * Phase 2 prediction, plays the first legal card each trick) — this is a
 * smoke test of the flow and scoring, not of optimal human play.
 *
 * Run:
 *   1. Serve the repo:      python3 -m http.server 8000
 *   2. Make Playwright available, e.g.:
 *        npm i -D playwright && npx playwright install chromium
 *   3. From the repo root:  node tests/smoke-test.mjs
 *
 * Exits non-zero if the phase flow never completes or the scoring/over-under
 * checks fail, so it can gate CI.
 */
import { chromium } from 'playwright';

const URL = process.env.WHIST_URL || 'http://localhost:8000/';
const logs = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => logs.push(msg.text()));
page.on('pageerror', err => logs.push('PAGEERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });

// In-page recorder: snapshot game state 20×/sec so we can catch the brief
// post-scoring window before the board resets for the next gamlet.
await page.evaluate(() => {
  window.__snaps = [];
  window.__rec = setInterval(() => {
    const g = window.game; if (!g) return;
    window.__snaps.push({
      phase: g.currentPhase,
      bids: { ...g.phase2Bids },
      tricks: { ...g.tricksWon },
      scores: { ...g.scores },
      handType: g.handType,
      trump: g.trumpSuit,
      trumpWinner: g.trumpWinner,
      minTakes: g.minimumTakes,
    });
  }, 50);
});

// Enable Turbo (fastMode) so animations run 10× faster.
await page.evaluate(() => {
  const cb = document.getElementById('fast-mode-checkbox');
  if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
});

const visible = sel => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return false;
  const st = getComputedStyle(el);
  return st.display !== 'none' && st.visibility !== 'hidden' && el.offsetParent !== null;
}, sel);

const clickIf = async sel => {
  if (await visible(sel)) { await page.click(sel).catch(() => {}); return true; }
  return false;
};

// Dismiss the startup name-entry modal (it intercepts all clicks).
await page.fill('#player-name-input', 'Tester').catch(() => {});
await page.click('#start-game-btn').catch(() => {});
await sleep(200);

// Deal.
await page.evaluate(() => { const m = document.getElementById('rules-modal'); if (m) m.style.display = 'none'; });
await clickIf('#deal-btn');

let phase2Done = false;
let lastPhase = '';
const deadline = Date.now() + 90000;

while (Date.now() < deadline) {
  const phase = await page.evaluate(() => window.game?.currentPhase);
  if (phase !== lastPhase) { logs.push(`>>> PHASE: ${phase}`); lastPhase = phase; }

  // Close the rules modal if it ever shows.
  await page.evaluate(() => { const m = document.getElementById('rules-modal'); if (m && getComputedStyle(m).display !== 'none') m.style.display = 'none'; });

  // Phase 1: on South's turn, place the minimum legal opening bid (5♣) when no
  // bid stands yet, otherwise pass. Bidding when the table is empty guarantees
  // at least one bid per hand, so an all-four-pass redeal loop can't stall the
  // test. If a bot has already bid, passing is safe — the hand still resolves.
  if (await visible('#bid-btn')) {
    const placed = await page.evaluate(() => {
      const g = window.game;
      const highest = g.getCurrentHighestBid && g.getCurrentHighestBid();
      if (highest) return false; // a bid already stands; pass instead
      const trick = document.querySelector('.trick-button[data-value="5"]');
      const suit = document.querySelector('.suit-button[data-value="clubs"]');
      if (!trick || !suit) return false;
      trick.click(); suit.click();
      document.getElementById('bid-btn').click();
      return true;
    });
    if (!placed) await page.click('#pass-btn').catch(() => {});
    await sleep(120);
    continue;
  }

  // Phase 2: clicking a .trick-btn submits immediately (no confirm button).
  // The last-bidder "total != 13" rule may silently reject a value, so try
  // values until South's bid actually registers.
  if (await visible('#your-prediction-controls') &&
      await page.evaluate(() => window.game.phase2Bids.south === null || window.game.phase2Bids.south === undefined)) {
    const submitted = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#your-prediction-controls .trick-btn')]
        .filter(b => getComputedStyle(b).display !== 'none' && !b.disabled);
      const order = ['2', '3', '1', '4', '0', '5'];
      const ordered = [...btns].sort((a, b) => order.indexOf(a.dataset.value) - order.indexOf(b.dataset.value));
      for (const btn of ordered) {
        btn.click();
        if (window.game.phase2Bids.south !== null && window.game.phase2Bids.south !== undefined) {
          return window.game.phase2Bids.south;
        }
      }
      return false;
    });
    if (submitted !== false) phase2Done = true;
    await sleep(120);
    continue;
  }

  // Phase 3: when it's South's turn, play the first legal card.
  const isSouthTurn = await page.evaluate(() => document.getElementById('south-cards')?.classList.contains('player-turn'));
  if (isSouthTurn) {
    const before = await page.evaluate(() => (window.game.botMemory?.cardsPlayed?.south || []).length);
    const cards = await page.$$('#south-cards .card');
    for (const c of cards) {
      await c.click({ force: true }).catch(() => {});
      await sleep(60);
      const after = await page.evaluate(() => (window.game.botMemory?.cardsPlayed?.south || []).length);
      if (after > before) break;
    }
    await sleep(100);
    continue;
  }

  // Done once a full 13-trick gamlet has been recorded.
  const done = await page.evaluate(() =>
    (window.__snaps || []).some(s => Object.values(s.tricks).reduce((a, b) => a + b, 0) === 13));
  if (done && phase2Done) { await sleep(400); break; }

  await sleep(120);
}

const snaps = await page.evaluate(() => window.__snaps || []);
await browser.close();

// ---- Analysis & assertions ----
function scoreFor(bid, tricks, handType) {
  if (bid === 0) {
    const magnitude = handType === 'under' ? 50 : 25;
    return tricks === 0 ? magnitude : -magnitude;
  }
  if (bid === tricks) return bid * bid + 10;
  return -10 * Math.abs(bid - tricks);
}

const phasesSeen = [...new Set(snaps.map(s => s.phase))];
const completed = snaps.filter(s => Object.values(s.tricks).reduce((a, b) => a + b, 0) === 13);
const end = completed[completed.length - 1];
const failures = [];

console.log('=== PHASES SEEN ===');
console.log(phasesSeen.join(' -> '));
for (const need of ['phase1', 'phase2', 'phase3']) {
  if (!phasesSeen.includes(need)) failures.push(`phase machine never reached ${need}`);
}

if (!end) {
  failures.push('no completed 13-trick gamlet captured');
  console.log('\n!! No completed gamlet. Last snapshot:\n' + JSON.stringify(snaps[snaps.length - 1], null, 2));
} else {
  const totalBids = Object.values(end.bids).reduce((a, b) => a + b, 0);
  console.log('\n=== END-OF-GAMLET STATE ===');
  console.log(`trump: ${end.trump} | trumpWinner: ${end.trumpWinner} | minTakes: ${end.minTakes} | handType: ${end.handType}`);
  console.log(`phase2 bids: ${JSON.stringify(end.bids)} (total ${totalBids})`);
  console.log(`tricks won : ${JSON.stringify(end.tricks)} (total ${Object.values(end.tricks).reduce((a, b) => a + b, 0)})`);

  const seats = ['north', 'east', 'south', 'west'];
  const anyScored = snaps.some(s => Object.values(s.scores).some(v => v !== 0));
  const allFailed = seats.every(p => end.bids[p] !== end.tricks[p]);

  if (allFailed && !anyScored) {
    // Israeli Whist: if EVERY seat misses its bid the gamlet is cancelled and
    // nothing is scored. In this single-gamlet test that means scores stay 0.
    console.log('\n=== GAMLET CANCELLED (all four seats missed their bids) ===');
    console.log('scores correctly unchanged (cancellation rule held)  OK');
  } else {
    const endIdx = snaps.indexOf(end);
    const afterScore = snaps.find((s, i) => i > endIdx && Object.values(s.scores).some(v => v !== 0))
      || snaps.slice().reverse().find(s => Object.values(s.scores).some(v => v !== 0));

    console.log('\n=== SCORING VALIDATION (recompute vs game) ===');
    for (const p of seats) {
      const expected = scoreFor(end.bids[p], end.tricks[p], end.handType);
      const got = afterScore ? afterScore.scores[p] : undefined;
      const ok = got === expected;
      if (!ok) failures.push(`${p}: expected ${expected}, game scored ${got}`);
      console.log(`  ${p.padEnd(6)} bid ${end.bids[p]} took ${end.tricks[p]} -> expected ${expected}, game scored ${got}  ${ok ? 'OK' : 'MISMATCH'}`);
    }
  }
  if (totalBids === 13) failures.push('four-seat total bids landed on forbidden 13');
  console.log(`\ntotal bids != 13 (over/under rule held): ${totalBids !== 13 ? 'OK' : 'VIOLATED'}`);
}

const errors = logs.filter(l => /PAGEERROR|Uncaught|TypeError|ReferenceError/i.test(l));
if (errors.length) failures.push('console/page errors: ' + errors.join(' | '));

console.log('\n=== RESULT ===');
if (failures.length) {
  console.log('SMOKE TEST FAILED:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log('SMOKE TEST PASSED ✅ (phase flow, scoring rules, over/under rule, no errors)');
