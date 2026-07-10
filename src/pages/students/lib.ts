// @ts-nocheck
export function calcAge(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function fullName(s) { return `${s.first_name} ${s.last_name}`; }
export function normalizeStatus(status) { return String(status || '').toLowerCase(); }
