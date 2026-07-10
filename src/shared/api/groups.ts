// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Groups
export async function apiGetGroups(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/groups${q ? '?' + q : ''}`);
}

export async function apiGetGroup(id) {
  return apiFetch(`/groups/${id}`);
}

export async function apiCreateGroup(data) {
  return apiFetch('/groups', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateGroup(id, data) {
  return apiFetch(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteGroup(id) {
  return apiFetch(`/groups/${id}`, { method: 'DELETE' });
}

export async function apiDeleteGroupsBulk(ids) {
  return apiFetch('/groups/bulk-delete', { method: 'POST', body: JSON.stringify(ids) });
}

export async function apiGetGroupStudents(id) {
  return apiFetch(`/groups/${id}/students`);
}

export async function apiGetGroupStudentsExportUrl(id) {
  return `${BASE_URL}/groups/${id}/export-students`;
}
