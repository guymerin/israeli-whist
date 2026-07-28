// ════════════════════════════════════════════════════════════════════════
// mc-engine.js — Pure Determinized Monte Carlo (PIMC) simulation core.
//
// This is the extracted heart of the bot AI (see the "Split the monolith"
// proposal). Every function here is a PURE transform over integer card ids
// (id = suitIndex*13 + rankIndex) and plain SimState objects — no DOM, no
// `this`, no instance state. That is exactly what makes it independently
// importable and Node-testable without a browser or a running server.
//
//   • In the browser: index.html loads this as a module and assigns the
//     namespace to window.MCEngine; the IsraeliWhist class delegates its
//     mc* simulation methods here.
//   • In Node: tests/mc-engine.test.mjs (and the Playwright suites) import
//     these functions directly.
//
// INVARIANT: mcTrickWinner must stay logically identical to
// determineTrickWinner in script.js — tests/mc-parity.mjs guards this.
// ════════════════════════════════════════════════════════════════════════

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_IDX = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
export const RANK_IDX = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12 };

export function mcEncode(card) { return SUIT_IDX[card.suit] * 13 + RANK_IDX[card.rank]; }
export function mcDecode(id) { return { suit: SUITS[(id / 13) | 0], rank: RANKS[id % 13] }; }
export function mcSuitOf(id) { return (id / 13) | 0; }
export function mcRankOf(id) { return id % 13; } // 0..12 (ordering == face value)

/**
 * Power of a card for winning the current trick. Higher wins. Mirrors the
 * precedence in determineTrickWinner: trump > lead suit > off-suit.
 */
export function mcCardPower(id, leadSuit, trumpIdx) {
    const suit = (id / 13) | 0;
    const rank = id % 13;
    if (trumpIdx >= 0 && suit === trumpIdx) return 200 + rank;
    if (suit === leadSuit) return 100 + rank;
    return rank;
}

/**
 * Winning seat of a complete-or-partial trick (array of {seat, card:int}).
 * Integer mirror of determineTrickWinner — verified by tests/mc-parity.mjs.
 */
export function mcTrickWinner(trick, trumpIdx) {
    const leadSuit = (trick[0].card / 13) | 0;
    let winSeat = trick[0].seat;
    let winPow = mcCardPower(trick[0].card, leadSuit, trumpIdx);
    for (let i = 1; i < trick.length; i++) {
        const p = mcCardPower(trick[i].card, leadSuit, trumpIdx);
        if (p > winPow) { winPow = p; winSeat = trick[i].seat; }
    }
    return winSeat;
}

/** In-place Fisher-Yates shuffle of an int array. Returns the same array. */
export function mcShuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

export function mcAllowedCount(card, others, ps, relax) {
    const suit = (card / 13) | 0; let c = 0;
    for (const s of others) if (relax || !ps.voids[s][suit]) c++;
    return c;
}

/**
 * One constrained dealing attempt: distribute the unseen pool to the three
 * non-acting seats respecting hand-size (need) and void constraints. Cards
 * with the fewest legal homes are placed first. Returns per-seat int hands
 * or null on a dead end.
 */
export function mcTryDeal(others, ps, relax) {
    const cap = {}; const hands = {};
    for (const s of others) { cap[s] = ps.need[s]; hands[s] = []; }
    const cards = ps.pool.slice();
    mcShuffle(cards);
    cards.sort((a, b) => mcAllowedCount(a, others, ps, relax) - mcAllowedCount(b, others, ps, relax));
    for (const card of cards) {
        const suit = (card / 13) | 0;
        const allowed = [];
        for (const s of others) if (cap[s] > 0 && (relax || !ps.voids[s][suit])) allowed.push(s);
        if (allowed.length === 0) return null;
        const chosen = allowed[(Math.random() * allowed.length) | 0];
        hands[chosen].push(card); cap[chosen]--;
    }
    return hands;
}

/**
 * Sample one consistent full 4-hand deal. Acting seat keeps its real hand;
 * the other three are dealt the unseen pool. Retries, then relaxes voids,
 * then returns null (caller falls back to a heuristic).
 */
export function mcSampleDeal(ps) {
    const others = [];
    for (let s = 0; s < 4; s++) if (s !== ps.actingIdx) others.push(s);
    let hands = null;
    for (let attempt = 0; attempt < 8 && !hands; attempt++) hands = mcTryDeal(others, ps, false);
    if (!hands) hands = mcTryDeal(others, ps, true); // relax voids as last resort
    if (!hands) return null;
    const deal = [null, null, null, null];
    deal[ps.actingIdx] = ps.ownHand.slice();
    for (const s of others) deal[s] = hands[s];
    return deal;
}

/**
 * Fast rollout policy: pick a move index for `seat`. If the seat still wants
 * tricks (bidGap > 0, or allWant), win as cheaply as possible else keep low;
 * otherwise duck (dump the highest card that loses, else lowest). Integer
 * only — no DOM, no evaluate* heuristics.
 */
export function mcRolloutMove(sim, seat, hand, leadSuit, trumpIdx) {
    const n = hand.length;
    const wants = sim.allWant ? true : (sim.bids[seat] - sim.tricksWon[seat]) > 0;

    if (leadSuit < 0) {
        // Leading: high if we want tricks, low if we want to duck.
        let pick = 0, bestR = wants ? -1 : 99;
        for (let i = 0; i < n; i++) {
            const r = hand[i] % 13;
            if (wants ? r > bestR : r < bestR) { bestR = r; pick = i; }
        }
        return pick;
    }

    let mustFollow = false;
    for (let i = 0; i < n; i++) { if (((hand[i] / 13) | 0) === leadSuit) { mustFollow = true; break; } }

    let bestPow = -1;
    for (let k = 0; k < sim.trick.length; k++) {
        const p = mcCardPower(sim.trick[k].card, leadSuit, trumpIdx);
        if (p > bestPow) bestPow = p;
    }

    if (wants) {
        let win = -1, winRank = 99, low = 0, lowRank = 99;
        for (let i = 0; i < n; i++) {
            if (mustFollow && ((hand[i] / 13) | 0) !== leadSuit) continue;
            const id = hand[i], r = id % 13;
            if (r < lowRank) { lowRank = r; low = i; }
            if (mcCardPower(id, leadSuit, trumpIdx) > bestPow && r < winRank) { winRank = r; win = i; }
        }
        return win >= 0 ? win : low;
    } else {
        let dump = -1, dumpRank = -1, low = 0, lowRank = 99;
        for (let i = 0; i < n; i++) {
            if (mustFollow && ((hand[i] / 13) | 0) !== leadSuit) continue;
            const id = hand[i], r = id % 13;
            if (r < lowRank) { lowRank = r; low = i; }
            if (mcCardPower(id, leadSuit, trumpIdx) <= bestPow && r > dumpRank) { dumpRank = r; dump = i; }
        }
        return dump >= 0 ? dump : low;
    }
}

/**
 * Play a SimState to completion using the rollout policy. MUTATES sim
 * (hands, trick, tricksWon — all caller-owned copies). Returns tricksWon.
 */
export function mcPlayout(sim) {
    const trumpIdx = sim.trumpIdx;
    let remaining = sim.hands[0].length + sim.hands[1].length + sim.hands[2].length + sim.hands[3].length;
    while (remaining > 0) {
        const seat = sim.trick.length === 0 ? sim.leader : (sim.trick[sim.trick.length - 1].seat + 1) % 4;
        const leadSuit = sim.trick.length ? ((sim.trick[0].card / 13) | 0) : -1;
        const hand = sim.hands[seat];
        const idx = mcRolloutMove(sim, seat, hand, leadSuit, trumpIdx);
        const card = hand[idx];
        hand.splice(idx, 1);
        remaining--;
        sim.trick.push({ seat, card });
        if (sim.trick.length === 4) {
            const w = mcTrickWinner(sim.trick, trumpIdx);
            sim.tricksWon[w]++;
            sim.leader = w;
            sim.trick.length = 0;
        }
    }
    return sim.tricksWon;
}
