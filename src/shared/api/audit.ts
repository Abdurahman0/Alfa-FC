// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Audit Logs
export async function apiGetAuditLogs(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/audit-logs${q ? '?' + q : ''}`);
}
