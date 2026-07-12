// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { DateInput, DateTimeInput } from '@/shared/ui/date-picker';
import { SearchableGroupSelect, SearchableSelect } from '@/shared/ui/controls';
import { useT } from '@/shared/i18n/lang';
import {
  apiGetContracts,
  apiGetContract,
  apiGetContractPdf,
  apiRegenerateContractPdf,
  apiGetContractStats,
  apiTerminateContract,
  apiPatchContractMonthlyFee,
  apiPatchContractDates,
  apiPatchContractStatus,
  apiGetGateLogs,
  apiGetGroups,
  apiGetUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiUpdateUserRoles,
  apiGetRoles,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
  apiGetPermissions,
  apiGetSettings,
  apiGetSettingsRaw,
  apiUpdateSettings,
  apiGetArchiveStats,
  apiArchiveYear,
  apiUnarchiveYear,
  apiTriggerManualBackup,
  apiGetBackupStatus,
  apiImportStudents,
  apiGetTransactions,
  apiGetTransactionsWithName,
  apiGetTransaction,
  apiGetUnassignedTransactions,
  apiGetTransactionStats,
  apiCreateManualTransaction,
  apiCancelTransaction,
  apiAssignTransaction,
  apiGetReportsSummary,
  apiGetAttendanceGroupsReport,
  apiGetReportsTerminatedSummary,
  apiGetDebtors,
  apiGetFinanceReport,
  apiGetPayers,
  apiDebtorsExportUrl,
  apiDownloadDebtors,
  apiDownloadPayers,
  apiPayersExportUrl,
  apiPaymentsExcelUrl,
  apiDownloadPaymentsExcel,
  apiGetWaitingList,
  apiCreateWaitingList,
  apiUpdateWaitingList,
  apiDeleteWaitingList,
  apiGetStudent,
  apiGetStudentTransactions,
  apiDeleteUsersBulk,
  apiGetTerminatedContracts,
  apiUpdateContract,
  apiDeleteTransaction,
  apiDeleteTransactionsBulk,
  apiCreateManualTransactionWithProof,
  apiGetWaitingListNext,
  apiGetAuditLogs,
} from '@/shared/api';

import { fmt, fmtDateTime } from '@/shared/lib/format';
import { Stat } from '@/shared/ui/stat';

export function GateLogsScreen() {
  const I = Icon;
  const { t } = useT();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [logs, setLogs] = React.useState([]);
  const [meta, setMeta] = React.useState({ total: 0, total_pages: 1, page: 1 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [fromDate, setFromDate] = React.useState(todayIso);
  const [toDate, setToDate] = React.useState(todayIso);
  const [allowedFilter, setAllowedFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setLoading(true);
    setError('');
    const params = { page, page_size: 50 };
    if (fromDate) params.from_date = fromDate + 'T00:00:00';
    if (toDate) params.to_date = toDate + 'T23:59:59';
    if (allowedFilter !== '') params.allowed = allowedFilter;
    apiGetGateLogs(params)
      .then((res) => {
        setLogs(res?.data || []);
        setMeta(res?.meta || { total: 0, total_pages: 1, page: 1 });
      })
      .catch(() => {
        setError(t('gate_load_err'));
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [fromDate, toDate, allowedFilter, page]);

  const allowedCount = logs.filter((l) => l.allowed !== false).length;
  const deniedCount = logs.filter((l) => l.allowed === false).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('gate_title')}</h1>
          <div className="page-sub">{meta.total} {t('gate_events_suffix')}</div>
        </div>
        <div className="page-actions">
          <DateInput value={fromDate} onChange={v => { setFromDate(v); setPage(1); }} placeholder={t('cal_from')} />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
          <DateInput value={toDate} onChange={v => { setToDate(v); setPage(1); }} placeholder={t('cal_to')} />
          <SearchableSelect
            value={allowedFilter}
            onChange={v => { setAllowedFilter(v); setPage(1); }}
            options={[
              { value: '', label: t('gate_all_option') },
              { value: 'true', label: t('gate_allowed_chip') },
              { value: 'false', label: t('gate_denied_chip') },
            ]}
          />
        </div>
      </div>

      <div className="grid-3" style={{ gap: 12, marginBottom: 14 }}>
        <Stat label={t('gate_allowed_chip')} value={allowedCount} tone="success" icon={I.LogIn} />
        <Stat label={t('gate_denied_chip')} value={deniedCount} tone="danger" icon={I.ShieldOff} />
        <Stat label={t('gate_total_page_label')} value={meta.total} icon={I.Users} />
      </div>

      {error && <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 8, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

      {loading ? (
        <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t('gate_student_col')}</th><th>{t('gate_status_col')}</th><th>{t('gate_reason_col')}</th><th>{t('gate_col_time')}</th></tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>{t('gate_no_logs')}</td></tr>
              )}
              {logs.map((l, idx) => (
                <tr key={l.id || idx}>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: l.allowed !== false ? 'var(--success-soft)' : 'var(--danger-soft)', color: l.allowed !== false ? 'var(--success)' : 'var(--danger)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {l.allowed !== false ? <I.LogIn size={14} /> : <I.ShieldOff size={14} />}
                      </div>
                      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t('gate_col_student')} #{l.student_id || '—'}</span>
                    </div>
                  </td>
                  <td>
                    {l.allowed !== false
                      ? <span className="chip success"><span className="chip-dot"></span>{t('gate_allowed_chip')}</span>
                      : <span className="chip danger"><span className="chip-dot"></span>{t('gate_denied_chip')}</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{l.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDateTime(l.gate_timestamp || l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.total_pages > 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ {t('prev')}</button>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{page} / {meta.total_pages} · {t('all')}: {meta.total}</span>
              <button className="btn sm ghost" disabled={page >= meta.total_pages} onClick={() => setPage(p => p + 1)}>{t('next')} ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const GateScreen = GateLogsScreen;

// ─── Users ────────────────────────────────────────────────────────────────────

