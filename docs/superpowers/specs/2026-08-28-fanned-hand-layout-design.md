# Fanned hand layout — design

**Date:** 2026-08-28
**Status:** approved, not yet planned
**Exploration:** https://claude.ai/code/artifact/35dc8a97-58a1-456a-aa24-cee3a0e3455e

## Goal

Offer a second hand layout that reads like a hand someone is *holding* rather
than a row of tiles. The current straight rows stay the default; the fan is
opt-in from the menu.

## What we're building

One visual language, two arrangements — chosen by orientation, not by the user:

| Orientation | Arrangement | Overlap |
| --- | --- | --- |
| Portrait | The existing two rows, each bowed on a shallow arc, ±6° tilt | None |
| Landscape | The existing single row, bowed harder, ±11° tilt | None |

Both arrangements keep **every card fully tappable**, because no card ever
covers another. The straight lines go away; the tap targets do not.

### Why not a single arc in portrait

Measured at 420×912 with the real card geometry, a single 13-card portrait arc
leaves a **22–24px** strip of each card exposed. That is the same ~22px that
`layoutHumanHand()`'s own comment blames for players grabbing the wrong card,
and the reason the hand was split onto two rows in the first place. A portrait
fan that overlaps would re-open a bug we already paid to close.

Landscape has no such problem: 13 cards fan across 844px with a 56px step,
wider than the ~45px fingertip. In landscape the fan is free.

## Constraints this design respects

All four were verified against the code, not assumed:

1. **Flat DOM.** Every gesture identifies a card by
   `parentElement.id === 'south-cards'` (`script.js:2253`, and the comment at
   `script.js:3280`). The arc must come from transforms on the cards
   themselves — never nested row wrappers.
2. **Top-left corner index.** Rank and suit print only in the top-left corner,
   so any overlap must expose each card's *left* edge. Moot here, since
   neither arrangement overlaps, but it rules out a right-over-left fan.
3. **Rotation costs width.** Rotating about a pivot below the card swings the
   end cards sideways as well as tilting them. That swing has to be paid for
   out of the row's width, which costs ~3px of card width in portrait
   (53px → 50px). Still clear of the 45px fingertip.
4. **iOS Safari.** No new APIs. Trig stays in JS; CSS only multiplies and adds.

## Design

### The transform must live in CSS, not inline

This is the load-bearing decision. The gesture code writes
`el.style.transform` directly while dragging and clears it with
`el.style.removeProperty('transform')` on release (`script.js:2240`, `2257`,
`2272`). If the fan's base transform were also inline, the drag would
overwrite it and `removeProperty` would erase both, dropping the card flat.

So: **JS stamps custom properties; a CSS rule composes them into a transform.**
The drag's inline transform then temporarily wins, and `removeProperty`
restores the fan automatically with no extra bookkeeping.

The codebase already does exactly this for played cards —
`.played-card .card { transform: rotate(var(--card-rotation, 0deg)) }`
(`styles.css:1193`), fed by per-seat values at `styles.css:1609-1630`. We
follow that precedent.

### What JS computes

`layoutHumanHand()` already knows the row split. It gains a pass that stamps
exactly **one** custom property per card — where that card sits within its own
row:

```
--fan-t : (i - mid) / mid        // −1 at the left end, 0 at centre, +1 at the right
```

That is the whole JS contribution. It is a pure function of the card's index
and its row's length, and carries no units, no angle, and no pixel offset — so
it is identical in portrait and landscape.

Everything with a magnitude stays in CSS, where the breakpoints already live.
This is what lets us claim **no resize or orientation listener is needed**: the
only viewport-dependent quantities are `--cw` and the two fan magnitudes, and
CSS recomputes all three on its own.

### What CSS does

CSS derives both the tilt and the parabolic lift from that single number:

```css
.hand-fanned #south-cards.human-cards .card {
    --t: var(--fan-t, 0);
    transform: translateY(calc((1 - var(--t) * var(--t)) * var(--fan-bow)))
               rotate(calc(var(--t) * var(--fan-tilt)));
    transform-origin: 50% 160%;   /* pivot below the card */
}
```

`1 - t²` is the arc: it peaks at the row's centre and falls to zero at both
ends. `--fan-bow` (a negative length) and `--fan-tilt` (an angle) are the only
two knobs, set once per breakpoint:

| | `--fan-tilt` | `--fan-bow` |
| --- | --- | --- |
| Portrait, two rows | `6deg` | `-9px` |
| Landscape, one row | `11deg` | `-16px` |

The two arrangements are therefore two values of the same pair of knobs, not
two mechanisms. Multiplying two unitless `var()`s, and a unitless `var()` by a
length or an angle, are both ordinary `calc()` — no trig, nothing new for iOS
Safari.

The swing cost is paid by lowering the card-width cap in the fanned portrait
block only, so the unfanned layout is bit-for-bit unchanged.

### Interaction states must be restored explicitly

An earlier draft of this spec claimed these compose for free. Tested in a
browser, they do not, and the reason is worth writing down.

The landscape block at `styles.css:3350` sets `transform: none !important` on
`.human-cards .card`. To survive that, the fan rule needs `!important` *and*
an ID in its selector — which then also makes it outrank
`.human-cards .card.card-armed` (`styles.css:1254`), whose lift carries no
`!important`. Left alone, turning the fan on would silently kill the
two-stage card lift: the armed card would tilt but never rise.

So each interaction state is restored deliberately, at higher specificity:

- **Armed** — re-declare `translateY(-24px) scale(1.16)` with `!important`
  inside the fanned scope. It carries no rotation, so a lifted card
  straightens, which is what pulling a card out of a real hand looks like.
- **Hover** (desktop only, `@media (hover: hover)`) — same treatment, so
  hover and press behave alike.
- **Drag** — needs nothing. The drag path writes its transform inline *with*
  `!important` (`script.js:2240`), and an important inline style outranks any
  important stylesheet rule; `removeProperty('transform')` then drops back to
  the fan rule. Verified, not assumed.

The lesson generalises: this stylesheet uses `!important` widely, so any new
rule that sets `transform` on a hand card has to be checked against the
`.card-armed`, `:hover`, and landscape rules rather than reasoned about.

Follow-suit dimming (`.card-illegal`) touches opacity only, so it is unaffected.

`captureFlightOrigin()` reads `getBoundingClientRect()`, which already accounts
for the transform, so the played-card flight animation needs no changes.

### The setting

A checkbox in `#game-menu`, beside Turbo, following the
`.fast-mode-container` markup pattern (`index.html:82-87`). It toggles a
`hand-fanned` class on `<body>`.

Persisted under its own localStorage key, `israeliWhist_handLayout`
(default `"rows"`) — matching the standalone `israeliWhist_playerName`
precedent, and deliberately *not* inside `SESSION_KEY`, which
`clearWhistSession()` wipes. A layout preference should outlive a session
reset.

## Testing

Extend `tests/card-selection.mjs`, which already covers the gestures, to run
its existing assertions a second time with the fan enabled. Every current
check must still pass: arm, commit, scrub, drag, cancel, follow-suit dimming,
flight.

Add layout assertions, in both orientations and at 13 / 9 / 5 cards:

- no card's rendered box escapes the hand container's bounds
- every card's exposed strip is ≥ 45px (i.e. the fan never overlaps)
- with the setting off, the computed layout is identical to today's

## Out of scope

- Any overlapping / deep-fan variant. Measured and rejected above.
- Changing the bots' or the played cards' presentation.
- Re-tuning the corner index, which was just sized in `971af41`.

## Open assumption

The tilt values (±6° portrait, ±11° landscape) are taken from the approved
exploration. They are single constants per breakpoint and cheap to retune once
it's on a device.
