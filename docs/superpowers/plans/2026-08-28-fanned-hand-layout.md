# Fanned Hand Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "fanned hand" layout that arcs the human player's cards — two bowed rows in portrait, one bowed row in landscape — without overlapping any card.

**Architecture:** `layoutHumanHand()` stamps one unitless number per card (`--fan-t`, its position within its own row, −1…+1). A single CSS rule, scoped to `body.hand-fanned`, derives both the tilt and a `1 − t²` arc lift from it, with the two magnitudes (`--fan-tilt`, `--fan-bow`) set per breakpoint. Because JS contributes nothing with a magnitude, no resize or orientation listener is needed.

**Tech Stack:** Vanilla JS (no modules, no build), CSS custom properties, Playwright for tests.

**Spec:** `docs/superpowers/specs/2026-08-28-fanned-hand-layout-design.md`

## Global Constraints

- **No build step.** `script.js` is a classic (non-module) script; edit it in place.
- **Flat DOM.** Cards must stay direct children of `#south-cards`. Every gesture identifies a card by `parentElement.id === 'south-cards'`. Never wrap rows in an element.
- **Delays via `this.getDelay(...)`** — never a raw `setTimeout(fn, 800)`.
- **iOS Safari must not break.** No new APIs. Trig stays in JS; CSS uses only `calc()` multiplication and addition.
- **The unfanned layout must stay bit-for-bit identical.** Every new CSS rule is scoped under `body.hand-fanned`.
- **`!important` is required** on any rule setting `transform` on a hand card — see Task 2 for why.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `script.js` | `stampFanPositions()` computes `--fan-t`; `applyHandLayout()` / `setHandLayout()` own the preference | Modify |
| `theme-cardroom.css` | The fan rule, its cascade overrides, and the per-breakpoint magnitudes | Modify |
| `index.html` | The menu checkbox | Modify |
| `tests/hand-fan.mjs` | Layout + geometry contract for the fan | Create |
| `tests/card-selection.mjs` | Re-runs the gesture contract with the fan on | Modify |
| `package.json` | Registers `test:fan` | Modify |

---

### Task 1: Stamp each card's place in its row

**Files:**
- Modify: `script.js` — `layoutHumanHand()` at `script.js:3287`
- Create: `tests/hand-fan.mjs`
- Modify: `package.json:9-13`

**Interfaces:**
- Consumes: `findHandRowSplit(cards)` → `number` (index of the first card of row 2, or `0` for a single row), already at `script.js:3305`.
- Produces: `stampFanPositions(container, split, total)` → `void`. Sets a `--fan-t` inline custom property on every `.card` child of `container`. Later tasks read `--fan-t` from CSS only.

- [ ] **Step 1: Write the failing test**

Create `tests/hand-fan.mjs`:

```javascript
/**
 * Israeli Whist — fanned hand layout test.
 *
 * The fan is one CSS rule fed by --fan-t, the card's place in its own row,
 * which layoutHumanHand() stamps as a number from -1 (left end) through 0
 * (centre) to +1 (right end). These tests pin two things:
 *
 *   1. --fan-t is stamped per ROW, not across the whole hand, so a two-row
 *      portrait hand gets two independent -1 … +1 sweeps
 *   2. with the fan on, no card overlaps its neighbour and no card escapes
 *      the hand's box — the whole point of arcing the existing rows rather
 *      than collapsing them into one overlapping sweep
 *
 * Run:  node tests/hand-fan.mjs      (or: npm run test:fan)
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

/** A 13-card hand that splits 6 + 7 on a suit boundary. */
const HAND = [
  { rank: '4', suit: 'clubs' }, { rank: '5', suit: 'clubs' },
  { rank: '8', suit: 'clubs' }, { rank: '9', suit: 'clubs' },
  { rank: 'Q', suit: 'clubs' }, { rank: 'A', suit: 'clubs' },
  { rank: '5', suit: 'diamonds' }, { rank: '8', suit: 'diamonds' },
  { rank: '9', suit: 'diamonds' }, { rank: '10', suit: 'diamonds' },
  { rank: '6', suit: 'spades' }, { rank: '9', suit: 'spades' },
  { rank: '3', suit: 'hearts' }
];

/** Lays `n` cards into the human seat and returns each card's --fan-t. */
async function fanValues(page, n) {
  return page.evaluate((count) => {
    const g = window.game;
    const hand = window.HAND_FIXTURE.slice(0, count);
    const el = document.getElementById('south-cards');
    g.layoutHumanHand(el, hand);
    return [...el.querySelectorAll('.card')]
      .map(c => parseFloat(c.style.getPropertyValue('--fan-t')));
  }, n);
}

const page = await browser.newPage({ viewport: { width: 420, height: 912 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
await page.evaluate((hand) => {
  window.game.startGameWithName('Tester');
  window.game.fastMode = true;
  window.HAND_FIXTURE = hand;
}, HAND);

/* ── 1. a 13-card hand gets two independent sweeps ───────────────────── */
const thirteen = await fanValues(page, 13);
const split = await page.evaluate(() => window.game.findHandRowSplit(window.HAND_FIXTURE));
const rowA = thirteen.slice(0, split);
const rowB = thirteen.slice(split);
const near = (a, b) => Math.abs(a - b) < 0.001;

check('every card is stamped', thirteen.length === 13 && thirteen.every(v => Number.isFinite(v)),
  `${thirteen.filter(Number.isFinite).length}/13`);
check('row 1 runs -1 … +1', near(rowA[0], -1) && near(rowA[rowA.length - 1], 1),
  `${rowA[0]} … ${rowA[rowA.length - 1]}`);
check('row 2 runs -1 … +1 independently', near(rowB[0], -1) && near(rowB[rowB.length - 1], 1),
  `${rowB[0]} … ${rowB[rowB.length - 1]}`);
check('each row is symmetric about 0',
  near(rowA.reduce((a, b) => a + b, 0), 0) && near(rowB.reduce((a, b) => a + b, 0), 0));
check('values increase left to right',
  rowA.every((v, i) => i === 0 || v > rowA[i - 1]) &&
  rowB.every((v, i) => i === 0 || v > rowB[i - 1]));

/* ── 2. a short hand is one row ──────────────────────────────────────── */
const five = await fanValues(page, 5);
check('a 5-card hand is a single sweep',
  five.length === 5 && near(five[0], -1) && near(five[4], 1) && near(five[2], 0),
  five.join(', '));

/* ── 3. a single card sits upright ───────────────────────────────────── */
const one = await fanValues(page, 1);
check('a lone card is centred, not tilted', one.length === 1 && near(one[0], 0), String(one[0]));

console.log('\n=== RESULT ===');
const failed = results.filter(r => !r.pass);
if (errors.length) console.log('page errors:', errors);
if (failed.length || errors.length) {
  console.log(`HAND FAN FAILED ❌ (${failed.length}/${results.length} checks failed)`);
  await browser.close(); served?.close();
  process.exit(1);
}
console.log(`HAND FAN PASSED ✅ (${results.length} checks: per-row sweep, symmetry, short hands)`);
await browser.close();
served?.close();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/hand-fan.mjs`
Expected: FAIL — every `--fan-t` reads `NaN`, so "every card is stamped" fails, because `stampFanPositions()` does not exist yet.

- [ ] **Step 3: Add `stampFanPositions()` to script.js**

Insert immediately after `layoutHumanHand()` ends (after the closing brace of the method that starts at `script.js:3287`):

```javascript
    /**
     * Stamps each card with its place in its OWN row as --fan-t, a number
     * running -1 at the left end, through 0 at the centre, to +1 at the right.
     *
     * That single value is the whole JS side of the fanned layout: the CSS
     * derives both the tilt and the 1 - t² arc lift from it. Nothing here
     * knows about degrees, pixels, or the viewport, which is precisely why
     * the fan needs no resize or orientation listener — the magnitudes live
     * in CSS, where the breakpoints already are.
     *
     * Stamped unconditionally, whether or not the fan is switched on: it is
     * two multiplications per card, and it means toggling the setting is a
     * class flip with no re-layout.
     *
     * @param {HTMLElement} container The #south-cards element.
     * @param {number} split Index of the first card of row 2, or 0 for one row.
     * @param {number} total Number of cards in the hand.
     */
    stampFanPositions(container, split, total) {
        const cards = container.querySelectorAll('.card');
        const rows = split ? [[0, split], [split, total]] : [[0, total]];
        for (const [from, to] of rows) {
            const mid = (to - from - 1) / 2;
            for (let i = from; i < to; i++) {
                const el = cards[i];
                if (!el) continue;
                // A one-card row has no spread to divide by; it sits upright.
                const t = mid > 0 ? (i - from - mid) / mid : 0;
                el.style.setProperty('--fan-t', t.toFixed(4));
            }
        }
    }
```

- [ ] **Step 4: Call it from `layoutHumanHand()`**

In `layoutHumanHand()`, the method currently ends:

```javascript
        const longestRow = split ? Math.max(split, cards.length - split) : cards.length;
        container.style.setProperty('--hand-cols', String(Math.max(7, longestRow)));
    }
```

Change to:

```javascript
        const longestRow = split ? Math.max(split, cards.length - split) : cards.length;
        container.style.setProperty('--hand-cols', String(Math.max(7, longestRow)));
        this.stampFanPositions(container, split, cards.length);
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/hand-fan.mjs`
Expected: `HAND FAN PASSED ✅ (6 checks: per-row sweep, symmetry, short hands)`

- [ ] **Step 6: Register the test in package.json**

In `package.json`, change the `test` and add `test:fan`:

```json
    "test": "npm run test:unit && npm run test:parity && npm run test:cards && npm run test:fan && npm run test:smoke && npm run test:strength",
    "test:fan": "node tests/hand-fan.mjs",
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: exit 0, with `HAND FAN PASSED ✅` among the results.

- [ ] **Step 8: Commit**

```bash
git add script.js tests/hand-fan.mjs package.json
git commit -m "feat(hand): stamp each card's place in its row as --fan-t

One unitless number per card, -1 through 0 to +1 across its own row. It
carries no degrees, pixels, or viewport knowledge, so the magnitudes can
live in CSS beside the breakpoints and the fan needs no resize listener.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The arc itself

**Files:**
- Modify: `theme-cardroom.css` — new section at the end
- Modify: `tests/hand-fan.mjs` — add geometry checks

**Interfaces:**
- Consumes: `--fan-t` on each `.card` (Task 1).
- Produces: the `body.hand-fanned` scope. Task 3 toggles that class.

**Why `!important` is mandatory here.** This was tested in a browser, not assumed:

1. `styles.css:3350` sets `transform: none !important` on `.human-cards .card` inside `@media (orientation: landscape) and (max-height: 500px)`. Without `!important`, the fan is simply erased in landscape.
2. Adding `!important` plus an ID to the selector makes the fan rule outrank `.human-cards .card.card-armed` (`styles.css:1254`), whose lift has no `!important`. Left alone, **the two-stage card lift breaks**: the armed card tilts but never rises. So the armed and hover states are re-declared inside the fanned scope.
3. The drag path needs nothing: it writes its transform inline *with* `!important` (`script.js:2240`), and an important inline style outranks an important stylesheet rule. `removeProperty('transform')` drops back to the fan rule.

- [ ] **Step 1: Write the failing geometry test**

Append to `tests/hand-fan.mjs`, immediately before the `console.log('\n=== RESULT ===')` line:

```javascript
/* ── 4. with the fan on, nothing overlaps and nothing escapes ────────── */

/** Turns the fan on, lays out 13 cards, and measures what the user can hit. */
async function fanGeometry(page) {
  return page.evaluate(() => {
    document.body.classList.add('hand-fanned');
    const el = document.getElementById('south-cards');
    window.game.layoutHumanHand(el, window.HAND_FIXTURE);
    const cards = [...el.querySelectorAll('.card')];
    const host = el.getBoundingClientRect();
    let escaped = 0, mishit = 0, tilted = 0;
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      if (b.left < host.left - 0.5 || b.right > host.right + 0.5) escaped++;
      // The point a thumb aims at must resolve to this card, not a neighbour.
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (!hit || hit.closest('.card') !== c) mishit++;
      if (getComputedStyle(c).transform !== 'none') tilted++;
    }
    return { n: cards.length, escaped, mishit, tilted };
  });
}

const geo = await fanGeometry(page);
check('the fan actually applies a transform', geo.tilted === geo.n, `${geo.tilted}/${geo.n} transformed`);
check('no card escapes the hand box', geo.escaped === 0, `${geo.escaped} escaped`);
check('every card centre hits that card', geo.mishit === 0, `${geo.mishit} mis-hits`);

/* ── 5. the lift still works when fanned ─────────────────────────────── */
const liftWorks = await page.evaluate(() => {
  const el = document.getElementById('south-cards');
  const card = el.querySelector('.card');
  card.classList.add('card-armed');
  const m = new DOMMatrixReadOnly(getComputedStyle(card).transform);
  card.classList.remove('card-armed');
  return m.m42;   // translateY in px; the armed lift is -24
});
check('an armed card still rises', liftWorks < -20, `translateY ${liftWorks.toFixed(1)}px`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/hand-fan.mjs`
Expected: FAIL on "the fan actually applies a transform" — `0/13 transformed`, because `body.hand-fanned` matches no rule yet.

- [ ] **Step 3: Add the fan CSS**

Append to the end of `theme-cardroom.css`:

```css
/* ── 12. Fanned hand (opt-in) ───────────────────────────────────────────────
   A second hand layout that reads as a hand being held: the same rows the
   unfanned layout produces, bowed on an arc. Nothing overlaps — a single
   13-card portrait arc leaves a 22px sliver per card, which is the mis-tap
   problem the two-row split was built to fix.

   The whole arc is driven by --fan-t, the card's place in its own row that
   layoutHumanHand() stamps (-1 … +1). `1 - t*t` is the bow: it peaks at the
   row's centre and falls to zero at both ends. Two knobs — --fan-tilt and
   --fan-bow — are all that separates portrait from landscape.

   Why !important, and why the states below are re-declared: the landscape
   block in styles.css sets `transform: none !important` on .human-cards
   .card, so the fan rule has to shout to exist at all. Shouting makes it
   outrank .card-armed's lift (which carries no !important), so that lift is
   restored here explicitly — otherwise switching the fan on silently breaks
   two-stage card selection. The drag path needs no help: it writes its
   transform inline with !important, which outranks any stylesheet rule, and
   removeProperty() falls back here. */
body.hand-fanned #south-cards.human-cards .card {
    --t: var(--fan-t, 0);
    transform:
        translateY(calc((1 - var(--t) * var(--t)) * var(--fan-bow, 0px)))
        rotate(calc(var(--t) * var(--fan-tilt, 0deg))) !important;
    transform-origin: 50% 160% !important;
}

/* Pulling a card out of a real hand straightens it, so the lifted states
   carry no rotation. These re-declare what the fan rule would otherwise
   outrank. */
body.hand-fanned #south-cards.human-cards .card.card-armed {
    transform: translateY(-24px) scale(1.16) !important;
}
@media (hover: hover) and (pointer: fine) {
    body.hand-fanned #south-cards.human-cards .card:hover {
        transform: translateY(-15px) scale(1.06) !important;
    }
}

/* Portrait phones: two rows, so each row only needs a gentle bow. The card
   width cap drops 56 -> 52px because rotating about a pivot below the card
   swings the end cards sideways, and that swing has to come out of the
   row's width or the outermost card hangs off the screen. */
@media (orientation: portrait) and (max-width: 760px) {
    body.hand-fanned #south-cards.human-cards {
        --fan-tilt: 6deg;
        --fan-bow: -9px;
        --cw: min(52px, calc((100vw - 52px) / var(--hand-cols, 7))) !important;
    }
}

/* Landscape: one row of 13 with width to spare, so it can take the full
   sweep and still leave every card wider than a fingertip. */
@media (orientation: landscape) and (max-height: 500px) {
    body.hand-fanned #south-cards.human-cards {
        --fan-tilt: 11deg;
        --fan-bow: -16px;
        --cw: min(60px, calc((100vw - 96px) / 13)) !important;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/hand-fan.mjs`
Expected: `HAND FAN PASSED ✅ (10 checks: …)` — all four new checks green, in particular "an armed card still rises" at roughly `-24px`.

- [ ] **Step 5: Verify landscape too**

Run this one-off to confirm the fan survives `transform: none !important`:

```bash
cat > /tmp/land.mjs <<'EOF'
import { chromium } from 'playwright';
import { ensureServer } from './tests/static-server.mjs';
const served = await ensureServer();
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
await p.goto(served.url, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.game);
const r = await p.evaluate(() => {
  window.game.startGameWithName('Tester');
  document.body.classList.add('hand-fanned');
  const el = document.getElementById('south-cards');
  window.game.layoutHumanHand(el, window.game.hands.south || []);
  const cards = [...el.querySelectorAll('.card')];
  return { n: cards.length,
           flat: cards.filter(c => getComputedStyle(c).transform === 'none').length };
});
console.log(JSON.stringify(r));
await b.close(); served.close?.();
EOF
cp /tmp/land.mjs ./_land.mjs && node ./_land.mjs; rm -f ./_land.mjs /tmp/land.mjs
```

Expected: `flat` is `0` — no card was flattened by the landscape rule.

- [ ] **Step 6: Commit**

```bash
git add theme-cardroom.css tests/hand-fan.mjs
git commit -m "feat(hand): arc the hand from --fan-t

One rule derives both tilt and a 1 - t² lift from the stamped number, with
--fan-tilt and --fan-bow as the only per-breakpoint knobs. Neither
arrangement overlaps, so every card stays fully tappable.

The !important is not decoration: styles.css forces transform:none on hand
cards in landscape, so the rule needs an ID and a shout to exist there. That
in turn outranks .card-armed's un-shouted lift, so the armed and hover
states are re-declared here — without that, turning the fan on would leave
the armed card tilted but never risen, silently breaking card selection.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The setting

**Files:**
- Modify: `index.html:82-87` (inside `#game-menu`)
- Modify: `script.js:51` (constructor), `script.js:270` (`initializeGame`), `script.js:6692` (menu wiring)
- Modify: `tests/hand-fan.mjs`

**Interfaces:**
- Consumes: the `body.hand-fanned` scope (Task 2).
- Produces: `applyHandLayout()` → `boolean` (true when fanned); `setHandLayout(fanned: boolean)` → `void`; `this.HAND_LAYOUT_KEY` → `'israeliWhist_handLayout'`, values `'fan'` / `'rows'`.

- [ ] **Step 1: Write the failing test**

Append to `tests/hand-fan.mjs`, before the `console.log('\n=== RESULT ===')` line:

```javascript
/* ── 6. the setting persists and defaults to the current layout ──────── */
const pref = await page.evaluate(() => {
  const g = window.game;
  const key = g.HAND_LAYOUT_KEY;
  localStorage.removeItem(key);
  document.body.classList.remove('hand-fanned');
  const defaultsOff = g.applyHandLayout() === false &&
                      !document.body.classList.contains('hand-fanned');
  g.setHandLayout(true);
  const onNow = document.body.classList.contains('hand-fanned') &&
                localStorage.getItem(key) === 'fan';
  document.body.classList.remove('hand-fanned');
  const restored = g.applyHandLayout() === true &&
                   document.body.classList.contains('hand-fanned');
  const box = document.getElementById('fan-layout-checkbox');
  const boxSynced = !!box && box.checked === true;
  g.setHandLayout(false);
  const offAgain = localStorage.getItem(key) === 'rows';
  return { defaultsOff, onNow, restored, boxSynced, offAgain };
});
check('defaults to the straight rows', pref.defaultsOff);
check('turning it on sets the class and remembers it', pref.onNow);
check('a reload restores the fan', pref.restored);
check('the menu checkbox reflects the saved value', pref.boxSynced);
check('turning it off is remembered too', pref.offAgain);

/* The preference must outlive a session reset. */
const survives = await page.evaluate(() => {
  window.game.setHandLayout(true);
  window.clearWhistSession();
  return localStorage.getItem(window.game.HAND_LAYOUT_KEY) === 'fan';
});
check('clearing the session keeps the layout choice', survives);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/hand-fan.mjs`
Expected: FAIL — a `TypeError` recorded as a page error, because `g.applyHandLayout` is not a function.

- [ ] **Step 3: Add the checkbox to index.html**

In `index.html`, directly after the closing `</div>` of the existing `.fast-mode-container` (the Turbo block at lines 82–87) and before `<button id="new-game-btn" …>`:

```html
                <!-- Hand layout toggle -->
                <div class="fast-mode-container">
                    <label class="fast-mode-label">
                        <input type="checkbox" id="fan-layout-checkbox" class="fast-mode-checkbox">
                        <span class="fast-mode-text">🃏 Fanned hand</span>
                    </label>
                </div>
```

- [ ] **Step 4: Add the storage key**

In the constructor, directly after the `this.SESSION_KEY` line at `script.js:51`:

```javascript
        // Hand layout preference. Deliberately NOT inside SESSION_KEY:
        // clearWhistSession() forgets a session, but which layout you like
        // should outlive that.
        this.HAND_LAYOUT_KEY = 'israeliWhist_handLayout';
```

- [ ] **Step 5: Add the two methods**

Insert immediately after `stampFanPositions()` (added in Task 1):

```javascript
    /**
     * Reads the saved hand-layout preference and applies it to the board.
     * Called once during initializeGame(), before the first render.
     * @returns {boolean} true when the fanned layout is on.
     */
    applyHandLayout() {
        let fanned = false;
        try {
            fanned = localStorage.getItem(this.HAND_LAYOUT_KEY) === 'fan';
        } catch (e) { /* Safari private mode: fall back to the default */ }
        document.body.classList.toggle('hand-fanned', fanned);
        const box = document.getElementById('fan-layout-checkbox');
        if (box) box.checked = fanned;
        return fanned;
    }

    /**
     * Switches the hand layout and remembers the choice. A class flip only —
     * --fan-t is stamped on every layout regardless, so nothing re-renders.
     * @param {boolean} fanned Whether to fan the hand.
     */
    setHandLayout(fanned) {
        document.body.classList.toggle('hand-fanned', !!fanned);
        try {
            localStorage.setItem(this.HAND_LAYOUT_KEY, fanned ? 'fan' : 'rows');
        } catch (e) { /* private mode: the class still applies for this session */ }
    }
```

- [ ] **Step 6: Call it during init**

In `initializeGame()`, directly after `this.restoreSession();` at `script.js:270`:

```javascript
        // Hand layout preference, applied before the board first renders so
        // the hand never flashes in the wrong arrangement.
        this.applyHandLayout();
```

- [ ] **Step 7: Wire the checkbox**

In the menu wiring, directly after the `fastModeCheckbox` block that begins at `script.js:6692`, at the same indentation:

```javascript
        // Hand layout checkbox
        const fanLayoutCheckbox = document.getElementById('fan-layout-checkbox');
        if (fanLayoutCheckbox) {
            fanLayoutCheckbox.addEventListener('change', (e) => {
                this.setHandLayout(e.target.checked);
            });
        }
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `node tests/hand-fan.mjs`
Expected: `HAND FAN PASSED ✅ (16 checks: …)`

- [ ] **Step 9: Commit**

```bash
git add index.html script.js tests/hand-fan.mjs
git commit -m "feat(hand): menu toggle for the fanned layout

A checkbox beside Turbo, persisted under its own localStorage key rather
than inside SESSION_KEY — clearWhistSession() forgets a session, but which
layout you like should outlive that. Straight rows stay the default.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Prove the gestures still work fanned

**Files:**
- Modify: `tests/card-selection.mjs:33-42` (setup) and its tail

**Interfaces:**
- Consumes: `setHandLayout(true)` (Task 3).
- Produces: nothing. This task only widens existing coverage.

The 17 existing checks are the contract for two-stage selection. Rotating the cards changes hit-testing, so all 17 must pass with the fan on too.

- [ ] **Step 1: Parameterise the existing run**

In `tests/card-selection.mjs`, find the results helper at line 45:

```javascript
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ok  ' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
```

Replace with:

```javascript
const results = [];
// Every case runs twice: once on the straight rows, once fanned. Rotating a
// card changes what elementFromPoint returns, so the fan has to satisfy the
// same selection contract rather than being assumed safe.
let layoutLabel = 'rows';
const check = (name, pass, detail = '') => {
  const tagged = `[${layoutLabel}] ${name}`;
  results.push({ name: tagged, pass, detail });
  console.log(`${pass ? '  ok  ' : '  FAIL'}  ${tagged}${detail ? '  — ' + detail : ''}`);
};
```

- [ ] **Step 2: Run to confirm nothing broke**

Run: `node tests/card-selection.mjs`
Expected: PASS, 17 checks, each now prefixed `[rows]`.

- [ ] **Step 3: Wrap the cases in a loop**

The file currently runs its cases top-to-bottom from the comment `/* ── 1. one tap arms and plays nothing ─ */` down to the `check('centre suit is not drawn…')` line. Wrap exactly that span in:

```javascript
for (const layout of ['rows', 'fan']) {
  layoutLabel = layout;
  await page.evaluate((l) => window.game.setHandLayout(l === 'fan'), layout);
  await setUp();

  /* ...every existing case, unchanged, indented one level... */
}
await page.evaluate(() => window.game.setHandLayout(false));
```

Do not edit the bodies of the cases. Only indent them and let the loop drive `layoutLabel`.

- [ ] **Step 4: Run to verify both layouts pass**

Run: `node tests/card-selection.mjs`
Expected: 34 checks, each appearing once as `[rows]` and once as `[fan]`, all green.

If a `[fan]` case fails on a mis-hit, the tap point is the cause: `cardPoint(i)` aims at `box.x + 8`, and a rotated card's bounding box corner is not on the card. Change `cardPoint` to aim at the centre, which is inside the card at any tilt:

```javascript
async function cardPoint(i) {
  const box = await (await page.$$('#south-cards .card'))[i].boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
```

- [ ] **Step 5: Update the summary line**

At the end of the file, change:

```javascript
console.log(`CARD SELECTION PASSED ✅ (${results.length} checks: hover, scrub, arm/commit, drag, cancel, follow-suit, flight)`);
```

to:

```javascript
console.log(`CARD SELECTION PASSED ✅ (${results.length} checks × rows and fanned: hover, scrub, arm/commit, drag, cancel, follow-suit, flight)`);
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add tests/card-selection.mjs
git commit -m "test(hand): run the selection contract fanned as well

Rotating a card changes what elementFromPoint returns, so the fan has to
satisfy the same 17 checks rather than being assumed safe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: See it on the phone

**Files:** none — verification only.

- [ ] **Step 1: Build and install**

```bash
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'id=B770B63C-A069-5CFF-9882-C6AEF9A8710D' \
  -derivedDataPath /tmp/whist-dd -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=MWPU2838FB build
xcrun devicectl device install app --device B770B63C-A069-5CFF-9882-C6AEF9A8710D \
  /tmp/whist-dd/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device process launch --device B770B63C-A069-5CFF-9882-C6AEF9A8710D \
  com.guymerin.israeliwhist
```

The phone must be unlocked for the launch step, or it fails with `BSErrorCodeDescription = Locked`.

- [ ] **Step 2: Check it by hand**

With ☰ → 🃏 Fanned hand on:

- portrait: two gently bowed rows, no card covering another, every rank readable
- rotate to landscape: one sweep of 13, still no overlap
- press a card: it straightens and lifts
- drag it to the felt: it stays upright in flight and plays
- turn the setting off: the rows return exactly as before
- force-quit and reopen: the setting is remembered

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| Two arced rows in portrait | 2 (`--fan-tilt: 6deg`) |
| Single arc in landscape | 2 (`--fan-tilt: 11deg`) |
| No overlap in either arrangement | 2 (geometry checks) |
| Flat DOM preserved | 1 (transforms only; no wrappers) |
| Transform in CSS, not inline | 2 |
| Interaction states restored explicitly | 2 (armed + hover overrides) |
| One stamped number, no resize listener | 1 |
| Swing paid out of card width | 2 (`--cw` caps) |
| Setting in the menu, own storage key | 3 |
| Gesture contract holds fanned | 4 |
| No change when the setting is off | 2 (all rules scoped to `body.hand-fanned`), 4 (`[rows]` run) |

**Placeholder scan:** none — every step carries the actual code or command.

**Type consistency:** `stampFanPositions(container, split, total)`, `applyHandLayout()`, `setHandLayout(fanned)`, `HAND_LAYOUT_KEY`, `--fan-t`, `--fan-tilt`, `--fan-bow`, and `body.hand-fanned` are spelled identically in every task that names them.
