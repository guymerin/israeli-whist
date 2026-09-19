# Featuring nomination — Whist: Bid & Take

Copy‑paste text for **App Store Connect → Apps → Whist: Bid & Take → sidebar
*Featuring* → Nominations → “+” → Create Nomination**. The old
developer.apple.com “Promote Your App” form is gone; nominations live in App
Store Connect now. Needs the Account Holder, Admin, App Manager or Marketing
role — you're the Account Holder.

Apple asks for **three weeks' minimum lead time** and recommends up to three
months for wider consideration. Nominations save as drafts, so all of this can
go in and be edited before you hit Submit Nomination.

Every claim below is checked against the shipping app. Don't add "supports
VoiceOver" or "supports Dynamic Type" — neither is verified, and an editor who
opens the app and finds otherwise is the worst outcome this form can produce.

---

## 1. Nomination name

```
Whist 1.4 — one game across iPhone, iPad and Mac
```

## 2. Type

**App Enhancements.** Not App Launch — the app has been on the Store since
July 2026. The enhancement being nominated is the arc that finishes in 1.4:
the game became a real iPad and Mac game in 1.3, and 1.4 is the release where
the table finally behaves at every size.

## 3. Description

```
Whist: Bid & Take is Israeli Whist — a trick-taking game where the skill isn't taking tricks, it's predicting exactly how many you'll take. Four players each call a number, and the four numbers can never add up to thirteen. Somebody is always going to miss. Hit your number exactly and you score (bid × bid) + 10; every trick over or under costs you.

What changed across 1.3 and 1.4 is where it can be played. One binary now runs on iPhone, iPad and Apple silicon Macs, and the table is laid out for each rather than stretched to fit: the felt scales to a Mac window, the hand fans to thirteen readable cards on a phone, and in 1.4 the takes panel sits above your hand instead of over it, shrinking to whatever room the window leaves.

The three opponents are the other half of the pitch. Most mobile card games win by looking at your hand. These don't: each bot sees only its own cards and the cards already played — exactly what you see — and before every card it deals out dozens of ways the unseen cards could lie, plays each one out, and picks whatever scores best across all of them. They duck tricks they don't need and they set you when you overbid. The Hint button runs the same engine on your hand and tells you the card it would play, and why.

It's free, by one developer, with no ads, no in-app purchases, no accounts and no tracking. It collects no data at all and plays entirely offline — on a plane, on the Underground, anywhere.
```

*(~1,480 characters. If the field is shorter, cut the third paragraph to its
first sentence and the fourth paragraph stands on its own.)*

## 4. Publication date or time frame

Use a **custom range**, not a single day — 1.4 ships as soon as review clears,
so nothing is gated on a date, and a range gives the editorial team room:

```
2026-10-13  to  2026-10-24
```

That's over three weeks out, past Apple's stated minimum. Don't pick the 1.4
release date itself; it will already have passed by the time a nomination can
be considered.

## 5. Additional information

- **Related apps:** leave Whist alone here. The other three apps
  (SongCatcher, Mycelia, BeanThere) are unrelated in category and audience, and
  bundling them dilutes a nomination rather than multiplying it. Nominate them
  separately, on their own merits.
- **Platforms:** iOS, iPadOS, **and macOS** — the Mac box is the point of this
  nomination and is easy to miss. The app ships to Macs as an iPad app on Apple
  silicon.
- **Countries or regions:** all 175 (auto-filled from availability — leave it).
- **Localizations:** English (auto-filled — leave it).
- **In-App Events:** none.

## 6. Supplemental materials (up to 5 URLs)

```
https://guymerin.github.io/israeli-whist/
https://apps.apple.com/app/id6795713309
https://guymerin.github.io/israeli-whist/privacy.html
```

The first one is the strongest asset in the whole nomination: the same game,
playable in a browser, no install and no TestFlight invite. An editor can try
it in fifteen seconds. Lead with it.

## 7. Helpful details

```
Made by one developer. The game is the Israeli variant of whist — a household game across Israel, and largely unknown elsewhere — and this is the whole game, including the rule most implementations leave out: the four predictions can never total thirteen, so the last player to call is forbidden the number that would make it so.

Accessibility and respect for the player, both verifiable in the shipping app:
• Reduce Motion is honoured — every animation, including the card flights and the win fireworks, is disabled when the system setting is on.
• Nothing is conveyed by colour alone: every card carries its rank and its suit symbol, and cards that can't legally be played are dimmed as well as unresponsive.
• The four dialogs (rules, hint, last trick, name entry) are labelled dialogs with keyboard handling and Escape to dismiss; turn and bid changes are announced through a live region.
• No account, no sign-in, no network access at all. The App Privacy label is "Data Not Collected", and that is literal — the app makes no network calls whatsoever after it loads.

Priority: standard. Nothing here is time-sensitive; the app is finished and stable, and any window that suits the team suits us.
```

---

## What not to say

- **Don't name the technology stack.** The app is a web view in a Capacitor
  shell. That's not a lie you need to tell or a truth you need to volunteer —
  the form doesn't ask, and editors care about the experience.
- **Don't claim VoiceOver or Dynamic Type support.** Unverified. If you want
  them as a claim, they need an audit and probably work first — worth doing
  before a second nomination, not worth risking in this one.
- **Don't inflate the numbers.** The app has 2 ratings and a small install
  base. The form never asks, and the editorial team can see it anyway.

## After you submit

Nominations appear under **Submitted** on the Featuring Nominations dashboard
and stay editable. There is no response unless you're selected, and most
nominations aren't — this costs twenty minutes and the downside is zero, which
is the whole argument for doing it.
