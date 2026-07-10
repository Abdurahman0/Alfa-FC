// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Users
export async function apiGetUsers(params = {}) {
  const q = buildQuery(params, ['page'], {}, 100);
  return apiFetch(`/users${q ? '?' + q : ''}`);
}

export async function apiGetUser(id) {
  return apiFetch(`/users/${id}`);
}

export async function apiCreateUser(data) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateUser(id, data) {
  return apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiUpdateUserRoles(id, role_ids) {
  return apiFetch(`/users/${id}/roles`, { method: 'PATCH', body: JSON.stringify({ role_ids }) });
}

export async function apiDeleteUser(id) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

export async function apiChangePassword(id, data) {
  return apiFetch(`/users/${id}/change-password`, { method: 'POST', body: JSON.stringify(data) });
}
export async function apiDeleteUsersBulk(ids) {
  return apiFetch('/users/bulk-delete', { method: 'POST', body: JSON.stringify(ids) });
}

// Coaches
export async function apiGetCoaches() {
  return apiFetch('/users/coaches');
}
