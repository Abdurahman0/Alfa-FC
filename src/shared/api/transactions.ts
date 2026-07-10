// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Transactions
export async function apiGetTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/transactions${q ? '?' + q : ''}`);
}

export async function apiGetUnassignedTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/transactions/unassigned${q ? '?' + q : ''}`);
}

export async function apiGetTransactionsWithName(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/transactions/withname${q ? '?' + q : ''}`);
}

export async function apiGetTransactionStats(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/transactions/transactionstatistics${q ? '?' + q : ''}`);
}

export async function apiCreateManualTransaction(data) {
  return apiFetch('/transactions/manual', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiCreateManualTransactionWithProof(formData) {
  return apiFetch('/transactions/manual/with-proof', { method: 'POST', body: formData });
}

export async function apiAssignTransaction(id, data) {
  return apiFetch(`/transactions/${id}/assign`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiCancelTransaction(id) {
  return apiFetch(`/transactions/${id}/cancel`, { method: 'PATCH' });
}

export async function apiDeleteTransaction(id) {
  return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
}

export async function apiDeleteTransactionsBulk(ids) {
  return apiFetch('/transactions/bulk-delete', { method: 'POST', body: JSON.stringify(ids) });
}

export async function apiGetTransaction(id) {
  return apiFetch(`/transactions/${id}`);
}
