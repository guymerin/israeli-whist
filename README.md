# Israeli Whist

A browser-based implementation of the Israeli Whist card game. Vanilla JavaScript, HTML, and CSS — no build step, no package manager, no test framework.

## Run it

Either open `index.html` directly in a browser, or serve the directory:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Reload the page to apply changes. You play as **South** against three bots (Botti / Droidi / Chati).

## Rules

Tap the **📖 Rules** button in-game. Quick summary:

1. **Phase 1 — Trump bidding.** Bid a minimum number of tricks + trump suit, or pass. Each bid must beat the previous (more tricks, or same tricks with a higher-ranked trump: ♣ < ♦ < ♥ < ♠ < NT). Highest bidder sets the trump and a minimum-takes floor for Phase 2.
2. **Phase 2 — Takes prediction.** Starting with the trump winner and going clockwise, every player predicts how many tricks they will win. The four predictions cannot total exactly 13 (the "over/under" rule).
3. **Phase 3 — Play.** Trump winner leads. Follow suit if able; otherwise play anything (including trump). Highest of the led suit wins unless trumped.
4. **Scoring.** +10 per trick taken, +10 bonus if tricks equal bid, −10 per trick over or under. Game ends at 200 cumulative points or 10 gamlets.

## Repository layout

| File | What's in it |
|------|--------------|
| `index.html` | Single-page DOM, compass-style board, all conditional panels. |
| `styles.css` | Single stylesheet incl. compass layout and mobile breakpoints. |
| `script.js` | Single `IsraeliWhist` class instantiated as `window.game`. |
| `.github/copilot-instructions.md` | Authoritative conventions for AI / human contributors. |
| `.mcp.json` | Playwright MCP registration for browser-driven manual verification. |

## Development notes

- **No tests.** Verify changes by exercising the game in the browser and watching the DevTools console — most state transitions emit color-coded `logPlayer` events. The `.mcp.json` registers Playwright MCP for agent-driven smoke tests against `window.game`.
- **State is on `window.game`.** Useful fields: `currentPhase`, `phase1Bids`, `phase2Bids`, `trumpSuit`, `trumpWinner`, `minimumTakes`, `tricksWon`, `hands`, `currentTrick`. Note the score-field naming is slightly confusing: `scores` accumulates within one full game (200 pts / 10 gamlets ends a game); `cumulativeScores` aggregates across multiple full games. Per-gamlet deltas live in `gamletHistory`.
- **Mobile.** Designed for landscape on small screens; portrait shows a rotate overlay. Don't introduce APIs that break iOS Safari — there is an explicit `setupSafariEmergencyFix()`.
- **Conventions.** See `.github/copilot-instructions.md` for required helpers (`getDelay`, `getSuitSymbol`, `getPlayerDisplayName`, `logPlayer`, `refreshAllPhase2Displays`) and the per-phase state-machine contract.
