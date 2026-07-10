// @ts-nocheck
import {
  apiFetch, BASE_URL, buildQuery, getToken, setTokens, clearTokens,
  unwrapData, unwrapDataArray,
  normalizeContractMonthlyFeePayload, normalizeContractDatesPayload,
} from './client';

export async function apiGetArchiveStats(year) {
  return apiFetch(`/archive/stats/${year}`);
}

export async function apiArchiveYear(year) {
  return apiFetch(`/archive/year/${year}`, { method: 'POST' });
}

export async function apiUnarchiveYear(year) {
  return apiFetch(`/archive/unarchive/year/${year}`, { method: 'POST' });
}

export async function apiTriggerManualBackup() {
  return apiFetch('/backup/manual', { method: 'POST' });
}

export async function apiGetBackupStatus() {
  return apiFetch('/backup/status');
}

// Settings
export async function apiGetSettings() {
  const data = unwrapData(await apiFetch('/settings/system'));
  // API returns [{key, value, description}] — convert to flat {key: value} map
  if (Array.isArray(data)) {
    return data.reduce((acc, item) => {
      if (item.key) acc[item.key] = item.value ?? '';
      return acc;
    }, {});
  }
  return data || {};
}

export async function apiGetSettingsRaw() {
  return apiFetch('/settings/system');
}

export async function apiPatchSettings(data) {
  return apiFetch('/settings/system', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiUpdateSettings(data) {
  return apiPatchSettings(data);
}
