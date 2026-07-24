/**
 * Node-native unit tests for the pure Monte Carlo engine.
 *
 * Unlike mc-parity.mjs / mc-strength.mjs, this needs NO browser and NO server:
 * it imports mc-engine.js straight into Node and exercises the pure functions.
 * That's the payoff of extracting the engine into its own module — sub-second
 * feedback on the simulation math.
 *
 * Run: `node tests/mc-engine.test.mjs`  (or `npm run test:unit`)
 * Exits non-zero on any failure.
 */
import {
    mcEncode, mcDecode, mcCardPower, mcTrickWinner,
    mcSampleDeal, mcPlayout, SUITS, RANKS,
} from '../mc-engine.js';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const ri = n => (Math.random() * n) | 0;

// ── 1. encode/decode roundtrip over the whole 52-card deck ──────────────────
let rtChecked = 0;
for (let s = 0; s < 4; s++) {
    for (let r = 0; r < 13; r++) {
        const card = { suit: SUITS[s], rank: RANKS[r] };
        const id = mcEncode(card);
        const back = mcDecode(id);
        check(id === s * 13 + r, `encode ${SUITS[s]}/${RANKS[r]} = ${id}, expected ${s * 13 + r}`);
        check(back.suit === card.suit && back.rank === card.rank, `roundtrip failed for ${SUITS[s]}/${RANKS[r]}`);
        rtChecked++;
    }
}

// ── 2. mcTrickWinner vs an independent reference (trump > lead > off-suit) ───
// Reference implementation kept deliberately separate from the engine's.
function refWinner(trick, trumpIdx) {
    const leadSuit = (trick[0].card / 13) | 0;
    let best = trick[0], bestKey = keyOf(trick[0].card);
    for (let i = 1; i < trick.length; i++) {
        const k = keyOf(trick[i].card);
        if (k > bestKey) { bestKey = k; best = trick[i]; }
    }
    return best.seat;
    function keyOf(card) {
        const suit = (card / 13) | 0, rank = card % 13;
        if (trumpIdx >= 0 && suit === trumpIdx) return 2000 + rank;   // trump tier
        if (suit === leadSuit) return 1000 + rank;                    // lead tier
        return rank;                                                   // off-suit
    }
}
let parityChecked = 0;
for (let it = 0; it < 20000; it++) {
    const ids = new Set();
    while (ids.size < 4) ids.add(ri(52));
    const cards = [...ids];
    const seats = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const trick = cards.map((card, i) => ({ seat: seats[i], card }));
    const trumpIdx = ri(5) === 4 ? -1 : ri(4); // -1 == notrump
    check(mcTrickWinner(trick, trumpIdx) === refWinner(trick, trumpIdx),
        `trick-winner mismatch: ${JSON.stringify(trick)} trump=${trumpIdx}`);
    parityChecked++;
}

// Explicit spot checks anchoring the tiers.
check(mcTrickWinner([{ seat: 0, card: mcEncode({ suit: 'clubs', rank: '2' }) },
                     { seat: 1, card: mcEncode({ suit: 'clubs', rank: 'A' }) }], -1) === 1,
    'A of lead suit should beat 2 of same suit');
check(mcTrickWinner([{ seat: 0, card: mcEncode({ suit: 'hearts', rank: 'A' }) },
                     { seat: 1, card: mcEncode({ suit: 'spades', rank: '2' }) }],
                     3 /* spades trump */) === 1,
    'lowest trump should beat highest of lead suit');

// ── 3. mcPlayout always resolves exactly 13 tricks summing to 13 ────────────
function fullDealPS() {
    const ids = [...Array(52).keys()];
    for (let i = ids.length - 1; i > 0; i--) { const j = ri(i + 1);[ids[i], ids[j]] = [ids[j], ids[i]]; }
    // acting seat 0 keeps 13; the rest are pooled and sampled by the engine.
    const ownHand = ids.slice(0, 13);
    const pool = ids.slice(13);
    const noVoids = [[false, false, false, false], [false, false, false, false],
                     [false, false, false, false], [false, false, false, false]];
    return { actingIdx: 0, trumpIdx: ri(5) === 4 ? -1 : ri(4), ownHand,
        need: [13, 13, 13, 13], won: [0, 0, 0, 0], bids: [0, 0, 0, 0],
        voids: noVoids, pool, trickInts: [], leader: 0 };
}
let playoutChecked = 0;
for (let it = 0; it < 2000; it++) {
    const ps = fullDealPS();
    const deal = mcSampleDeal(ps);
    check(deal !== null, 'sampleDeal returned null on an unconstrained full deal');
    if (!deal) break;
    const sim = {
        hands: [deal[0].slice(), deal[1].slice(), deal[2].slice(), deal[3].slice()],
        trumpIdx: ps.trumpIdx, leader: 0, trick: [],
        tricksWon: new Int32Array(4), bids: ps.bids, allWant: true,
    };
    const tw = mcPlayout(sim);
    const total = tw[0] + tw[1] + tw[2] + tw[3];
    check(total === 13, `playout resolved ${total} tricks, expected 13`);
    check(sim.hands.every(h => h.length === 0), 'playout left cards in a hand');
    playoutChecked++;
}

// ── 4. mcSampleDeal: sizes, full coverage, no dups, acting hand preserved ───
let samplerChecked = 0, voidChecked = 0;
for (let it = 0; it < 2000; it++) {
    const ps = fullDealPS();
    const deal = mcSampleDeal(ps);
    if (!deal) { fails.push('sampler: returned null'); break; }
    const sizes = deal.map(h => h.length);
    check(sizes.every(n => n === 13), `sampler sizes ${sizes}, expected all 13`);
    const all = new Set(deal.flat());
    check(all.size === 52, `sampler coverage ${all.size}/52 (dup or missing card)`);
    check(deal[0].join(',') === ps.ownHand.join(','), 'sampler mutated the acting hand');
    samplerChecked++;
}
// void constraint: seat 1 is void in clubs(0) and hearts(2) → must get none.
for (let it = 0; it < 500; it++) {
    const ps = fullDealPS();
    ps.voids[1] = [true, false, true, false];
    const deal = mcSampleDeal(ps);
    if (!deal) { fails.push('sampler(void): returned null'); break; }
    const bad = deal[1].some(id => { const s = (id / 13) | 0; return s === 0 || s === 2; });
    check(!bad, 'sampler(void): seat 1 received a void-suit card');
    voidChecked++;
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`encode/decode roundtrips : ${rtChecked}/52`);
console.log(`trick-winner parity      : ${parityChecked}/20000`);
console.log(`playouts (== 13 tricks)  : ${playoutChecked}/2000`);
console.log(`sampler deals            : ${samplerChecked}/2000`);
console.log(`void-respect deals       : ${voidChecked}/500`);
console.log('\n=== RESULT ===');
if (fails.length) {
    console.log('MC ENGINE UNIT FAILED:');
    for (const f of fails.slice(0, 10)) console.log('  - ' + f);
    process.exit(1);
}
console.log('MC ENGINE UNIT PASSED ✅ (encode/decode, trick-winner parity, playout=13, sampler sizes/coverage/voids)');
