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

// Role-resilient group list for selects/panels. Admins, head coaches and
// coaches each see groups through a different endpoint (the others 403);
// query all three, ignore failures, merge unique by id — so group dropdowns
// are never empty because of the caller's role.
export async function apiGetGroupsForSelect(params = {}) {
  const results = await Promise.allSettled([
    apiGetGroups({ page_size: 100, ...params }),
    apiFetch('/head-coach/groups'),
    apiFetch('/coach/groups'),
  ]);
  const byId = new Map();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const list = r.value?.data;
    if (!Array.isArray(list)) continue;
    for (const g of list) {
      if (g && g.id != null && !byId.has(g.id)) byId.set(g.id, g);
    }
  }
  return { data: [...byId.values()] };
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
