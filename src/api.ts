// @ts-nocheck
import { http } from './shared/api/http';
import { tokenStore } from './shared/api/token';

// Legacy helpers kept for callers that read the URL directly
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.alpha.cognilabs.org').replace(/\/$/, '');

function unwrapData(json) {
  return json?.data ?? json ?? null;
}

function unwrapDataArray(json) {
  const data = unwrapData(json);
  return Array.isArray(data) ? data : [];
}

function normalizeContractMonthlyFeePayload(data = {}) {
  return {
    monthly_fee_amount: data.monthly_fee_amount ?? data.monthly_fee ?? data.amount,
  };
}

function normalizeContractDatesPayload(data = {}) {
  return {
    contract_start_date: data.contract_start_date ?? data.start_date,
    contract_end_date: data.contract_end_date ?? data.end_date,
  };
}

function clampPageSize(pageSize, max) {
  if (pageSize === undefined || pageSize === null || pageSize === '') return undefined;
  const n = Number(pageSize);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(n, max);
}

function buildQuery(params = {}, allowedKeys = [], aliases = {}, pageSizeMax) {
  const query = {};

  allowedKeys.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') query[key] = value;
  });

  Object.entries(aliases).forEach(([from, to]) => {
    const value = params[from];
    if (value !== undefined && value !== null && value !== '') query[to] = value;
  });

  if (pageSizeMax) {
    const pageSize = clampPageSize(params.page_size, pageSizeMax);
    if (pageSize !== undefined) query.page_size = pageSize;
  }

  return new URLSearchParams(query).toString();
}

// Token helpers — delegate to tokenStore so Axios interceptors always see current tokens
export function getToken() { return tokenStore.getAccessToken(); }
export function setTokens(access, refresh) { tokenStore.setTokens(access, refresh); }
export function clearTokens() { tokenStore.clearTokens(); }

let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
  // Wire the Axios 401 path to the same handler so the app logs out on refresh failure.
  // The http interceptor clears tokens; here we additionally trigger the UI logout.
  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && !error.config?._retry) {
        // _retry is set by the existing interceptor only after a failed refresh attempt.
        // If we reach this point without _retry, the token was simply missing — log out.
      }
      // After the existing refresh interceptor has cleared tokens it rejects the promise.
      // Check whether tokens are now gone; if so, invoke the logout handler.
      if (!tokenStore.getAccessToken() && _onUnauthorized) {
        _onUnauthorized();
      }
      return Promise.reject(error);
    },
  );
}

/**
 * apiFetch — now backed by the Axios `http` instance which handles:
 *   - Authorization header attachment (request interceptor)
 *   - 401 → silent token refresh → retry (response interceptor)
 *
 * FormData bodies are passed through unchanged; Axios sets the correct
 * multipart Content-Type automatically when the body is a FormData object.
 */
export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;

  const axiosConfig = {
    method,
    url: path,
    headers: { ...options.headers },
  };

  if (options.body !== undefined) {
    axiosConfig.data = options.body;
    // For JSON strings, parse back to object so Axios serialises correctly.
    if (!isFormData && typeof options.body === 'string') {
      try { axiosConfig.data = JSON.parse(options.body); } catch { /* leave as-is */ }
    }
    if (!isFormData) {
      axiosConfig.headers['Content-Type'] = 'application/json';
    }
    // FormData: let Axios set Content-Type with boundary automatically.
  }

  try {
    const res = await http.request(axiosConfig);
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Tokens already cleared by the http interceptor.
      if (_onUnauthorized) _onUnauthorized();
      return null;
    }
    const detail = error.response?.data?.detail;
    throw new Error(detail || `Xatolik: ${error.response?.status ?? error.message}`);
  }
}

// Auth
export async function apiLogin(phone_or_email, password) {
  const res = await fetch(BASE_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_or_email, password }),
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  if (!res.ok) throw new Error(json.detail || 'Login xatolik');
  const auth = json.data || json;
  setTokens(auth.access_token, auth.refresh_token);
  return auth;
}

export async function apiGetMe() {
  const data = unwrapData(await apiFetch('/auth/me'));
  // API may return { user: {...}, permissions: [...] } or the user object directly
  const user = data?.user ?? data;
  const permissions = data?.permissions || user?.permissions || [];
  return {
    user,
    permissions,
    data,
  };
}

export function apiLogout() { clearTokens(); }

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

// Students
export async function apiGetStudents(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/students${q ? '?' + q : ''}`);
}

export async function apiGetStudent(id) {
  return apiFetch(`/students/${id}`);
}

export async function apiCreateStudent(formData) {
  return apiFetch('/students', { method: 'POST', body: formData });
}

export async function apiUpdateStudent(id, formData) {
  return apiFetch(`/students/${id}`, { method: 'PATCH', body: formData });
}

export async function apiDeleteStudent(id) {
  return apiFetch(`/students/${id}`, { method: 'DELETE' });
}

export async function apiHardDeleteStudent(id) {
  return apiFetch(`/students/${id}/hard-delete`, { method: 'DELETE' });
}

export async function apiGetStudentFullInfo(id) {
  return apiFetch(`/students/fullinfo/${id}`);
}

export async function apiGetStudentAttendance(id, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/students/${id}/attendance${q ? '?' + q : ''}`);
}

export async function apiGetStudentTransactions(id) {
  return apiFetch(`/students/${id}/transactions`);
}

export async function apiGetStudentGateLogs(id) {
  return apiFetch(`/students/${id}/gatelogs`);
}

export async function apiGetStudentAttendanceReport(id, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/reports/attendance/students/${id}${q ? '?' + q : ''}`);
}

export async function apiGetStudentContracts(id) {
  return apiFetch(`/students/${id}/contract`);
}

export async function apiGetStudentContract(id) {
  return apiGetStudentContracts(id);
}

export async function apiSearchStudents(query, params = {}) {
  const q = new URLSearchParams({ query, ...params }).toString();
  return apiFetch(`/students/search${q ? '?' + q : ''}`);
}

export async function apiGetStudentsComprehensiveExportUrl() {
  return `${BASE_URL}/students/comprehensive-export`;
}

export async function apiDownloadGroupStudentsExport(id) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/groups/${id}/export-students`, { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export async function apiDownloadStudentFile(url: string) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, '') : 'file';
  return { blob: await res.blob(), filename };
}

export async function apiDownloadStudentsComprehensiveExport() {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/students/comprehensive-export`, { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export async function apiGetStudentsAttendanceAll(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/students/attendances/all${q ? '?' + q : ''}`);
}

export async function apiDeleteStudentsBulk(ids) {
  return apiFetch('/students/bulk-delete', { method: 'POST', body: JSON.stringify(ids) });
}

export async function apiImportStudents(formData) {
  return apiFetch('/import/students', { method: 'POST', body: formData });
}

export async function apiUploadStudentPassport(id, formData) {
  return apiFetch(`/students/${id}/passport`, { method: 'POST', body: formData });
}

export async function apiUploadStudentExtraFile(id, formData) {
  return apiFetch(`/students/${id}/extra-file`, { method: 'POST', body: formData });
}

// Coaches
export async function apiGetCoaches() {
  return apiFetch('/users/coaches');
}

export async function apiGetHeadCoachGroups() {
  return apiFetch('/head-coach/groups');
}

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

// Attendance (coach)
export async function apiGetCoachSessions(params = {}) {
  const q = buildQuery(params, ['date', 'from_date', 'to_date', 'group_id'], { session_date: 'date' });
  return apiFetch(`/coach/sessions${q ? '?' + q : ''}`);
}

export async function apiGetCoachGroups() {
  return apiFetch('/coach/groups');
}

export async function apiGetCoachAttendanceStats(groupId) {
  return apiFetch(`/coach/groups/${groupId}/attendance-stats`);
}

export async function apiGetCoachStudentAttendanceStats(studentId) {
  return apiFetch(`/coach/students/${studentId}/attendance-stats`);
}

export async function apiGetCoachMyAttendances(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/coach/my-attendances${q ? '?' + q : ''}`);
}

export async function apiGetCoachGroupPerformanceTable(groupId, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/coach/groups/${groupId}/performance-table${q ? '?' + q : ''}`);
}

export async function apiSaveCoachGroupPerformanceTable(groupId, data) {
  return apiFetch(`/coach/groups/${groupId}/performance-table`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiCreateCoachPerformanceTableColumn(groupId, data) {
  return apiFetch(`/coach/groups/${groupId}/performance-table/columns`, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateCoachPerformanceTableColumn(groupId, matchId, data) {
  return apiFetch(`/coach/groups/${groupId}/performance-table/columns/${matchId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteCoachPerformanceTableColumn(groupId, colId, season_year) {
  return apiFetch(`/coach/groups/${groupId}/performance-table/columns/${colId}?season_year=${encodeURIComponent(season_year)}`, { method: 'DELETE' });
}

export async function apiReorderCoachPerformanceTableColumns(groupId, data) {
  return apiFetch(`/coach/groups/${groupId}/performance-table/columns-reorder`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiGetCoachGroupPerformanceTableExportUrl(groupId, season_year) {
  return `${BASE_URL}/coach/groups/${groupId}/performance-table/export?season_year=${encodeURIComponent(season_year)}`;
}

export async function apiDownloadCoachGroupPerformanceTableExport(groupId, season_year) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(
    `${BASE_URL}/coach/groups/${groupId}/performance-table/export?season_year=${encodeURIComponent(season_year)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export async function apiUploadCoachSessionKonspekt(sessionId, formData) {
  return apiFetch(`/coach/sessions/${sessionId}/upload-konspekt`, { method: 'POST', body: formData });
}

export async function apiMarkAttendance(sessionId, data) {
  return apiFetch(`/coach/sessions/${sessionId}/attendance`, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateAttendance(sessionId, data) {
  return apiFetch(`/coach/sessions/${sessionId}/attendance`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiMarkBulkAttendance(sessionId, attendances) {
  return apiFetch(`/coach/sessions/${sessionId}/bulk-attendance`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, attendances }),
  });
}

// Contracts
export async function apiGetContracts(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/contracts${q ? '?' + q : ''}`);
}

export async function apiGetContractStats() {
  return apiFetch('/contracts/stats');
}

export async function apiGetContract(id) {
  return apiFetch(`/contracts/${id}`);
}

export async function apiGetTerminatedContracts(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/contracts/terminated${q ? '?' + q : ''}`);
}

export async function apiUpdateContract(id, data) {
  return apiFetch(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiTerminateContract(id, data) {
  return apiFetch(`/contracts/${id}/terminate`, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiPatchContractStatus(id, data) {
  return apiFetch(`/contracts/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiPatchContractMonthlyFee(id, data) {
  return apiUpdateContract(id, normalizeContractMonthlyFeePayload(data));
}

export async function apiPatchContractDates(id, data) {
  return apiUpdateContract(id, normalizeContractDatesPayload(data));
}

export async function apiRegenerateContractPdf(id) {
  return apiFetch(`/contracts/${id}/regenerate-pdf`, { method: 'POST' });
}

export async function apiGetContractPdf(id) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/contracts/${id}/pdf`, { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export function apiContractPdfUrl(id) {
  return `${BASE_URL}/contracts/${id}/pdf`;
}

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

// Gate
export async function apiGetGateLogs(params = {}) {
  const q = buildQuery(params, ['student_id', 'from_date', 'to_date', 'page', 'allowed'], {}, 100);
  return apiFetch(`/gate/logs${q ? '?' + q : ''}`);
}

// Reports
export async function apiGetDashboard() {
  return apiFetch('/reports/dashboard/summary');
}

export async function apiGetDebtors(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/reports/debtors${q ? '?' + q : ''}`);
}

// Performance Table
export async function apiAddPerformanceTableMatch(groupId, matchData) {
  return apiFetch(`/coach/groups/${groupId}/performance-table/columns`, {
    method: 'POST',
    body: JSON.stringify(matchData),
  });
}

export async function apiGetPayers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/reports/payers${q ? '?' + q : ''}`);
}

export async function apiGetFinanceReport(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/reports/finance${q ? '?' + q : ''}`);
}

export async function apiGetReportsSummary() {
  return unwrapData(await apiGetDashboard()) || {};
}

export async function apiGetReportsRevenueDynamics(group_by = 'month') {
  const q = new URLSearchParams({ group_by }).toString();
  return unwrapDataArray(await apiFetch(`/reports/revenue-dynamics${q ? '?' + q : ''}`));
}

export async function apiGetReportsPaymentsBySource() {
  return unwrapDataArray(await apiFetch('/reports/payments-by-source'));
}

export async function apiGetReportsTerminatedSummary() {
  return apiFetch('/reports/terminated-summary');
}

export async function apiGetAttendanceGroupsReport(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/reports/attendance/groups${q ? '?' + q : ''}`);
}

export function apiPayersExportUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${BASE_URL}/reports/payers/export${q ? '?' + q : ''}`;
}

export function apiDebtorsExportUrl() {
  return `${BASE_URL}/reports/debtors/export`;
}

export function apiPaymentsExcelUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${BASE_URL}/reports/payments-excel${q ? '?' + q : ''}`;
}

export async function apiDownloadPaymentsExcel(params = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiPaymentsExcelUrl(params), { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export async function apiDownloadDebtors() {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiDebtorsExportUrl(), { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

export async function apiDownloadPayers(params = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiPayersExportUrl(params), { headers });
  if (!res.ok) throw new Error(`Xatolik: ${res.status}`);
  return res.blob();
}

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

// Students extra
export async function apiChangeStudentGroup(id, group_id) {
  return apiFetch(`/students/${id}/group?group_id=${encodeURIComponent(group_id)}`, { method: 'PATCH' });
}

export async function apiDeleteUsersBulk(ids) {
  return apiFetch('/users/bulk-delete', { method: 'POST', body: JSON.stringify(ids) });
}

export async function apiGetStudentForContract(id) {
  return apiFetch(`/students/${id}`);
}

export async function apiUploadStudentPhoto(id, formData) {
  return apiFetch(`/students/${id}/photo`, { method: 'POST', body: formData });
}

// Audit Logs
export async function apiGetAuditLogs(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/audit-logs${q ? '?' + q : ''}`);
}
