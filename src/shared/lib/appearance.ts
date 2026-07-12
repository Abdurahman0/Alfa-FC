// @ts-nocheck
// Site appearance (accent color + background tint), persisted in localStorage.
// Applied by injecting a <style> tag so each value can differ per theme —
// a plain inline root style could not override [data-theme="dark"] tokens.
//
// Only --accent / --accent-contrast / --bg-base are injected; every other
// accent-ish token (--accent-soft, --primary, --ring, nav, tabs, selection…)
// derives from them in index.css via color-mix, so one swap re-skins the app.

const KEY = 'alpha_appearance';

export const DEFAULT_APPEARANCE = { accent: '#C8202C' };

export const ACCENTS = ['#C8202C', '#2563EB', '#0E9F6E', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#101D42'];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

// WCAG-ish relative luminance, 0 (black) → 1 (white)
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// White or near-black text on top of the accent
function contrastOn(hex) {
  return luminance(hex) > 0.45 ? '#131A2C' : '#FFFFFF';
}

// Dark surfaces swallow very dark accents (e.g. navy) — lift them toward
// white until they read clearly, leave already-bright accents untouched.
function accentForDark(hex) {
  const lum = luminance(hex);
  if (lum >= 0.28) return hex;
  const t = Math.min(0.55, (0.28 - lum) * 2.2 + 0.18);
  return mix(hex, '#FFFFFF', t);
}

export function loadAppearance() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(a) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* private mode */ }
}

export function isDefaultAppearance(a) {
  return a.accent === DEFAULT_APPEARANCE.accent;
}

export function applyAppearance(a = loadAppearance()) {
  let el = document.getElementById('alpha-appearance');
  if (isDefaultAppearance(a)) {
    if (el) el.remove(); // CSS defaults already match
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'alpha-appearance';
    document.head.appendChild(el);
  }
  const acc = a.accent || DEFAULT_APPEARANCE.accent;
  const accDark = accentForDark(acc);
  // One color drives everything: the page background is the accent washed
  // almost to white (light) / almost to black (dark), so picking a color
  // re-tints the whole canvas together with buttons, nav and rings.
  const bgLight = mix(acc, '#F7F8FA', 0.95);
  const bgDark = mix(accDark, '#0A0E1A', 0.93);
  el.textContent = `
:root {
  --accent: ${acc};
  --accent-contrast: ${contrastOn(acc)};
  --bg-base: ${bgLight};
}
[data-theme="dark"] {
  --accent: ${accDark};
  --accent-contrast: ${contrastOn(accDark)};
  --bg-base: ${bgDark};
}
`;
}
