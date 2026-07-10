// @ts-nocheck
// Site appearance (accent color + background tint), persisted in localStorage.
// Applied by injecting a <style> tag so each value can differ per theme —
// a plain inline root style could not override [data-theme="dark"] tokens.

const KEY = 'alpha_appearance';

export const DEFAULT_APPEARANCE = { accent: '#C8202C', bg: 'neutral' };

export const ACCENTS = ['#C8202C', '#2563EB', '#0E9F6E', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#101D42'];

export const BACKGROUNDS = [
  { id: 'neutral', light: '#F5F6F8', dark: '#0B101E' },
  { id: 'warm', light: '#F8F6F0', dark: '#141109' },
  { id: 'cool', light: '#F0F4FA', dark: '#0A1424' },
  { id: 'sage', light: '#F1F6F0', dark: '#0C1510' },
  { id: 'rose', light: '#F9F3F5', dark: '#170E14' },
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${r}, ${g}, ${b})`;
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
  return a.accent === DEFAULT_APPEARANCE.accent && a.bg === DEFAULT_APPEARANCE.bg;
}

export function applyAppearance(a = loadAppearance()) {
  let el = document.getElementById('alpha-appearance');
  if (isDefaultAppearance(a)) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'alpha-appearance';
    document.head.appendChild(el);
  }
  const bg = BACKGROUNDS.find(b => b.id === a.bg) || BACKGROUNDS[0];
  const acc = a.accent || DEFAULT_APPEARANCE.accent;
  el.textContent = `
:root {
  --accent: ${acc};
  --accent-soft: ${withAlpha(acc, 0.12)};
  --primary: ${shade(acc, 0.82)};
  --primary-hover: ${shade(acc, 1.0)};
  --ring: 0 0 0 3px ${withAlpha(acc, 0.22)};
  --bg: ${bg.light};
}
[data-theme="dark"] {
  --accent-soft: ${withAlpha(acc, 0.2)};
  --primary: ${shade(acc, 0.9)};
  --primary-hover: ${shade(acc, 1.1)};
  --bg: ${bg.dark};
}
`;
}
