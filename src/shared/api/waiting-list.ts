// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Waiting List
export async function apiGetWaitingList(params = {}) {
  const q = buildQuery(params, ['group_id', 'birth_year', 'page'], {}, 100);
  return apiFetch(`/waiting-list${q ? '?' + q : ''}`);
}

export async function apiGetWaitingListItem(id) {
  return apiFetch(`/waiting-list/${id}`);
}

export async function apiGetWaitingListNext(group_id) {
  return apiFetch(`/waiting-list/group/${group_id}/next`);
}

export async function apiCreateWaitingList(data) {
  return apiFetch('/waiting-list', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateWaitingList(id, data) {
  return apiFetch(`/waiting-list/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteWaitingList(id) {
  return apiFetch(`/waiting-list/${id}`, { method: 'DELETE' });
}
