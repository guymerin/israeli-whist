# App Store listing — Israeli Whist

Copy‑paste fields for App Store Connect. App is single‑player vs. 3 AI bots, fully
offline, **collects no data**.

---

## App information

- **Name:** `Israeli Whist`
- **Subtitle** (≤30 chars): `Trick-taking bidding card game`
- **Bundle ID:** `com.guymerin.israeliwhist`
- **Primary category:** Games → **Card**
- **Secondary category (optional):** Games → Board
- **Price:** Free (suggested)
- **Age rating:** 4+ (no objectionable content; card game, no gambling/real money)

## Promotional text (≤170 chars)
```
Outbid and outplay three world-class AI opponents in the classic Israeli Whist. Predict your tricks exactly to win. No ads, no accounts, fully offline.
```

## Keywords (≤100 chars, comma-separated, no spaces after commas)
```
whist,israeli whist,card game,trick taking,bidding,cards,strategy,offline,bridge,spades,oh hell
```
<!-- 95 chars; App Store limit is 100. -->


## Description (≤4000 chars)
```
Israeli Whist is a sharp, addictive trick-taking card game — bid the exact number of tricks you can win, then fight to hit your number against three world-class AI opponents.

It plays in two bids and a battle:

• Phase 1 — Trump bidding. Bid a minimum number of tricks and a trump suit, or pass. The highest bidder sets the trump for the hand.
• Phase 2 — Takes. Every player privately predicts how many tricks they'll win. The four predictions can never total exactly 13 — someone will be over, someone under.
• Phase 3 — Play. Win tricks. Match your bid EXACTLY to score big; every trick over or under costs you. Sometimes the smartest move is to lose a trick on purpose.

WORLD-CLASS OPPONENTS
The three bots — Botti, Droidi, and Chati — don't cheat and don't play dumb. They run a Determinized Monte Carlo engine (the same technique behind top computer card players), sampling thousands of possible hands to make genuinely tough, human-like decisions. Beating them feels earned.

BUILT FOR QUICK, SATISFYING PLAY
• Clean "card room" table designed for phones — portrait or landscape.
• A hint button when you want strategic advice, and a "last trick" review.
• Turbo mode to speed through the bots' turns.
• Your session and running scorecard are saved automatically.

RESPECTS YOU
• No ads. No accounts. No in-app purchases.
• No data collection and no tracking — everything stays on your device.
• Fully offline. Play on a plane, a subway, anywhere.

Whether you grew up playing Israeli Whist (Ashkelon Whist / "Oh Hell"-style bidding) or you're a Spades/Bridge player looking for your next obsession, this is a fast, brainy hand you'll keep coming back to.
```

## What's New (version 1.0.0)
```
First release. Play Israeli Whist against three world-class AI opponents — offline, no ads, no accounts.
```

## URLs
- **Support URL:** `https://guymerin.github.io/israeli-whist/support.html`
- **Privacy Policy URL:** `https://guymerin.github.io/israeli-whist/privacy.html`
- **Marketing URL (optional):** `https://guymerin.github.io/israeli-whist/` (the playable web version)
- **Copyright:** `© 2026 Guy Merin`

## App Privacy (nutrition label)
Answer in App Store Connect → App Privacy:
- **Data collection:** **"Data Not Collected."** (The app makes no network calls beyond loading itself and stores only local game state.)
- No tracking. Matches the bundled `PrivacyInfo.xcprivacy`.

## Screenshots
Provided at `docs/app-store/screenshots/`, three sets, one shot per phase of the game:

| Folder | Size | Slot |
|---|---|---|
| `6.9/` | 1290×2796 | 6.9″ iPhone (also accepted for 6.7″) |
| `6.5/` | 1284×2778 | 6.5″ iPhone |
| `ipad/` | 2732×2048 | 12.9″ iPad, landscape |

1. `01-bidding.png` — trump bidding ("Your turn — pick trump & tricks").
2. `02-takes.png` — the takes round, with the other seats' predictions in and the
   value that would total 13 greyed out.
3. `03-play.png` — a trick in play on the felt.

Regenerate them all with `node scripts/make-store-screenshots.mjs` (or pass
profile names, e.g. `… 6.9 ipad`). It drives the real game headless at each
device's CSS size and pixel ratio — nothing is composited or annotated. Max 10
per size if you want to add more.

---

## Submission checklist (things only you can do)

1. **Xcode → App target → Signing & Capabilities:** set **Team = Guy Merin (MWPU2838FB)**. (Bundle id, version 1.0.0, build 1, and `ITSAppUsesNonExemptEncryption=false` are already set.)
2. **App Store Connect → My Apps → +** → create the app record with the bundle id `com.guymerin.israeliwhist` and the name above.
3. Fill **App Information** (categories), **Pricing**, **App Privacy** (Data Not Collected), and the **1.0.0** version page (description, keywords, promo text, screenshots, support URL).
4. **Xcode → Product → Archive** → **Distribute App → App Store Connect → Upload**.
5. In App Store Connect, select the uploaded **build** on the 1.0.0 page, answer the age‑rating questionnaire (all "No"), then **Add for Review → Submit**.

To push a future web change into the app before archiving: `npm run ios:sync`, then re‑archive.
