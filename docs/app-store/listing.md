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

## What's New (version 1.2)
```
Your hand, easier to read and easier to hit.

• Thirteen cards now sit on two rows instead of one overlapping fan — and the rows break between suits, so a suit is never split across both.
• In landscape, the cards and the seat labels scale to your screen instead of staying phone-sized.
• The scoreboard is a ranking: sorted with the leader lit, your seat marked, and the swing from the hand just scored (+14 / −30) beside each total.
• When the last prediction lands, the table says plainly whether the hand is over or under 13 and what that means — and the status bar keeps the count for the rest of the hand.
• The name card stays above the keyboard instead of behind it, and no longer opens the keyboard before you ask for it.
• Tidier top bar: the trump, the bid count and the menu finally sit on one line.
```

<details>
<summary>What's New (version 1.1)</summary>

```
Bigger cards and a whole new way to play them.

• Cards are 30% larger, with the rank and suit in the corner like a real deck — readable even with 13 of them fanned across a phone.
• Play a card by dragging it onto the table, or tap to lift it and tap again. Nothing commits until you let go, so a mis-tap no longer costs you a trick.
• Cards you can't legally play are dimmed before you touch them.
• Played cards now flip onto the felt instead of appearing out of nowhere.
• The takes round shows every player's prediction at a glance, with a running "committed of 13" total.
• Bidding now happens on the table itself, and a single menu button frees up screen space.
• The Hint button is back on the table, and the trump winner's takes start at their minimum bid.
```
</details>

<details>
<summary>What's New (version 1.0)</summary>

```
First release. Play Israeli Whist against three world-class AI opponents — offline, no ads, no accounts.
```
</details>

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

## Release history

| Version | Build | Commit | Exported | Store state |
|---|---|---|---|---|
| 1.0 | 2 | `f67444b` | 2026-07-29 | READY_FOR_SALE |
| 1.1 | 3 | `8406043` | 2026-08-15 | approved — train closed to new builds |
| 1.2 | 4 | `eb06fc2` | 2026-08-24 | uploaded, awaiting build processing |

**Keep this table honest.** 1.1 was left here as PREPARE_FOR_SUBMISSION long
after it had actually been approved, and a build 4 was cut against `1.1` on the
strength of it. App Store Connect refused it, which is the only reason the
mistake surfaced:

```
90186  Invalid Pre-Release Train. The train version '1.1' is closed for new build submissions
90062  CFBundleShortVersionString [1.1] must be higher than the previously approved version [1.1]
```

An approved version's train is closed forever — the next upload always needs a
higher `MARKETING_VERSION`, never just a higher build. `--validate-app` catches
it in about thirty seconds and costs nothing, so run it before every upload.

The version string must match the version page in App Store Connect exactly —
a `1.1.0` build does not attach to a page created as `1.1`. Check with
`xcrun altool --list-apps --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>` before
archiving.

## Cutting a release

Version and build live in `ios/App/App.xcodeproj/project.pbxproj`
(`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`). Build number must increase
on every upload, even for the same version string.

```bash
npm test                                   # unit + parity + cards + strength
npm run test:smoke                         # one full gamlet in a browser
node scripts/make-store-screenshots.mjs    # only if the UI changed
npm run ios:sync                           # copy www/ into the iOS app

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/App.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=MWPU2838FB archive

xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportOptionsPlist build/ExportOptions.plist \
  -exportPath build/ios-export -allowProvisioningUpdates
```

The export step re-signs the archive for distribution, so it needs an **iOS
Distribution** certificate in the login keychain — the archive itself is happy
with the Development one. Check before you start:

```bash
security find-identity -v -p codesigning     # want an "Apple Distribution" line
```

If it isn't there, export fails with `No signing certificate "iOS Distribution"
found` / `No Accounts`: automatic signing can only mint one when an Apple
Developer account is signed in under Xcode → Settings → Accounts. Signing in and
re-running the same export command is the fix; there is no CLI substitute.

`ExportOptions.plist` uses `method: app-store-connect` and
`manageAppVersionAndBuildNumber: false` — with it set to `true` (the Xcode
default) Xcode silently bumps the build number at export time, which is how
1.0.0 shipped as build 2 while the project still said 1.

Upload the exported IPA with an App Store Connect API key (`.p8` in
`~/.appstoreconnect/private_keys/`):

```bash
xcrun altool --upload-app -f build/ios-export/App.ipa -t ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
```

…or open `build/App.xcarchive` in Xcode Organizer → **Distribute App**.

## Then, in App Store Connect (things only you can do)

1. **+ Version** → enter the new version number.
2. Paste **What's New**, and re-upload screenshots if the UI changed.
3. Select the processed **build** (processing takes a few minutes after upload).
4. **Add for Review → Submit**.

App Information, Pricing and App Privacy (Data Not Collected) carry over from
the previous version and only need touching if something changed.
