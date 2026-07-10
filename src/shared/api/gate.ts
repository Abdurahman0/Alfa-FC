// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

// Gate
export async function apiGetGateLogs(params = {}) {
  const q = buildQuery(params, ['student_id', 'from_date', 'to_date', 'page', 'allowed'], {}, 100);
  return apiFetch(`/gate/logs${q ? '?' + q : ''}`);
}
