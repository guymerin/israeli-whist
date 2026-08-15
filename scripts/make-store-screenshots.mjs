// Regenerate the App Store screenshot sets in docs/app-store/screenshots/.
//
//   node scripts/make-store-screenshots.mjs            # all profiles
//   node scripts/make-store-screenshots.mjs 6.9 ipad   # just these
//
// Drives the real game in headless Chromium at each device's CSS size and
// device pixel ratio, so the output is exactly what App Store Connect expects:
//
//   6.9"  iPhone 16 Pro Max     430 x 932  @3  ->  1290 x 2796
//   6.5"  iPhone 11 Pro Max     428 x 926  @3  ->  1284 x 2778
//   iPad  12.9" landscape      1366 x 1024 @2  ->  2732 x 2048
//
// Three shots per profile, one per phase of the game: the trump-bidding tray,
// the takes predictions, and a trick mid-play. Nothing is composited or
// annotated — these are straight captures of the running app.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ensureServer } from '../tests/static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'app-store', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROFILES = {
    '6.9':  { dir: '6.9',  width: 430,  height: 932,  scale: 3 },
    '6.5':  { dir: '6.5',  width: 428,  height: 926,  scale: 3 },
    'ipad': { dir: 'ipad', width: 1366, height: 1024, scale: 2 },
};

const wanted = process.argv.slice(2).filter(a => PROFILES[a]);
const profiles = (wanted.length ? wanted : Object.keys(PROFILES)).map(k => PROFILES[k]);

const served = await ensureServer();
const browser = await chromium.launch();

for (const p of profiles) {
    const dir = path.join(OUT, p.dir);
    await mkdir(dir, { recursive: true });
    const page = await browser.newPage({
        viewport: { width: p.width, height: p.height },
        deviceScaleFactor: p.scale,
        isMobile: true,
        hasTouch: true,
    });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));

    const visible = sel => page.evaluate(s => {
        const el = document.querySelector(s);
        if (!el) return false;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;      // NB: not offsetParent — the trays are position:fixed
    }, sel);

    const shot = async (name) => {
        // Park the virtual cursor off-canvas: it otherwise sits wherever the
        // last click landed and leaves a :hover ring on whatever is under it.
        await page.mouse.move(1, 1);
        // Transient overlays: the "Fast Mode Enabled!" toast and the floating
        // "Pass / 3 ♥" bid badges, both of which land over the table.
        await page.evaluate(() => document
            .querySelectorAll('.game-notification, .bid-animation')
            .forEach(n => n.remove()));
        await sleep(120);
        await page.screenshot({ path: path.join(dir, name) });
        console.log(`  ${p.dir}/${name}  ${p.width * p.scale}x${p.height * p.scale}`);
    };

    await page.goto(served.url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.game, null, { timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.fill('#player-name-input', 'Guy');
    await page.click('#start-game-btn');
    await sleep(300);
    await page.evaluate(() => { const m = document.getElementById('rules-modal'); if (m) m.style.display = 'none'; });
    // Turbo: cuts the bot delays 10x so a capture run takes seconds, not minutes.
    await page.evaluate(() => {
        const cb = document.getElementById('fast-mode-checkbox');
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.click('#deal-btn').catch(() => {});

    // ── 01 — the trump-bidding tray, on the felt ──────────────────────────
    let t = Date.now();
    while (Date.now() - t < 30000) { if (await visible('#bidding-interface')) break; await sleep(120); }
    await page.evaluate(() => {
        document.querySelector('.trick-button[data-value="6"]')?.click();
        document.querySelector('.suit-button[data-value="hearts"]')?.click();
    });
    await sleep(400);
    await shot('01-bidding.png');

    // ── 02 — the takes phase, with the four predictions on the felt ───────
    // Pass rather than bid, so a bot wins the trump and bids takes first: by
    // the time it's south's turn the prediction list has real numbers in it
    // instead of four dashes.
    await page.click('#pass-btn').catch(() => {});
    t = Date.now();
    while (Date.now() - t < 40000) {
        if (await visible('#your-prediction-controls')) break;
        if (await visible('#pass-btn')) await page.click('#pass-btn').catch(() => {});
        await sleep(150);
    }
    await sleep(400);
    await shot('02-takes.png');

    // Submit south's takes prediction. Retried until the bid actually lands:
    // one pass used to be enough, but if every candidate it tries happens to be
    // the value the over/under rule forbids, the bid silently never registers
    // and the run then sits in phase 2 until the play-shot window expires.
    t = Date.now();
    while (Date.now() - t < 20000) {
        const placed = await page.evaluate(() => {
            if (window.game.phase2Bids.south != null) return true;
            const btns = [...document.querySelectorAll('#your-prediction-controls .trick-btn')]
                .filter(b => getComputedStyle(b).display !== 'none' && !b.disabled);
            for (const pref of ['4', '3', '5', '2', '6']) {
                const b = btns.find(x => x.dataset.value === pref);
                if (b) { b.click(); if (window.game.phase2Bids.south != null) return true; }
            }
            for (const b of btns) { b.click(); if (window.game.phase2Bids.south != null) return true; }
            const predict = document.getElementById('predict-btn');
            if (predict && getComputedStyle(predict).display !== 'none') predict.click();
            return window.game.phase2Bids.south != null;
        });
        if (placed) break;
        await sleep(200);
    }
    if (await page.evaluate(() => window.game.phase2Bids.south == null)) {
        console.log(`  !! ${p.dir}: takes prediction never registered`);
    }

    // ── 03 — a complete trick on the felt, all four cards down ────────────
    // Capturing mid-trick with the human to play means a suit has been led, so
    // every card that can't follow it is dimmed — five of eight cards greyed
    // out reads as "half my hand is disabled" to someone browsing the store.
    // The moment after the fourth card lands has no such state: playing a card
    // re-renders the hand fresh, and the trick is full so nothing is
    // selectable. All four cards are on the table and every card is bright.
    //
    // completeTrick() clears the table one second later, which is a tight
    // window to hit with a polling loop, so hold it until the shot is taken.
    // Trick 2, not 3: the seat plates already carry real bid/takes numbers from
    // trick 1 and the hand still looks full, and the shorter runway is what
    // keeps the iPad profile inside the capture window instead of timing out.
    const TARGET_TRICK = 2;
    let shot03 = false;
    // Hold is armed only once the target trick is reached — arming it up front
    // freezes the very first trick and the game never gets there.
    await page.evaluate(() => {
        const g = window.game;
        g.__holdTrick = false;
        const original = g.completeTrick.bind(g);
        g.completeTrick = function () {
            if (g.__holdTrick) { setTimeout(() => g.completeTrick(), 200); return; }
            return original();
        };
    });
    t = Date.now();
    while (Date.now() - t < 120000 && !shot03) {
        const state = await page.evaluate(() => ({
            trick: (window.game.botMemory?.cardsPlayed?.south || []).length + 1,
            inTrick: window.game.currentTrick.length,
            southTurn: document.getElementById('south-cards')?.classList.contains('player-turn'),
            phase: window.game.currentPhase,
        }));
        if (state.phase !== 'phase3') { await sleep(150); continue; }

        if (state.trick >= TARGET_TRICK) {
            await page.evaluate(() => { window.game.__holdTrick = true; });
        }
        if (state.inTrick === 4 && state.trick >= TARGET_TRICK) {
            await sleep(700);                       // let the last card finish its flip
            await shot('03-play.png');
            shot03 = true;
            await page.evaluate(() => { window.game.__holdTrick = false; });
            continue;
        }
        if (state.southTurn) {
            // Play through the game API rather than synthetic taps. Selection
            // is two-stage and the first tap LIFTS the card, which moves it —
            // so on a phone, where the hand overlaps down to ~25px slivers, the
            // second tap at the same coordinates lands on a different card and
            // nothing ever commits. These are captures of game state, not of
            // the interaction, so driving the model directly is both correct
            // and deterministic. (tests/card-selection.mjs covers the gesture.)
            await page.evaluate(() => {
                const g = window.game;
                const i = g.hands.south.findIndex(c => g.isValidCardPlay('south', c));
                if (i >= 0) g.playCard('south', i);
            });
            await sleep(120);
        }
        await sleep(120);
    }
    await page.evaluate(() => { window.game.__holdTrick = false; }).catch(() => {});
    // Intermittent: the gamlet occasionally ends (phase back to 'dealing')
    // before the loop gets its full trick, and the window then expires. Re-run
    // the profile — `node scripts/make-store-screenshots.mjs 6.5` — rather than
    // shipping a stale shot. Never silently keeps the previous file.
    if (!shot03) console.log(`  !! ${p.dir}: no play shot captured — re-run this profile`);
    if (errs.length) console.log(`  !! ${p.dir} page errors: ${errs.join(' | ')}`);
    await page.close();
}

await browser.close();
await served.close();
console.log('done');
