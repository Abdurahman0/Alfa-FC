// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Roles
export async function apiGetRoles() {
  return apiFetch('/roles');
}

export async function apiCreateRole(data) {
  return apiFetch('/roles', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateRole(id, data) {
  return apiFetch(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteRole(id) {
  return apiFetch(`/roles/${id}`, { method: 'DELETE' });
}

export async function apiGetPermissions() {
  return apiFetch('/roles/permissions');
}
