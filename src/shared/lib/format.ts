// @ts-nocheck
export const fmt = new Intl.NumberFormat('uz-UZ');

// Uzbek month names don't exist in Intl — hand-made lists, RU for the ru locale.
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MONTHS_RU = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

function currentLang() {
  try { return localStorage.getItem('alpha_lang') || 'uz'; } catch { return 'uz'; }
}

export function monthName(monthIndex, lang = currentLang()) {
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_UZ;
  return months[monthIndex] || '';
}

/** "2026-05-19", timestamp, or Date → "19 May 2026" (uz) / "19 Мая 2026" (ru) */
export function fmtDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${monthName(d.getMonth())} ${d.getFullYear()}`;
}

/** Like fmtDate but with time: "19 May 2026, 14:05" */
export function fmtDateTime(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)}, ${hh}:${mm}`;
}
