# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Open `index.html` directly in a browser, or serve with any static file server:

```bash
python3 -m http.server 8000
# visit http://localhost:8000/
```

No build step for the game itself. Reload the page to apply changes.

## Debug logging

Logging (including the color-coded `logPlayer` events) is **silent by default** so players get a clean console. Open the page with `?debug` in the URL (e.g. `index.html?debug`) to turn it on. Under the hood: `dlog(...)`/`dwarn(...)` are module-level globals gated on `WHIST_DEBUG` (derived from the URL); `console.error` is never gated, so genuine failures always surface. `window.game.debug` reflects the flag.

## Testing

There is now a runnable test suite (dev-only; the game still ships with zero runtime dependencies). Install once, then run:

```bash
npm install                       # installs playwright (devDependency)
npx playwright install chromium   # one-time browser download
npm test                          # unit + parity + strength
```

- `npm run test:unit` — **`tests/mc-engine.test.mjs`**: Node-native, no browser. Imports `mc-engine.js` directly and checks encode/decode, trick-winner parity, playout=13, sampler sizes/coverage/voids. Sub-second.
- `npm run test:parity` — **`tests/mc-parity.mjs`**: in-browser parity of the live engine vs `determineTrickWinner`.
- `npm run test:strength` — **`tests/mc-strength.mjs`**: MC vs heuristic A/B (exact-hit rate, score/seat, decision-time p95). `WHIST_DEALS=N` to resize.
- `npm run test:smoke` — **`tests/smoke-test.mjs`**: one full gamlet, phase flow, scoring rules, over/under rule, no page errors.

The Playwright suites boot their own ephemeral static server via `tests/static-server.mjs` (set `WHIST_URL` to point at an external one instead). The repo also ships `.mcp.json` registering a Playwright MCP server for interactive agent-driven checks — drive Deal → Phase 1 → Phase 2 → a few tricks, and read `window.game` state (`currentPhase`, `phase2Bids`, `gameScores`) directly.

## Architecture

No build, no framework. `script.js` is a classic (non-module) script; the pure MC engine is a real ES module loaded alongside it:

- **`index.html`** — static DOM. All elements exist at load time; script.js toggles `style.display` and writes `textContent` imperatively. Never renders from JS templates. Loads `mc-engine.js` via a tiny `type="module"` shim that assigns the namespace to `window.MCEngine` (runs before `DOMContentLoaded`), then loads `script.js` classic.
- **`mc-engine.js`** — the pure Determinized Monte Carlo core, extracted as an ES module: integer-only, no DOM, no `this`. Exports `mcTrickWinner`, `mcPlayout`, `mcSampleDeal`, `mcRolloutMove`, `mcEncode/Decode`, etc. `script.js`'s `mc*` simulation methods delegate here (`window.MCEngine.*`); Node tests import it directly. Keeping `script.js` a classic script avoids forcing ~9k lines into strict mode in one step.
- **`styles.css`** — ~4.5k lines. Compass layout via `.north-player`, `.east-player`, `.south-player`, `.west-player`. Phase 2 predictions use a 3×3 grid (`.prediction-list`) with each `.prediction-item:nth-child(N)` pinned to a compass position.
- **`script.js`** — single `IsraeliWhist` class (~9k lines), instantiated once as `window.game`. State machine on `this.currentPhase`: `dealing → phase1 → phase2 → phase3 → scoring`, then back to `dealing` for the next gamlet.

### Session persistence

`saveSession()`/`restoreSession()` mirror the **between-gamlet** session state (`sessionScores`, `gameScores`, `gamletHistory`, `gamletNumber`, `fullGameNumber`, `gamletsPlayed`, `playerName`) to `localStorage` under `this.SESSION_KEY` (`israeliWhist_session`). Saved at each gamlet end (`saveGamletToHistory`) and full-game grand-total update; restored in `initializeGame()` before the board first renders, so a reload resumes the session (the next Deal continues it). Mid-trick play is intentionally **not** persisted. `window.clearWhistSession()` forgets it.

### Players and DOM naming

Four seats addressed by compass keys: `north`, `east`, `south`, `west`. **`south` is always the human player.** Bots: Botti (N), Droidi (E), Chati (W). All DOM ids follow `${direction}-${what}` (e.g. `north-bid`, `south-cards`, `west-tricks`).

### Phase state machine

- **Phase 1 – Trump bidding** (`startPhase1`, `botMakePhase1Bid`, `endPhase1`): players bid `minTakes + trumpSuit` or pass; the highest bidder sets `this.trumpSuit`, `this.trumpWinner`, and `this.minimumTakes`.
- **Phase 2 – Takes prediction** (`startPhase2`, `showPhase2Interface`, `botMakePhase2Bid`): each player commits a predicted trick count into `this.phase2Bids`. The last bidder is constrained so the total can't equal 13 (the "over/under" rule, captured in `this.handType`).
- **Phase 3 – Card play** (`startPhase3`, `playCard`, `botPlayCard`, `determineTrickWinner`): tricks are played; `this.tricksWon[player]` accumulates. After 13 tricks, `calculateScore` runs.

Bots are driven from the same code paths as the human but auto-triggered: when a phase advances and `this.currentBidder === 2` (south), the UI controls are shown; otherwise the corresponding `botMake…`/`botPlayCard` method fires on a timer.

### Score granularity

- `this.gameScores` — cumulative within **one full game** (200 pts or 10 gamlets ends a game). `resetForNewHand` intentionally does NOT reset this. (Renamed from `this.scores`.)
- `this.sessionScores` — aggregates across **multiple full games** (session-level grand total); only ticks at full-game-end. (Renamed from `this.cumulativeScores`.)
- `this.gamletHistory` — per-gamlet deltas; feeds the extended scorecard view.

### `botMemory` AI substrate

All bot intelligence lives on `this.botMemory` (initialized in constructor ~line 100). Two lifetime scopes:

**Hand-scoped** (reset between gamlets): `cardsPlayed`, `trumpsPlayed`, `suitDistribution`, `suitVoids`, `highCardsPlayed`, `probabilityModel.*`. If you add a new hand-scoped field, also reset it in the gamlet-reset path.

**Session-scoped** (never reset): `playerPatterns`, `behaviorProfiles`, `gameHistory`, `cardsSeen`.

Key sub-structures:
- `cardsSeen` — append-only log of every observed card `{card, player, round}`
- `cardsPlayed[player]` — cards played this gamlet; hand size = `13 - cardsPlayed[player].length`
- `suitVoids[player][suit]` — set `true` the first time a player fails to follow suit; many heuristics short-circuit on it
- `highCardsPlayed` — lazily initialized; tracks A/K/Q/J played, with `byPlayer` index and `remaining` map
- `probabilityModel` — derived estimates refreshed from `cardsPlayed`/`trumpsPlayed`; never mutate directly

Use the existing trackers (`trackPlayedCard`, `updateCardMemory`, `trackHighCardPlayed`, `updateTrumpEstimates`) rather than mutating `botMemory` directly. Preserve defensive reads (`if (this.botMemory && this.botMemory.X && this.botMemory.X[player])`) because `highCardsPlayed` is lazily created.

### Monte Carlo (PIMC) engine

The bots' primary intelligence is a Determinized Monte Carlo engine — one contiguous `mc*` block right after `getCardValue`. It samples the unseen cards into consistent opponent hands, simulates playouts, and picks the action that maximizes the acting seat's expected **score** (not tricks). The legacy `evaluate*`/`calculate*Bid` heuristics remain as a guaranteed fallback and run only when MC is disabled or sampling fails.

- **Wiring**: Phase 3 — `selectValidBotCard` tries `mcTryPhase3` first (PIMC per-card), else heuristic. Phase 2 — `calculateSmartPhase2Bid` prefers `mcTrickDistributionPhase2` (empirical trick distribution) and feeds the existing EV loop. Phase 1 — `botMakePhase1Bid` uses `mcEvaluatePhase1`/`mcFindRaise`, keeping `isBidHigher`/min-bid-5/legality gates.
- **Fairness invariant**: an MC decision for a seat reads only `this.hands[seat]` plus *public* state (`cardsPlayed`, `suitVoids`, `currentTrick`, `trumpSuit`, bids). It must **never** read another seat's real hand — opponent hands are always sampled. All MC methods work on plain SimState copies and integer card ids (`id = suitIndex*13 + rankIndex`); they never mutate `this.hands`/`this.currentTrick`/`this.botMemory`/`this.tricksWon`.
- **Budget/safety**: `this.mcConfig` sets sample counts; every loop honors a `performance.now()` deadline (`maxMs`/`maxMsTurbo`). `this.mcEnabled` is the master switch (tests/benchmarks toggle it). `_mcCache` (per-gamlet) is cleared in `resetBotMemory`. `mcTrickWinner` must stay logically identical to `determineTrickWinner` — `tests/mc-parity.mjs` guards this.
- **Tests**: `tests/mc-parity.mjs` (trick-winner parity, playout=13, sampler/void validity), `tests/mc-strength.mjs` (MC vs heuristic A/B — exact-hit rate, score/seat, decision-time p95).

## Required conventions

- **Delays through `this.getDelay(...)`** — never raw `setTimeout(fn, 800)`. The Turbo checkbox sets `fastMode`, and `getDelay()` divides by 10 with a 50 ms floor.
- **Helpers for suit/player formatting**: `this.getSuitSymbol(suit)` (handles `clubs/diamonds/hearts/spades/notrump`), `this.getPlayerDisplayName(player)`, `this.logPlayer(msg, player)` (for game-event logging with player color).
- **After multi-field Phase 2 mutations**: call `this.refreshAllPhase2Displays()`. For broader board updates: `this.forceDisplayUpdate()`.
- **New UI elements**: add markup to `index.html` with a stable id, update imperatively from `script.js` — no templates.
- **Safari/mobile**: don't introduce APIs that break iOS Safari. There's a `setupSafariEmergencyFix()` global click detector and a `#rotate-device-overlay` for portrait mode. Keep layout usable in landscape on small screens.
