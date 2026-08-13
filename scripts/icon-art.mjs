// The Israeli Whist mark, as one reusable SVG.
//
// Structure follows the other apps on this account (SongCatcher, Mycelia): a
// dark saturated ground with a circular emblem, and the subject living INSIDE
// the circle rather than being it. Here the subject is the game's own moment —
// four seats' cards crossed in the middle of the table.
//
// Shared by scripts/make-icons.mjs (PWA/web icons) and
// scripts/make-native-assets.mjs (1024 app icon + splash screens) so the mark
// only has to be edited in one place.

/** One playing card: rounded ivory rect, inked edge, a single large pip. */
function card(s, { x, y, w, h, rot, pip, colour }) {
    return `
    <g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} ${h})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${w * 0.11}"
            fill="url(#ivory)" stroke="#2a2118" stroke-width="${w * 0.028}"/>
      <text x="${w * 0.5}" y="${h * 0.63}" font-family="Georgia, 'Iowan Old Style', serif"
            font-size="${w * 0.72}" fill="${colour}" text-anchor="middle">${pip}</text>
    </g>`;
}

function defs(s) {
    return `
  <defs>
    <radialGradient id="felt" cx="50%" cy="40%" r="72%">
      <stop offset="0%"   stop-color="#2e5b46"/>
      <stop offset="55%"  stop-color="#183524"/>
      <stop offset="100%" stop-color="#0b1710"/>
    </radialGradient>
    <linearGradient id="ivory" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbf6e8"/><stop offset="100%" stop-color="#e6dcc4"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="${s * 0.012}" stdDeviation="${s * 0.018}" flood-color="#000" flood-opacity=".55"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".06"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>`;
}

/**
 * @param {number} size      Square edge in px.
 * @param {number} [radius]  Ring radius as a fraction of `size`. Shrink it for
 *                           maskable icons so the mark stays inside the circular
 *                           safe zone (0.30 rather than the default 0.365).
 * @returns {string} A standalone SVG document.
 */
export function whistMark(size, radius = 0.365) {
    const s = size, c = s / 2;
    const r = s * radius;
    // Cards scale off the ring, not the canvas, so a smaller ring shrinks the
    // whole arrangement with it instead of overflowing.
    const cw = r * 0.48, ch = r * 0.70, off = r * 0.29;
    const cy = c - s * 0.015;                    // nudge up: optical centre
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${defs(s)}
  <rect width="${s}" height="${s}" fill="url(#felt)"/>
  <rect width="${s}" height="${s}" fill="url(#felt)" filter="url(#grain)" opacity=".9"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#efe6d0" stroke-width="${s * 0.030}" filter="url(#soft)"/>
  <circle cx="${c}" cy="${c}" r="${r - s * 0.030}" fill="#12271b" opacity=".5"/>
  <g filter="url(#soft)">
    ${card(s, { x: c - cw / 2,             y: cy - ch - off * 0.15, w: cw, h: ch, rot: 8,   pip: '&#9824;', colour: '#20242a' })}
    ${card(s, { x: c - cw / 2 - off * 1.35, y: cy - ch * 0.55,      w: cw, h: ch, rot: -62, pip: '&#9827;', colour: '#20242a' })}
    ${card(s, { x: c - cw / 2 + off * 1.35, y: cy - ch * 0.55,      w: cw, h: ch, rot: 62,  pip: '&#9830;', colour: '#b83c33' })}
    ${card(s, { x: c - cw / 2,             y: cy - ch * 0.10,       w: cw, h: ch, rot: -8,  pip: '&#9829;', colour: '#b83c33' })}
  </g>
</svg>`;
}

/** Launch screen: the same mark, small and centred on a darker felt. */
export function whistSplash(size, dark = false) {
    const s = size, c = s / 2;
    const stops = dark
        ? ['#152a1f', '#0d1c14', '#081109']
        : ['#1b3527', '#12251a', '#0c1712'];
    // The mark is rendered at a fraction of the canvas and centred, so the
    // splash reads as the icon on a table rather than a stretched icon.
    const markSize = Math.round(s * 0.34);
    const inner = whistMark(markSize)
        .replace(/^\s*<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        // Drop the mark's own opaque ground so the splash felt shows through.
        .replace(/<rect width="[\d.]+" height="[\d.]+" fill="url\(#felt\)"[^>]*\/>\s*/g, '')
        // Namespace the shared ids so they can't collide with the outer doc.
        .replace(/id="(\w+)"/g, 'id="m-$1"')
        .replace(/url\(#(\w+)\)/g, 'url(#m-$1)');
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="sfelt" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${stops[0]}"/>
      <stop offset="60%" stop-color="${stops[1]}"/>
      <stop offset="100%" stop-color="${stops[2]}"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#sfelt)"/>
  <g transform="translate(${c - markSize / 2} ${c - markSize / 2})">${inner}</g>
</svg>`;
}
