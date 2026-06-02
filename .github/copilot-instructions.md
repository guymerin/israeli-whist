# Copilot instructions — Israeli Whist

A browser-based implementation of the Israeli Whist card game. Pure, dependency-free
vanilla JavaScript / HTML / CSS — no build step, no package manager, no tests, no linter.

## Running the project

Open `index.html` directly in a browser (or serve it with any static file server such as
`python3 -m http.server`). There is no build, no install, and no test command.
Reload the page to apply changes.

There is no test framework. When verifying changes, exercise the game manually in the
browser and watch the DevTools console — most game state transitions emit color-coded
logs via `this.logPlayer(message, player)`.

### Verifying changes end-to-end with Playwright MCP

The repo ships a `.mcp.json` that registers the Playwright MCP server. Use it to drive
the game in a real browser when you need to confirm a UI change works:

1. Serve the repo (e.g. `python3 -m http.server 8000`) and open
   `http://localhost:8000/`.
2. Drive the flow with the Playwright MCP tools — click Deal, walk through Phase 1
   bidding, Phase 2 takes prediction, and a few tricks of Phase 3.
3. Use `evaluate` to read game state directly off `window.game` (e.g.
   `window.game.currentPhase`, `window.game.phase2Bids`, `window.game.scores`) and
   read console messages to confirm the right `logPlayer` events fired.

This is the closest thing the repo has to an integration test.

## Code layout

Just three files at the repository root:

- `index.html` — single-page DOM. Defines the compass-style board (north/east/south/west
  player slots), the trick area, and several conditionally-shown panels (bidding,
  second-phase bidding, total-score box, rules modal, etc.). UI elements are toggled by
  setting `style.display` from `script.js`; nothing is rendered from JS templates.
- `styles.css` — single stylesheet (~4.5k lines). Player slots are positioned with the
  classes `.north-player`, `.east-player`, `.south-player`, `.west-player`. The
  Phase 2 predictions panel uses a 3×3 grid (`.prediction-list`) where each
  `.prediction-item:nth-child(N)` is pinned to a compass position via
  `grid-column`/`grid-row`.
- `script.js` — single `IsraeliWhist` class (~8k lines). Instantiated once on
  `DOMContentLoaded` and assigned to `window.game`. A few debug helpers are also
  exposed on `window` (e.g. `window.forceUpdate`, `window.debugPhase2Bids`,
  `window.refreshPhase2Displays`, `window.testBidUpdate`).

## Game architecture (the big picture)

The game runs as a single state machine on `this.currentPhase`, which transitions
`dealing → phase1 → phase2 → phase3 → scoring` and then back to `dealing` for the next
gamlet (hand). All state — hands, bids, scores, AI memory — lives as fields on the
single `IsraeliWhist` instance; there is no module system and no separation between
model, view, and controller.

The four players are always referenced by the compass keys `'north'`, `'east'`,
`'south'`, `'west'`. **`south` is always the human player.** The other three are bots
with display names Botti (N), Droidi (E), Chati (W). Many DOM ids encode the same
convention (`north-bid`, `east-prediction`, `south-played`, `west-tricks`, …) so when
adding UI for a player, follow the `${direction}-${what}` pattern.

Each phase has a similar shape:

1. **Phase 1 – Trump bidding** (`startPhase1` area, `botMakePhase1Bid`, `endPhase1`):
   players bid `minTakes + trumpSuit` or pass; the highest bidder sets `this.trumpSuit`
   and `this.trumpWinner` and a `this.minimumTakes` floor for Phase 2.
2. **Phase 2 – Takes prediction** (`startPhase2`, `showPhase2Interface`,
   `botMakePhase2Bid`): each player commits a predicted trick count into
   `this.phase2Bids`. The last bidder is constrained so the total can't equal 13
   (the "over/under" rule, captured in `this.handType`).
3. **Phase 3 – Card play** (`startPhase3`, `playCard`, `botPlayCard`,
   `determineTrickWinner`): tricks are played; `this.tricksWon[player]` accumulates.
   When 13 tricks are done, `calculateScore` runs and the phase becomes `scoring`.

### The `botMemory` AI substrate

Bot decisions in every phase consult a single large object on the instance,
`this.botMemory`, initialized in the constructor (`script.js` ~line 100). Before
adding any new bot heuristic, check whether the signal you need already exists here
— most do. Its sub-structures are:

- **`cardsSeen`** — append-only log of every card observed during play
  (`{card, player, round}`), written by `updateCardMemory`.
- **`cardsPlayed[player]`** — per-player list of cards already played this gamlet.
  Used to compute remaining hand size as `13 - cardsPlayed[player].length`.
- **`trumpsPlayed`** — list of `{player, card}` for every trump that has hit the
  table. Used (with `cardsPlayed`) by `updateTrumpEstimates` to populate
  `probabilityModel.trumpEstimates[player]`.
- **`suitDistribution`** — global counter of how many cards of each suit remain
  unplayed across all hands. Decremented in `trackPlayedCard` / `updateCardMemory`.
- **`suitVoids[player][suit]`** — set to `true` the first time a player fails to
  follow suit (and didn't trump). Authoritative once set; many heuristics short-
  circuit on it. Read it via the helper around `script.js:3468` rather than poking
  the field directly.
- **`highCardsPlayed`** — lazily initialized by `trackHighCardPlayed` on first use.
  Holds per-rank arrays for A/K/Q/J that have been played, a `byPlayer` index, and
  a `remaining` map of suits still holding each top rank. Source of truth for
  questions like "is the diamond king still out?".
- **`probabilityModel`** — derived estimates: `remainingCards`,
  `playerLikelyHoldings[player]`, `trumpEstimates[player]`, and
  `suitLengthEstimates[player][suit]`. Refreshed from `cardsPlayed` /
  `trumpsPlayed`; never set these by hand without re-running the updater.
- **`playerPatterns[player]`** — long-lived bidding profile per seat with
  `biddingStyle` (`conservative` / `balanced` / `human`), `accuracy`,
  `riskTolerance`, and an append-only `learningData` array. The four seats are
  pre-tuned (Botti very conservative, Droidi balanced, Chati conservative,
  south = human). `analyzeOpponentBids` reads the last few entries of
  `learningData` to estimate the table's current overbid bias.
- **`behaviorProfiles[player]`** — separate, more dynamic profile built up during
  a session: `phase1History`, `phase2History`, an inferred `playingStyle`, and a
  `confidence` score that gates how strongly the bot trusts the profile.
  `evaluatePlayerBehaviorProfiling` / `analyzePlayerPattern` are the consumers.
- **`gameHistory`** — cross-gamlet historical data used for learning.

Key invariants and conventions when touching this code:

- `botMemory` lives **for the whole session**, not per gamlet. Hand-scoped fields
  (`cardsPlayed`, `trumpsPlayed`, `suitDistribution`, `suitVoids`,
  `highCardsPlayed`, `probabilityModel.*`) are explicitly reset between gamlets —
  if you add a new hand-scoped field, also add it to that reset path.
  Session-scoped fields (`playerPatterns`, `behaviorProfiles`, `gameHistory`,
  `cardsSeen`) should **not** be reset on a new gamlet.
- Use the existing trackers (`trackPlayedCard`, `updateCardMemory`,
  `trackHighCardPlayed`, `updateTrumpEstimates`) rather than mutating
  `botMemory` directly from new code paths — they keep the derived structures
  consistent with each other.
- Defensive reads are the norm: most consumers guard with
  `if (this.botMemory && this.botMemory.X && this.botMemory.X[player])` because
  some sub-structures (notably `highCardsPlayed`) are lazily created. Preserve
  that guard pattern in new readers.
- The bot is allowed to "see" the human's hand for inference — `updateTrumpEstimates`
  reads `this.hands[player]` directly when available. This is by design (the AI
  is asymmetric, not cheating in the player's favor); don't "fix" it by hiding the
  data unless that's the explicit task.

## Conventions specific to this codebase

- **Render by mutation, not re-render.** UI updates happen by writing to existing DOM
  elements by id (`document.getElementById('north-bid').textContent = …`) and by
  toggling `style.display` on container divs. There is no virtual DOM, no templating,
  and no event delegation framework. When adding a new visual element, add the markup
  to `index.html` with a stable id and update it imperatively from `script.js`.
- **After multi-field state changes, call a refresher.** Several derived displays
  (Phase 2 predictions, totals, score box) are easy to leave stale. Use
  `this.refreshAllPhase2Displays()` after Phase 2 mutations and
  `this.forceDisplayUpdate()` for the broader board, mirroring what the existing
  phase-transition methods do.
- **Suit and player formatting go through helpers.** Use `this.getSuitSymbol(suit)`
  (handles `clubs/diamonds/hearts/spades/notrump`) and
  `this.getPlayerDisplayName(player)` instead of hard-coding strings. Use
  `this.logPlayer(msg, player)` rather than `console.log` for any
  game-event log line so it picks up the player's color.
- **Delays must go through `this.getDelay(...)`** (or equivalent) so the Turbo
  ("fast mode") checkbox actually speeds the game up — it divides normal delays by 10
  with a 50 ms floor. Don't use raw `setTimeout(fn, 800)` for animation/bot pacing.
- **Bots are driven from the same code paths as the human, but auto-triggered.**
  When a phase advances and `this.currentBidder === 2` (south), the UI controls are
  shown; otherwise the corresponding `botMake…` / `botPlayCard` method runs on a
  timer. Preserve this branching when adding new interactive steps.
- **Score is tracked at multiple granularities.** `this.scores` accumulates
  across gamlets within **one full game** (the 200-pt / 10-gamlet game-end check
  reads `scores`). `this.cumulativeScores` aggregates across **multiple full
  games** (it only ticks at full-game-end). Per-gamlet deltas live in
  `this.gamletHistory` and feed the extended scorecard view.
- **Don't break Safari / mobile.** `index.html` carries explicit Safari and mobile
  meta tags, there is a landscape-orientation overlay (`#rotate-device-overlay`), and
  `script.js` has a `setupSafariEmergencyFix()` global click detector. Avoid
  introducing APIs that don't work on iOS Safari, and keep the layout usable in
  landscape on small screens.
