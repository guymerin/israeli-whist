# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Open `index.html` directly in a browser, or serve with any static file server:

```bash
python3 -m http.server 8000
# visit http://localhost:8000/
```

No build step, no install, no test command. Reload the page to apply changes.

## Verifying changes

There is no test framework. Verify changes by exercising the game in the browser and watching the DevTools console — most state transitions emit color-coded logs via `this.logPlayer(message, player)`.

The repo ships `.mcp.json` registering a Playwright MCP server for agent-driven smoke tests:
1. Serve the repo and open `http://localhost:8000/`
2. Drive the flow with Playwright MCP tools — click Deal, walk through Phase 1 bidding, Phase 2 takes prediction, and a few tricks of Phase 3
3. Use `evaluate` to read `window.game` state directly (`window.game.currentPhase`, `window.game.phase2Bids`, `window.game.scores`) and confirm the right `logPlayer` events fired

## Architecture

Three files; no modules, no build, no framework:

- **`index.html`** — static DOM. All elements exist at load time; script.js toggles `style.display` and writes `textContent` imperatively. Never renders from JS templates.
- **`styles.css`** — ~4.5k lines. Compass layout via `.north-player`, `.east-player`, `.south-player`, `.west-player`. Phase 2 predictions use a 3×3 grid (`.prediction-list`) with each `.prediction-item:nth-child(N)` pinned to a compass position.
- **`script.js`** — single `IsraeliWhist` class (~8k lines), instantiated once as `window.game`. State machine on `this.currentPhase`: `dealing → phase1 → phase2 → phase3 → scoring`, then back to `dealing` for the next gamlet.

### Players and DOM naming

Four seats addressed by compass keys: `north`, `east`, `south`, `west`. **`south` is always the human player.** Bots: Botti (N), Droidi (E), Chati (W). All DOM ids follow `${direction}-${what}` (e.g. `north-bid`, `south-cards`, `west-tricks`).

### Phase state machine

- **Phase 1 – Trump bidding** (`startPhase1`, `botMakePhase1Bid`, `endPhase1`): players bid `minTakes + trumpSuit` or pass; the highest bidder sets `this.trumpSuit`, `this.trumpWinner`, and `this.minimumTakes`.
- **Phase 2 – Takes prediction** (`startPhase2`, `showPhase2Interface`, `botMakePhase2Bid`): each player commits a predicted trick count into `this.phase2Bids`. The last bidder is constrained so the total can't equal 13 (the "over/under" rule, captured in `this.handType`).
- **Phase 3 – Card play** (`startPhase3`, `playCard`, `botPlayCard`, `determineTrickWinner`): tricks are played; `this.tricksWon[player]` accumulates. After 13 tricks, `calculateScore` runs.

Bots are driven from the same code paths as the human but auto-triggered: when a phase advances and `this.currentBidder === 2` (south), the UI controls are shown; otherwise the corresponding `botMake…`/`botPlayCard` method fires on a timer.

### Score granularity

- `this.scores` — cumulative within **one full game** (200 pts or 10 gamlets ends a game). `resetForNewHand` intentionally does NOT reset this.
- `this.cumulativeScores` — aggregates across **multiple full games** (session-level grand total); only ticks at full-game-end.
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

## Required conventions

- **Delays through `this.getDelay(...)`** — never raw `setTimeout(fn, 800)`. The Turbo checkbox sets `fastMode`, and `getDelay()` divides by 10 with a 50 ms floor.
- **Helpers for suit/player formatting**: `this.getSuitSymbol(suit)` (handles `clubs/diamonds/hearts/spades/notrump`), `this.getPlayerDisplayName(player)`, `this.logPlayer(msg, player)` (for game-event logging with player color).
- **After multi-field Phase 2 mutations**: call `this.refreshAllPhase2Displays()`. For broader board updates: `this.forceDisplayUpdate()`.
- **New UI elements**: add markup to `index.html` with a stable id, update imperatively from `script.js` — no templates.
- **Safari/mobile**: don't introduce APIs that break iOS Safari. There's a `setupSafariEmergencyFix()` global click detector and a `#rotate-device-overlay` for portrait mode. Keep layout usable in landscape on small screens.
