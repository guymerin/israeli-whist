// Ship a version to the App Store from the repo, end to end.
//
//   node scripts/asc-release.mjs plan      # offline: what would be sent (no credentials)
//   node scripts/asc-release.mjs status    # the app's versions, builds and review state
//   node scripts/asc-release.mjs upload    # validate, then upload build/ios-export/App.ipa
//   node scripts/asc-release.mjs prepare   # version page: text, name, screenshots, build
//   node scripts/asc-release.mjs submit    # send the prepared version to App Review
//
// Credentials (never printed): ASC_ISSUER_ID and ASC_KEY_ID in the environment,
// with the key at ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8.
//
// Single source of truth is the repo. The version and build come from
// project.pbxproj; the promotional text, keywords, description, What's New,
// name and subtitle come from docs/app-store/listing.md; the screenshots come
// from docs/app-store/screenshots/. Build the IPA first (listing.md, "Cutting a
// release"). Each step is safe to re-run: it finds what already exists.
//
// Not covered, because the API doesn't expose it: the "iPhone and iPad Apps on
// Apple Silicon Macs" switch in Pricing and Availability.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_ID = 'com.guymerin.israeliwhist';
const LOCALE = 'en-US';
const IPA = path.join(ROOT, 'build', 'ios-export', 'App.ipa');
const API = 'https://api.appstoreconnect.apple.com/v1';

// Folder → App Store Connect display type (checked against pixel size below).
const SHOT_SETS = {
    '6.9':  { type: 'APP_IPHONE_67',          sizes: ['1290x2796', '2796x1290'] },
    '6.5':  { type: 'APP_IPHONE_65',          sizes: ['1284x2778', '2778x1284', '1242x2688', '2688x1242'] },
    'ipad': { type: 'APP_IPAD_PRO_3GEN_129',  sizes: ['2048x2732', '2732x2048'] },
};

const log = (...a) => console.log(...a);
const fail = msg => { console.error(`\n✗ ${msg}`); process.exit(1); };

// ── What the repo says ───────────────────────────────────────────────────
function projectVersion() {
    const pbx = readFileSync(path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
    const versions = new Set([...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(m => m[1]));
    const builds = new Set([...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(m => m[1]));
    if (versions.size !== 1 || builds.size !== 1) fail('Debug and Release disagree on MARKETING_VERSION/CURRENT_PROJECT_VERSION');
    return { version: [...versions][0], build: [...builds][0] };
}

function listing(version) {
    const md = readFileSync(path.join(ROOT, 'docs/app-store/listing.md'), 'utf8');
    const block = heading => {
        const i = md.indexOf(heading);
        if (i < 0) fail(`listing.md has no "${heading}" section`);
        const open = md.indexOf('```', i), close = md.indexOf('```', open + 3);
        return md.slice(md.indexOf('\n', open) + 1, close).trim();
    };
    const field = label => (md.match(new RegExp(`\\*\\*${label}:?\\*\\*[^\\n]*?\`([^\`]+)\``)) || [])[1];
    const out = {
        name: field('Name'),
        fallbackName: (md.match(/Fallback: `([^`]+)`/) || [])[1],
        subtitle: field('Subtitle'),
        promotionalText: block('## Promotional text'),
        keywords: block('## Keywords'),
        description: block('## Description'),
        whatsNew: block(`## What's New (version ${version})`),
    };
    const limits = { name: 30, subtitle: 30, promotionalText: 170, keywords: 100, description: 4000, whatsNew: 4000 };
    for (const [k, max] of Object.entries(limits)) {
        if (!out[k]) fail(`listing.md: couldn't read ${k}`);
        if (out[k].length > max) fail(`listing.md: ${k} is ${out[k].length} chars, limit ${max}`);
    }
    return out;
}

function pngSize(file) {
    const b = readFileSync(file);
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

function screenshots() {
    const dir = path.join(ROOT, 'docs/app-store/screenshots');
    return Object.entries(SHOT_SETS).map(([folder, { type, sizes }]) => {
        const files = readdirSync(path.join(dir, folder)).filter(f => f.endsWith('.png')).sort()
            .map(f => path.join(dir, folder, f));
        if (!files.length || files.length > 10) fail(`screenshots/${folder}: need 1–10 PNGs, found ${files.length}`);
        for (const f of files) {
            if (!sizes.includes(pngSize(f))) fail(`${path.relative(ROOT, f)} is ${pngSize(f)}; ${type} takes ${sizes.join(' or ')}`);
        }
        return { folder, type, files };
    });
}

// ── App Store Connect API ────────────────────────────────────────────────
function credentials() {
    const issuer = process.env.ASC_ISSUER_ID, keyId = process.env.ASC_KEY_ID;
    if (!issuer || !keyId) fail('Set ASC_ISSUER_ID and ASC_KEY_ID (App Store Connect → Users and Access → Integrations).');
    const keyPath = path.join(homedir(), '.appstoreconnect/private_keys', `AuthKey_${keyId}.p8`);
    if (!existsSync(keyPath)) fail(`No key file for ASC_KEY_ID ${keyId}`);
    return { issuer, keyId, keyPath };
}

let _token, _tokenAt = 0;
function token() {
    const now = Math.floor(Date.now() / 1000);
    if (_token && now - _tokenAt < 15 * 60) return _token;
    const { issuer, keyId, keyPath } = credentials();
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const data = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({ iss: issuer, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' })}`;
    const sig = sign('sha256', Buffer.from(data), { key: createPrivateKey(readFileSync(keyPath)), dsaEncoding: 'ieee-p1363' });
    _tokenAt = now;
    return (_token = `${data}.${sig.toString('base64url')}`);
}

async function api(method, route, body) {
    const res = await fetch(route.startsWith('http') ? route : API + route, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error((json.errors || []).map(e => `${e.title}: ${e.detail}`).join(' | ') || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return json;
}
const rel = (type, id) => ({ data: { type, id } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findApp() {
    const { data } = await api('GET', `/apps?filter[bundleId]=${BUNDLE_ID}`);
    if (!data.length) fail(`No app with bundle id ${BUNDLE_ID} on this account`);
    return data[0];
}

async function versions(appId) {
    const { data } = await api('GET', `/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20`);
    return data;
}

async function findBuild(appId, version, build) {
    const { data } = await api('GET', `/builds?filter[app]=${appId}&filter[version]=${build}&filter[preReleaseVersion.version]=${version}&limit=1`);
    return data[0];
}

// ── Commands ─────────────────────────────────────────────────────────────
async function plan() {
    const { version, build } = projectVersion();
    const text = listing(version);
    log(`Version ${version} (build ${build}) of ${BUNDLE_ID}`);
    log(`IPA: ${existsSync(IPA) ? `${path.relative(ROOT, IPA)} (${(statSync(IPA).size / 1e6).toFixed(1)} MB)` : 'not built yet'}`);
    log(`Name: ${text.name}   (fallback: ${text.fallbackName || 'none'})   Subtitle: ${text.subtitle}`);
    for (const k of ['promotionalText', 'keywords', 'description', 'whatsNew']) log(`${k}: ${text[k].length} chars`);
    for (const s of screenshots()) log(`${s.type}: ${s.files.map(f => path.basename(f)).join(', ')}`);
}

async function status() {
    const { version, build } = projectVersion();
    const app = await findApp();
    log(`${app.attributes.name} (${app.attributes.bundleId})`);
    for (const v of await versions(app.id)) {
        log(`  ${v.attributes.versionString.padEnd(6)} ${v.attributes.appStoreState}`);
    }
    const b = await findBuild(app.id, version, build);
    log(`Build ${version} (${build}): ${b ? b.attributes.processingState : 'not uploaded'}`);
}

function upload() {
    const { issuer, keyId } = credentials();
    if (!existsSync(IPA)) fail(`No IPA at ${path.relative(ROOT, IPA)}; archive and export first`);
    for (const step of ['--validate-app', '--upload-app']) {
        log(`\n→ altool ${step}`);
        const r = spawnSync('xcrun', ['altool', step, '-f', IPA, '-t', 'ios', '--apiKey', keyId, '--apiIssuer', issuer],
            { stdio: 'inherit', env: { ...process.env, API_PRIVATE_KEYS_DIR: path.join(homedir(), '.appstoreconnect/private_keys') } });
        if (r.status !== 0) fail(`altool ${step} failed`);
    }
}

async function prepare() {
    const { version, build } = projectVersion();
    const text = listing(version);
    const shots = screenshots();
    const app = await findApp();

    // 1. The version page
    const all = await versions(app.id);
    let v = all.find(x => x.attributes.versionString === version);
    if (!v) {
        const open = all.find(x => ['PREPARE_FOR_SUBMISSION', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(x.attributes.appStoreState));
        if (open) fail(`Version ${open.attributes.versionString} is ${open.attributes.appStoreState}; release or remove it before creating ${version}`);
        v = (await api('POST', '/appStoreVersions', { data: {
            type: 'appStoreVersions',
            attributes: { platform: 'IOS', versionString: version },
            relationships: { app: rel('apps', app.id) },
        } })).data;
        log(`✓ Created version ${version}`);
    } else {
        log(`✓ Version ${version} exists (${v.attributes.appStoreState})`);
    }

    // 2. Version text
    const { data: locs } = await api('GET', `/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
    let loc = locs.find(l => l.attributes.locale === LOCALE);
    const attributes = { description: text.description, keywords: text.keywords, promotionalText: text.promotionalText, whatsNew: text.whatsNew };
    if (loc) {
        loc = (await api('PATCH', `/appStoreVersionLocalizations/${loc.id}`, { data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes } })).data;
    } else {
        loc = (await api('POST', '/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale: LOCALE, ...attributes }, relationships: { appStoreVersion: rel('appStoreVersions', v.id) } } })).data;
    }
    log('✓ Promotional text, keywords, description, What\'s New');

    // 3. Name and subtitle, on the app info that's still editable
    const { data: infos } = await api('GET', `/apps/${app.id}/appInfos`);
    const info = infos.find(i => !['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(i.attributes.appStoreState || i.attributes.state)) || infos[0];
    const { data: infoLocs } = await api('GET', `/appInfos/${info.id}/appInfoLocalizations`);
    const infoLoc = infoLocs.find(l => l.attributes.locale === LOCALE);
    for (const name of [text.name, text.fallbackName].filter(Boolean)) {
        try {
            await api('PATCH', `/appInfoLocalizations/${infoLoc.id}`, { data: { type: 'appInfoLocalizations', id: infoLoc.id, attributes: { name, subtitle: text.subtitle } } });
            log(`✓ Name "${name}", subtitle "${text.subtitle}"`);
            break;
        } catch (e) {
            if (name === text.fallbackName || !text.fallbackName) fail(`Couldn't set the name: ${e.message}`);
            log(`! "${name}" was refused (${e.message}); trying "${text.fallbackName}"`);
        }
    }

    // 4. Screenshots: replace each set with the repo's files, in order
    const { data: sets } = await api('GET', `/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
    for (const { type, files } of shots) {
        let set = sets.find(s => s.attributes.screenshotDisplayType === type);
        if (!set) {
            set = (await api('POST', '/appScreenshotSets', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: type }, relationships: { appStoreVersionLocalization: rel('appStoreVersionLocalizations', loc.id) } } })).data;
        }
        const { data: old } = await api('GET', `/appScreenshotSets/${set.id}/appScreenshots?limit=10`);
        for (const s of old) await api('DELETE', `/appScreenshots/${s.id}`);
        for (const file of files) {
            const bytes = readFileSync(file);
            const shot = (await api('POST', '/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: path.basename(file), fileSize: bytes.length }, relationships: { appScreenshotSet: rel('appScreenshotSets', set.id) } } })).data;
            for (const op of shot.attributes.uploadOperations) {
                const res = await fetch(op.url, {
                    method: op.method,
                    headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])),
                    body: bytes.subarray(op.offset, op.offset + op.length),
                });
                if (!res.ok) fail(`Uploading ${path.basename(file)} failed: HTTP ${res.status}`);
            }
            await api('PATCH', `/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') } } });
        }
        log(`✓ ${type}: ${files.length} screenshots`);
    }

    // 5. The build, once App Store Connect has processed it
    let b;
    for (let waited = 0; ; waited += 30) {
        b = await findBuild(app.id, version, build);
        const state = b && b.attributes.processingState;
        if (state === 'VALID') break;
        if (state === 'FAILED' || state === 'INVALID') fail(`Build ${build} processing ${state}`);
        if (waited >= 45 * 60) fail(`Build ${build} still ${state || 'not visible'} after 45 minutes; re-run prepare later`);
        if (waited % 120 === 0) log(`… build ${build} is ${state || 'not visible yet'}, waiting`);
        await sleep(30_000);
    }
    await api('PATCH', `/appStoreVersions/${v.id}/relationships/build`, rel('builds', b.id));
    log(`✓ Build ${build} attached to ${version}`);
    log('\nReady to submit: node scripts/asc-release.mjs submit');
}

async function submit() {
    const { version } = projectVersion();
    const app = await findApp();
    const v = (await versions(app.id)).find(x => x.attributes.versionString === version);
    if (!v) fail(`No version ${version}; run prepare first`);
    if (v.attributes.appStoreState !== 'PREPARE_FOR_SUBMISSION') fail(`Version ${version} is ${v.attributes.appStoreState}, not ready to submit`);

    const { data: drafts } = await api('GET', `/reviewSubmissions?filter[app]=${app.id}&filter[state]=READY_FOR_REVIEW&filter[platform]=IOS`);
    const sub = drafts[0] || (await api('POST', '/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: rel('apps', app.id) } } })).data;
    try {
        await api('POST', '/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: rel('reviewSubmissions', sub.id), appStoreVersion: rel('appStoreVersions', v.id) } } });
    } catch (e) {
        if (e.status !== 409) throw e;   // already in this submission
    }
    await api('PATCH', `/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
    log(`✓ Version ${version} submitted for review`);
}

const commands = { plan, status, upload, prepare, submit };
const cmd = process.argv[2];
if (!commands[cmd]) fail(`Usage: node scripts/asc-release.mjs <${Object.keys(commands).join('|')}>`);
try { await commands[cmd](); } catch (e) { fail(e.message); }
