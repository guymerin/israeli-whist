/**
 * Bot strength benchmark: Monte Carlo (PIMC) vs the legacy heuristics.
 *
 * For a set of reproducible random deals (seeded), each gamlet is played TWICE
 * on identical conditions (same hands, same trump, same trump-winner/floor):
 * once with every seat on the MC engine, once with every seat on the old
 * heuristics. We drive the game's REAL decision methods (calculateSmartPhase2Bid
 * for prediction, selectValidBotCard for play) and the REAL trick resolution,
 * so this measures the shipped policies — not a reimplementation.
 *
 * Primary metric: EXACT-HIT RATE (tricks === bid), since scoring rewards
 * exactness. Also: mean |tricks − bid|, mean score/seat, nil success, and the
 * p50/p95 wall time of an MC card decision.
 *
 * Run: serve repo (python3 -m http.server 8000), then `node tests/mc-strength.mjs`.
 * Optional: WHIST_DEALS=200 to change sample size.
 */
import { chromium } from 'playwright';

const URL = process.env.WHIST_URL || 'http://localhost:8000/';
const DEALS = parseInt(process.env.WHIST_DEALS || '120', 10);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });

const out = await page.evaluate((DEALS) => {
  const g = window.game;
  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  // Seeded RNG (mulberry32) so both policies see identical deals.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeSetups(n, seed) {
    const rnd = mulberry32(seed);
    const setups = [];
    for (let i = 0; i < n; i++) {
      const deck = [];
      for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
      for (let k = deck.length - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; const t = deck[k]; deck[k] = deck[j]; deck[j] = t; }
      setups.push({
        deck,
        trump: SUITS[(rnd() * 4) | 0],
        winnerIdx: (rnd() * 4) | 0,
        minTakes: 5
      });
    }
    return setups;
  }

  function cloneHands(deck) {
    return {
      north: deck.slice(0, 13).map(c => ({ ...c })),
      east: deck.slice(13, 26).map(c => ({ ...c })),
      south: deck.slice(26, 39).map(c => ({ ...c })),
      west: deck.slice(39, 52).map(c => ({ ...c }))
    };
  }

  const cardTimes = []; // MC decision times (ms)

  function playGamlet(setup, mcOn) {
    g.mcEnabled = mcOn;
    g.resetBotMemory();
    g.hands = cloneHands(setup.deck);
    g.trumpSuit = setup.trump;
    g.trumpWinner = g.players[setup.winnerIdx];
    g.minimumTakes = setup.minTakes;
    g.tricksWon = { north: 0, east: 0, south: 0, west: 0 };
    g.currentTrick = [];
    g.tricksPlayed = 0;
    g.phase2Bids = { north: null, east: null, south: null, west: null };

    // ── Phase 2: each seat predicts, in seat order, real bidding logic ──
    let currentTotal = 0;
    for (let i = 0; i < 4; i++) {
      const player = g.players[i];
      g.currentBidder = i; // drives playersRemaining + last-bidder ≠13 rule
      const minBid = (player === g.trumpWinner) ? g.minimumTakes : 0;
      const hs = g.evaluateHandStrength(player);
      let bid = g.calculateSmartPhase2Bid(player, hs, currentTotal, minBid, 13);
      bid = Math.max(minBid, Math.min(13, bid | 0));
      // Enforce the real last-bidder constraint defensively.
      if (i === 3 && currentTotal + bid === 13) bid = bid > 0 ? bid - 1 : 1;
      g.phase2Bids[player] = bid;
      currentTotal += bid;
    }
    g.handType = currentTotal > 13 ? 'over' : 'under';

    // ── Phase 3: 13 tricks, real card selection + trick resolution ──
    g.trickLeader = setup.winnerIdx; // trump winner leads first
    for (let trick = 0; trick < 13; trick++) {
      g.currentTrick = [];
      let seat = g.trickLeader;
      for (let p = 0; p < 4; p++) {
        const player = g.players[seat];
        const t0 = performance.now();
        const idx = g.selectValidBotCard(player);
        const dt = performance.now() - t0;
        if (mcOn) cardTimes.push(dt);
        const card = g.hands[player][idx];
        g.hands[player].splice(idx, 1);
        // Track public memory exactly as the bots rely on it.
        const leadSuit = g.currentTrick.length ? g.currentTrick[0].card.suit : null;
        if (leadSuit && card.suit !== leadSuit) g.botMemory.suitVoids[player][leadSuit] = true;
        g.botMemory.cardsPlayed[player].push(card);
        g.currentTrick.push({ player, card });
        seat = (seat + 1) % 4;
      }
      const winner = g.determineTrickWinner();
      g.tricksWon[winner]++;
      g.tricksPlayed++;
      g.trickLeader = g.players.indexOf(winner);
    }

    // ── Score the gamlet ──
    const rows = {};
    for (const player of g.players) {
      const bid = g.phase2Bids[player];
      const tricks = g.tricksWon[player];
      const score = (bid === 0)
        ? g.calculateZeroBidScore(null, tricks, g.handType)
        : g.calculateScore(null, bid, tricks);
      rows[player] = { bid, tricks, score, exact: bid === tricks, nil: bid === 0 };
    }
    return rows;
  }

  function blankStats() { return { seats: 0, exact: 0, absErr: 0, score: 0, nilAtt: 0, nilHit: 0 }; }
  function accumulate(stats, rows) {
    for (const player in rows) {
      const r = rows[player];
      stats.seats++;
      if (r.exact) stats.exact++;
      stats.absErr += Math.abs(r.bid - r.tricks);
      stats.score += r.score;
      if (r.nil) { stats.nilAtt++; if (r.tricks === 0) stats.nilHit++; }
    }
  }

  const setups = makeSetups(DEALS, 12345);
  const mc = blankStats();
  const heur = blankStats();
  for (const s of setups) {
    try { accumulate(mc, playGamlet(s, true)); } catch (e) { return { error: 'MC gamlet: ' + e.message }; }
    try { accumulate(heur, playGamlet(s, false)); } catch (e) { return { error: 'heur gamlet: ' + e.message }; }
  }

  cardTimes.sort((a, b) => a - b);
  const pct = q => cardTimes.length ? cardTimes[Math.min(cardTimes.length - 1, Math.floor(q * cardTimes.length))] : 0;

  const summarize = st => ({
    exactRate: st.exact / st.seats,
    absErr: st.absErr / st.seats,
    scorePerSeat: st.score / st.seats,
    nilAtt: st.nilAtt,
    nilHit: st.nilHit
  });

  return {
    deals: DEALS,
    mc: summarize(mc),
    heur: summarize(heur),
    timing: { p50: pct(0.5), p95: pct(0.95), n: cardTimes.length }
  };
}, DEALS);

await browser.close();

if (out.error) { console.error('HARNESS ERROR:', out.error); process.exit(1); }

const pc = x => (x * 100).toFixed(1) + '%';
const f = x => x.toFixed(2);
console.log(`=== Bot strength: MC vs heuristic over ${out.deals} deals (×2 runs, identical setups) ===\n`);
console.log(`                       MC        Heuristic   Δ`);
console.log(`exact-hit rate     ${pc(out.mc.exactRate).padStart(7)}   ${pc(out.heur.exactRate).padStart(7)}     ${pc(out.mc.exactRate - out.heur.exactRate)}`);
console.log(`mean |tricks-bid|  ${f(out.mc.absErr).padStart(7)}   ${f(out.heur.absErr).padStart(7)}     ${f(out.mc.absErr - out.heur.absErr)}`);
console.log(`score / seat       ${f(out.mc.scorePerSeat).padStart(7)}   ${f(out.heur.scorePerSeat).padStart(7)}     ${f(out.mc.scorePerSeat - out.heur.scorePerSeat)}`);
console.log(`nil made/attempt   ${(out.mc.nilHit + '/' + out.mc.nilAtt).padStart(7)}   ${(out.heur.nilHit + '/' + out.heur.nilAtt).padStart(7)}`);
console.log(`\nMC card-decision time: p50=${out.timing.p50.toFixed(1)}ms  p95=${out.timing.p95.toFixed(1)}ms  (n=${out.timing.n})`);

const better = out.mc.exactRate > out.heur.exactRate && out.mc.scorePerSeat > out.heur.scorePerSeat;
console.log('\n=== RESULT ===');
if (errors.length) { console.log('console/page errors:\n' + errors.join('\n')); process.exit(1); }
console.log(better
  ? 'MC bots are STRONGER ✅ (higher exact-hit rate AND higher score/seat)'
  : 'WARNING: MC not clearly ahead — review budgets/policy.');
process.exit(better ? 0 : 2);
