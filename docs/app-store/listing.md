# App Store listing — Whist

Copy‑paste fields for App Store Connect. App is single‑player vs. 3 AI bots, fully
offline, **collects no data**.

---

## App information

- **Name:** `Whist` — renamed from "Israeli Whist". Store names are unique, so App Store
  Connect may refuse it; no US app used the exact name as of 2026-09-16, but ~20 "Whist …"
  apps exist. Fallback: `Whist: Call Your Tricks`. The home-screen label
  (`CFBundleDisplayName`) is `Whist` either way. **The bundle id does not change** — a new id
  would be a new app with no ratings or installs.
- **Subtitle** (≤30 chars): `Trick-taking bidding card game`
- **Bundle ID:** `com.guymerin.israeliwhist`
- **Primary category:** Games → **Card**
- **Secondary category (optional):** Games → Board
- **Price:** Free (suggested)
- **Age rating:** 4+ (no objectionable content; card game, no gambling/real money)

## Promotional text (≤170 chars)
```
Call trump, then call your number. Take exactly that many tricks against three bots that never see your cards. No ads, no accounts, works offline.
```

## Keywords (≤100 chars, comma-separated, no spaces after commas)
```
trick taking,bidding,trump,predict,tricks,card game,strategy,offline,solo,classic
```
<!-- 80 chars; limit 100. No other games' names (2.3.7): "whist" is already in the name. -->


## Description (≤4000 chars)
```
Call trump, then call your number. Four players each predict exactly how many of the 13 tricks they'll take, and the predictions can never add up to 13. Every hand, somebody is going to miss. Make sure it isn't you.

HOW A HAND GOES
• Bid for trump. Name a number of tricks, from 5 to 13, and a suit, or pass. The highest bid picks trump.
• Predict. Starting with the trump winner, each player says how many tricks they'll take, in turn and in the open. The last player can't make the total 13.
• Play. Follow suit if you can. Take exactly your number and score (bid × bid) + 10. Every trick over or under costs 10. Sometimes the best card is the one that loses the trick.

THE BOTS
Botti, Droidi and Chati see only their own cards and what's been played, the same as you. Before every card, each one deals out dozens of ways the hidden cards could lie and plays whatever scores best across them. They will duck a trick they don't need, and they will set you when you overbid.

ON YOUR IPHONE, IPAD AND MAC
• Drag a card onto the table, or tap to lift it and tap again. Cards you can't play are dimmed.
• The table scales to fit an iPad screen or a Mac window.
• A hint when you want one, a look back at the last trick, and Turbo when you want the bots to hurry.
• Your scorecard is saved between sessions.

No ads, no accounts, no in-app purchases. Nothing leaves your device, and it plays offline.
```

## What's New (version 1.3)
```
Now called Whist, and now on iPad and Mac.

• Plays on Apple silicon Macs, and the table grows to fill a big window or an iPad screen.
• Fixed: tapping a prediction twice could freeze the hand on the last trick.
• The Hint now suggests the card the bots themselves would play, and never a prediction the rules forbid.
• Rules rewritten, including when you're allowed to trump and what happens when everyone misses.
• The game history scorecard is readable again.
```

<details>
<summary>What's New (version 1.2)</summary>

```
Your hand, easier to read and easier to hit.

• Thirteen cards now sit on two rows instead of one overlapping fan — and the rows break between suits, so a suit is never split across both.
• In landscape, the cards and the seat labels scale to your screen instead of staying phone-sized.
• The scoreboard is a ranking: sorted with the leader lit, your seat marked, and the swing from the hand just scored (+14 / −30) beside each total.
• When the last prediction lands, the table says plainly whether the hand is over or under 13 and what that means — and the status bar keeps the count for the rest of the hand.
• The name card stays above the keyboard instead of behind it, and no longer opens the keyboard before you ask for it.
• Tidier top bar: the trump, the bid count and the menu finally sit on one line.
```
</details>

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
First release. Play Whist against three world-class AI opponents — offline, no ads, no accounts.
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
| 1.2 | 4 | `eb06fc2` | 2026-08-24 | WAITING_FOR_REVIEW (submitted 2026-08-24) |

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

## iPad and Mac

**iPad** ships from the same build (`TARGETED_DEVICE_FAMILY = 1,2`); it needs 13″ iPad
screenshots (2064×2752 or 2048×2732) on the version page.

**Mac** ships as *iPad app on Apple silicon Mac* ("Designed for iPad") — the same arm64
binary, same bundle id, one universal purchase. Mac Catalyst is **not** an option today:
Capacitor's SPM package (`capacitor-swift-pm`) ships `Capacitor`/`Cordova` xcframeworks
with no Mac Catalyst slice, so a Catalyst build fails with *"While building for Mac
Catalyst, no library for this platform was found"*.

- App Store Connect → **Pricing and Availability → iPhone and iPad Apps on Apple Silicon
  Macs** → make available. Intel Macs can't run it.
- Local run: select the **My Mac (Designed for iPad)** destination in Xcode. Signing
  needs this Mac registered as a device on the team (Xcode offers to do it; from the CLI
  add `-allowProvisioningUpdates -allowProvisioningDeviceRegistration`; to run it, press ⌘R in Xcode — a Designed-for-iPad `.app` can't be opened directly). A compile-only check needs
  no signing:

  ```bash
  xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
    -destination 'platform=macOS,arch=arm64,variant=Designed for iPad' \
    CODE_SIGNING_ALLOWED=NO build
  ```
- Window layouts are covered by `theme-cardroom.css` §12 (compact score box below
  1440px, board scaled up by `fitBoardToWindow()` in large windows).

## Automated release (App Store Connect API)

After archiving and exporting (above), `scripts/asc-release.mjs` does the App Store
Connect side from this file and `screenshots/`:

```bash
export ASC_ISSUER_ID=<issuer uuid> ASC_KEY_ID=<key id>   # key at ~/.appstoreconnect/private_keys/
node scripts/asc-release.mjs plan      # offline check of text lengths, screenshot sizes, IPA
node scripts/asc-release.mjs status    # versions and build state
node scripts/asc-release.mjs upload    # altool validate + upload
node scripts/asc-release.mjs prepare   # version, text, name/subtitle, screenshots, waits for the build
node scripts/asc-release.mjs submit    # send to App Review
```

The What's New text comes from the `## What's New (version X)` heading matching
`MARKETING_VERSION`, so add that section before running `prepare`. If the name is refused,
`prepare` falls back to the one listed under App information.

## Then, in App Store Connect (things only you can do)

1. **+ Version** → enter the new version number.
2. Paste **What's New**, and re-upload screenshots if the UI changed.
3. Select the processed **build** (processing takes a few minutes after upload).
4. **Add for Review → Submit**.

App Information, Pricing and App Privacy (Data Not Collected) carry over from
the previous version and only need touching if something changed.
