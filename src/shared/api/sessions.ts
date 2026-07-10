// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Sessions
export async function apiGetSessions(params = {}) {
  const q = buildQuery(params, ['date', 'from_date', 'to_date', 'group_id'], { session_date: 'date' });
  return apiFetch(`/head-coach/sessions${q ? '?' + q : ''}`);
}

export async function apiCreateSession(data) {
  return apiFetch('/head-coach/sessions', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiCreateHeadCoachSessionsBulk(data) {
  return apiFetch('/head-coach/sessions/bulk', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateSession(id, data) {
  return apiFetch(`/head-coach/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteSession(id) {
  return apiFetch(`/head-coach/sessions/${id}`, { method: 'DELETE' });
}

export async function apiGetSessionDetails(id) {
  return apiFetch(`/head-coach/sessions/${id}`);
}

export async function apiGetCoachSessionDetails(id) {
  return apiFetch(`/coach/sessions/${id}`);
}
