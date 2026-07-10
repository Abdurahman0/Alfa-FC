// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
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

import { fmt } from '@/shared/lib/format';
import { Stat } from '@/shared/ui/stat';

export function AuditLogsScreen() {
  const I = Icon;
  const { t } = useT();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [entityType, setEntityType] = React.useState('');
  const [action, setAction] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [userFilter, setUserFilter] = React.useState('');
  const [usersList, setUsersList] = React.useState([]);
  const [detail, setDetail] = React.useState(null);

  React.useEffect(() => {
    apiGetUsers({ page_size: 200 }).then(res => setUsersList(res?.data || [])).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, page_size: 50 };
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;
      if (fromDate) params.from_date = fromDate + 'T00:00:00';
      if (toDate) params.to_date = toDate + 'T23:59:59';
      if (search) params.search = search;
      if (userFilter) params.user_full_name = userFilter;
      const res = await apiGetAuditLogs(params);
      setRows(res?.data || []);
      const meta = res?.meta;
      setTotalPages(meta?.total_pages || 1);
      setTotalCount(meta?.total || 0);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadData(); }, [page, entityType, action, fromDate, toDate, search, userFilter]);

  function actionChip(a) {
    const s = String(a || '').toUpperCase();
    if (s === 'CREATE') return <span className="chip success">{a}</span>;
    if (s === 'UPDATE' || s === 'PATCH') return <span className="chip warning">{a}</span>;
    if (s === 'DELETE') return <span className="chip danger">{a}</span>;
    if (s === 'LOGIN') return <span className="chip navy">{a}</span>;
    if (s === 'CANCEL' || s === 'TERMINATE') return <span className="chip danger">{a}</span>;
    return <span className="chip">{a || '—'}</span>;
  }

  const hasFilters = entityType || action || fromDate || toDate || search || userFilter;


  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('audit_title')}</h1>
          <div className="page-sub">{totalCount} {t('audit_records_sfx')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchableSelect
          value={entityType}
          onChange={v => { setEntityType(v); setPage(1); }}
          options={[
            { value: '', label: `${t('all')} ${t('audit_col_entity').toLowerCase()}` },
            { value: 'student', label: 'student' },
            { value: 'user', label: 'user' },
            { value: 'contract', label: 'contract' },
            { value: 'session', label: 'session' },
            { value: 'group', label: 'group' },
            { value: 'transaction', label: 'transaction' },
            { value: 'attendance', label: 'attendance' },
          ]}
        />
        <SearchableSelect
          value={action}
          onChange={v => { setAction(v); setPage(1); }}
          options={[
            { value: '', label: `${t('all')} ${t('audit_col_action').toLowerCase()}` },
            { value: 'CREATE', label: 'CREATE' },
            { value: 'UPDATE', label: 'UPDATE' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'LOGIN', label: 'LOGIN' },
            { value: 'CANCEL', label: 'CANCEL' },
            { value: 'TERMINATE', label: 'TERMINATE' },
          ]}
        />
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        <SearchableSelect
          value={userFilter}
          onChange={v => { setUserFilter(v); setPage(1); }}
          options={[
            { value: '', label: t('audit_search_user') },
            ...usersList.map(u => ({ value: u.full_name, label: u.full_name })),
          ]}
        />
        <div style={{ display: 'flex', gap: 0 }}>
          <input placeholder={t('audit_search_input')} value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: '8px 0 0 8px', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: 160 }} />
          <button className="btn" style={{ borderRadius: '0 8px 8px 0', height: 36 }} onClick={() => { setSearch(searchInput); setPage(1); }}><I.Search size={14} /></button>
        </div>
        {hasFilters && (
          <button className="btn ghost" onClick={() => { setEntityType(''); setAction(''); setFromDate(''); setToDate(''); setSearch(''); setSearchInput(''); setUserFilter(''); setPage(1); }} style={{ height: 36, fontSize: 13 }}>
            <I.X size={13} /> {t('audit_clear_btn')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('audit_col_time')}</th>
                <th>{t('audit_col_user')}</th>
                <th>{t('audit_col_action')}</th>
                <th>{t('audit_col_entity')}</th>
                <th>{t('audit_name_col')}</th>
                <th>{t('audit_col_details')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 18, color: 'var(--muted)' }}>{loadError || t('audit_not_found')}</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
                  <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 12.5 }}>{(r.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                  <td style={{ fontSize: 13 }}>{r.user_full_name || `#${r.user_id || '—'}`}</td>
                  <td>{actionChip(r.action)}</td>
                  <td><span className="chip">{r.entity_type || '—'}</span></td>
                  <td style={{ fontSize: 13 }}>{r.entity_label || (r.entity_id ? `#${r.entity_id}` : '—')}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 14px' }}>‹ {t('prev')}</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{page} / {totalPages}</span>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 14px' }}>{t('next')} ›</button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDetail(null)}>
          <div className="card" style={{ width: 560, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{t('audit_title')} #{detail.id}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDetail(null)}><I.X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                [t('audit_detail_date'), (detail.created_at || '').slice(0, 19).replace('T', ' ')],
                [t('audit_detail_user'), detail.user_full_name || `#${detail.user_id}`],
                [t('audit_detail_action'), detail.action],
                [t('audit_detail_entity_type'), detail.entity_type],
                [t('audit_detail_entity_id'), detail.entity_id],
                [t('audit_detail_entity_name'), detail.entity_label],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13.5 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            {detail.description && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>{t('audit_detail_desc')}</div>
                <div style={{ fontSize: 13.5 }}>{detail.description}</div>
              </div>
            )}
            {detail.extra && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 6 }}>{t('audit_detail_extra')}</div>
                <pre style={{ fontSize: 12, background: 'var(--bg)', padding: 10, borderRadius: 8, overflowX: 'auto', margin: 0 }}>{typeof detail.extra === 'string' ? detail.extra : JSON.stringify(detail.extra, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
