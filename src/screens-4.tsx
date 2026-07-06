// @ts-nocheck
import React from 'react';
import { Icon } from './icons';
import { SearchableGroupSelect, SearchableSelect } from './components';
import { useT } from './lang';
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
} from './api';

const fmt = new Intl.NumberFormat('uz-UZ');

function Stat({ label, value, sub, tone = 'default', icon: Ic }) {
  const toneStyle = {
    default: { bg: 'var(--surface)', border: 'var(--border)', val: 'var(--text)' },
    success: { bg: 'var(--success-soft)', border: 'transparent', val: 'var(--success)' },
    warning: { bg: 'var(--warning-soft)', border: 'transparent', val: 'var(--warning)' },
    danger: { bg: 'var(--accent-soft)', border: 'transparent', val: 'var(--brand-red)' },
    navy: { bg: 'var(--brand-navy)', border: 'transparent', val: '#FFFFFF' },
  }[tone] || { bg: 'var(--surface)', border: 'var(--border)', val: 'var(--text)' };

  return (
    <div className="stat" style={{ background: toneStyle.bg, borderColor: toneStyle.border }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="stat-label" style={{ color: tone !== 'default' ? toneStyle.val + 'CC' : undefined }}>{label}</div>
        {Ic && <Ic size={15} color={toneStyle.val} />}
      </div>
      <div className="stat-value" style={{ color: toneStyle.val }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function statusChip(status, t = (k) => k) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return <span className="chip success"><span className="chip-dot"></span>{t('status_active')}</span>;
  if (s === 'TERMINATED') return <span className="chip danger"><span className="chip-dot"></span>{t('status_terminated')}</span>;
  if (s === 'EXPIRED') return <span className="chip warning"><span className="chip-dot"></span>{t('status_cancelled')}</span>;
  if (s === 'ARCHIVED') return <span className="chip"><span className="chip-dot"></span>{t('status_archived')}</span>;
  return <span className="chip">{status || '—'}</span>;
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export function ContractsScreen({ onOpenContract, onNavigateToStudent, onToast }) {
  const I = Icon;
  const { t } = useT();
  const [contracts, setContracts] = React.useState([]);
  const [terminated, setTerminated] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [tab, setTab] = React.useState('active');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [terminating, setTerminating] = React.useState(null);
  const [terminateReason, setTerminateReason] = React.useState('');
  const [terminateAt, setTerminateAt] = React.useState('');
  const [terminateModal, setTerminateModal] = React.useState(false);
  const PAGE_SIZE = 10;

  async function loadActive(overrides = {}) {
    setLoading(true);
    try {
      const params = { page: overrides.page ?? page, page_size: PAGE_SIZE };
      if (overrides.query !== undefined ? overrides.query : query) params.search = overrides.query !== undefined ? overrides.query : query;
      if ((overrides.status !== undefined ? overrides.status : statusFilter) !== 'all') params.status = overrides.status !== undefined ? overrides.status : statusFilter;
      const [cRes, sRes] = await Promise.allSettled([
        apiGetContracts(params),
        apiGetContractStats(),
      ]);
      const cData = cRes.status === 'fulfilled' ? cRes.value : null;
      setContracts(cData?.data || []);
      setTotalPages(cData?.meta?.total_pages || 1);
      setTotalCount(cData?.meta?.total || 0);
      setStats(sRes.status === 'fulfilled' ? (sRes.value?.data || null) : null);
    } finally {
      setLoading(false);
    }
  }

  async function loadTerminated(overrides = {}) {
    setLoading(true);
    try {
      const res = await apiGetTerminatedContracts({ page: overrides.page ?? page, page_size: PAGE_SIZE });
      setTerminated(res?.data || []);
      setTotalPages(res?.meta?.total_pages || 1);
      setTotalCount(res?.meta?.total || 0);
    } catch {
      setTerminated([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally { setLoading(false); }
  }

  React.useEffect(() => {
    apiGetContractStats().then(r => setStats(r?.data || null)).catch(() => {});
  }, []);

  React.useEffect(() => {
    setPage(1);
    if (tab === 'terminated') { loadTerminated({ page: 1 }); return; }
    const timer = setTimeout(() => {
      loadActive({ page: 1, query, status: statusFilter });
    }, query ? 400 : 0);
    return () => clearTimeout(timer);
  }, [query, statusFilter, tab]);

  function openTerminate(contract) {
    setTerminating(contract);
    setTerminateReason('');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setTerminateAt(now.toISOString().slice(0, 16));
    setTerminateModal(true);
  }

  async function confirmTerminate() {
    if (!terminating || !terminateReason.trim()) return;
    try {
      await apiTerminateContract(terminating.id, {
        termination_reason: terminateReason,
        terminated_at: terminateAt ? new Date(terminateAt).toISOString() : new Date().toISOString(),
      });
      setTerminateModal(false);
      onToast?.(t('toast_contract_terminated'));
      loadActive({ page: 1 });
    } catch (e) {
      onToast?.(e.message);
    }
  }

  const rows = tab === 'terminated' ? terminated : contracts;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('contracts_title')}</h1>
          <div className="page-sub">{totalCount} ta {t('nav_contracts').toLowerCase()}</div>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 14 }}>
          <Stat label={t('all')} value={stats.total || 0} icon={I.FileText} />
          <Stat label={t('status_active')} value={stats.active || 0} tone="success" icon={I.Check} />
          <Stat label={t('status_terminated')} value={stats.terminated || 0} tone="danger" icon={I.XCircle} />
          <Stat label={t('status_cancelled')} value={stats.expired || 0} tone="warning" icon={I.Clock} />
          <Stat label={t('contracts_total_monthly')} value={`${fmt.format(stats.total_monthly_fee || 0)} so'm`} tone="navy" icon={I.Wallet} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[
          { key: 'active', labelKey: 'status_active' },
          { key: 'terminated', labelKey: 'status_terminated' },
        ].map(tb => (
          <button
            key={tb.key}
            className={`btn${tab === tb.key ? ' primary' : ' ghost'}`}
            style={{ fontSize: 13 }}
            onClick={() => { setPage(1); setTab(tb.key); }}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search" style={{ maxWidth: 320 }}>
            <span className="icon-l"><I.Search size={15} /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('contracts_search')} />
          </div>
          {tab === 'active' && (
            <SearchableSelect
              value={statusFilter}
              onChange={v => setStatusFilter(v)}
              options={[
                { value: 'all', label: t('contracts_all_statuses') },
                { value: 'ACTIVE', label: t('status_active') },
                { value: 'EXPIRED', label: t('status_cancelled') },
                { value: 'ARCHIVED', label: t('status_archived') },
              ]}
            />
          )}
          <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>{rows.length} {t('students_results')}</div>
        </div>

        {loading ? (
          <div className="empty" style={{ padding: 32 }}>{t('loading')}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('contracts_col_number')}</th>
                <th>{t('contracts_col_student')}</th>
                <th>{t('contracts_col_start')} / {t('contracts_col_end')}</th>
                <th>{t('contracts_col_fee')}</th>
                <th>{t('contracts_col_status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 18, color: 'var(--muted)' }}>{t('contracts_not_found')}</td></tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} onClick={() => onOpenContract?.(c.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{c.contract_number}</td>
                  <td onClick={c.student_id ? e => { e.stopPropagation(); onNavigateToStudent?.(c.student_id); } : undefined}
                    style={{ color: 'var(--text-2)', ...(c.student_id && onNavigateToStudent ? { cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--muted)' } : {}) }}>
                    {c.customer_full_name ?? c.custom_fields?.customer?.full_name ?? '—'}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                    {c.contract_start_date ?? c.start_date ?? '—'} <span style={{ color: 'var(--muted)' }}>→</span> {c.contract_end_date ?? c.end_date ?? '—'}
                  </td>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt.format(c.monthly_fee_amount ?? c.monthly_fee ?? 0)} so'm</td>
                  <td>{statusChip(c.status, t)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {c.status === 'ACTIVE' && (
                      <button className="btn ghost sm" style={{ color: 'var(--brand-red)', fontSize: 12 }} onClick={() => openTerminate(c)}>
                        <I.XCircle size={13} /> {t('contracts_terminate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0' }}>
            <button className="btn ghost sm" disabled={page <= 1} onClick={() => {
              const p = page - 1;
              setPage(p);
              if (tab === 'terminated') loadTerminated({ page: p });
              else loadActive({ page: p });
            }}>‹ {t('prev')}</button>
            <span style={{ lineHeight: '30px', fontSize: 13, color: 'var(--muted)' }}>{page} / {totalPages}</span>
            <button className="btn ghost sm" disabled={page >= totalPages} onClick={() => {
              const p = page + 1;
              setPage(p);
              if (tab === 'terminated') loadTerminated({ page: p });
              else loadActive({ page: p });
            }}>{t('next')} ›</button>
          </div>
        )}
      </div>

      {terminateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setTerminateModal(false)}>
          <div className="card" style={{ width: 440, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_terminate_title')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setTerminateModal(false)}><I.X size={15} /></button>
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>{t('nav_contracts')}: <strong>{terminating?.contract_number}</strong></div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>{t('transactions_comment')} *</label>
              <textarea rows={3} value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="" />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('contracts_terminated_at')} *</label>
              <input type="datetime-local" value={terminateAt} onChange={e => setTerminateAt(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setTerminateModal(false)}>{t('cancel')}</button>
              <button className="btn" style={{ background: 'var(--brand-red)', color: '#fff', border: 'none' }} onClick={confirmTerminate} disabled={!terminateReason.trim()}>
                <I.XCircle size={14} /> {t('contracts_terminate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContractView({ contractId, onBack, onToast, onNavigateToStudent }) {
  const I = Icon;
  const { t } = useT();
  const [contract, setContract] = React.useState(null);
  const [student, setStudent] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const [txLoading, setTxLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [regenerating, setRegenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // modals
  const [terminateModal, setTerminateModal] = React.useState(false);
  const [terminateReason, setTerminateReason] = React.useState('');
  const [terminateAt, setTerminateAt] = React.useState('');
  const [feeModal, setFeeModal] = React.useState(false);
  const [newFee, setNewFee] = React.useState('');
  const [datesModal, setDatesModal] = React.useState(false);
  const [datesForm, setDatesForm] = React.useState({ start_date: '', end_date: '' });
  const [editModal, setEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ monthly_fee: '', customer_full_name: '', customer_passport_number: '', customer_address: '' });
  const [statusModal, setStatusModal] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState('');

  async function load() {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await apiGetContract(contractId);
      const c = res?.data || null;
      setContract(c);
      if (c?.student_id) {
        apiGetStudent(c.student_id).then(sr => setStudent(sr?.data || null)).catch(() => {});
        setTxLoading(true);
        apiGetStudentTransactions(c.student_id)
          .then(tr => { const list = tr?.data || (Array.isArray(tr) ? tr : []); setTransactions(list); })
          .catch(() => setTransactions([]))
          .finally(() => setTxLoading(false));
      }
    } catch { }
    finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, [contractId]);

  async function openPdf() {
    try {
      const blob = await apiGetContractPdf(contractId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      alert('PDF ochilmadi: ' + e.message);
    }
  }

  async function regenerate() {
    try {
      setRegenerating(true);
      await apiRegenerateContractPdf(contractId);
      await openPdf();
    } catch (e) {
      alert(e.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function confirmTerminate() {
    if (!terminateReason.trim()) return;
    setSaving(true);
    try {
      await apiTerminateContract(contractId, {
        termination_reason: terminateReason,
        terminated_at: terminateAt ? new Date(terminateAt).toISOString() : new Date().toISOString(),
      });
      setTerminateModal(false);
      onToast?.(t('toast_contract_terminated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally { setSaving(false); }
  }

  async function saveFee() {
    if (!newFee) return;
    setSaving(true);
    try {
      await apiPatchContractMonthlyFee(contractId, { monthly_fee_amount: Number(newFee) });
      setFeeModal(false);
      onToast?.(t('toast_monthly_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally { setSaving(false); }
  }

  async function saveDates() {
    if (!datesForm.start_date || !datesForm.end_date) return;
    setSaving(true);
    try {
      await apiPatchContractDates(contractId, { start_date: datesForm.start_date, end_date: datesForm.end_date });
      setDatesModal(false);
      onToast?.(t('toast_dates_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const body = {
        monthly_fee_amount: Number(editForm.monthly_fee),
        customer_full_name: editForm.customer_full_name,
        customer_passport_number: editForm.customer_passport_number,
        customer_address: editForm.customer_address,
      };
      await apiUpdateContract(contractId, body);
      setEditModal(false);
      onToast?.(t('toast_contract_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally { setSaving(false); }
  }

  async function saveStatus() {
    if (!newStatus) return;
    setSaving(true);
    try {
      await apiPatchContractStatus(contractId, { status: newStatus });
      setStatusModal(false);
      onToast?.(t('toast_status_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;
  if (!contract) return <div className="empty" style={{ padding: 48 }}>{t('contracts_not_found')}</div>;

  const cf = contract.custom_fields || {};
  const cust = cf.customer || {};
  const studentName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : `#${contract.student_id || '—'}`;

  return (
    <div>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}><I.ArrowLeft size={14} /> {t('contracts_title')}</button>
      <div className="page-head">
        <div>
          <h1 className="page-title">{contract.contract_number}</h1>
          <div className="page-sub">{t('contracts_detail_subtitle')}</div>
        </div>
        <div className="page-actions">
          {contract.student_id && onNavigateToStudent && (
            <button className="btn ghost" onClick={() => onNavigateToStudent(contract.student_id)}>
              <I.User size={15} /> {studentName}
            </button>
          )}
          <button className="btn ghost" onClick={() => {
            setEditForm({
              monthly_fee: String(contract.monthly_fee_amount ?? contract.monthly_fee ?? ''),
              customer_full_name: contract.customer_full_name ?? cust.full_name ?? '',
              customer_passport_number: contract.customer_passport_number ?? cust.passport_number ?? '',
              customer_address: contract.customer_address ?? cust.address ?? '',
            });
            setEditModal(true);
          }}>
            <I.Edit size={15} /> {t('edit')}
          </button>
          <button className="btn ghost" onClick={() => {
            setDatesForm({
              start_date: contract.contract_start_date ?? contract.start_date ?? '',
              end_date: contract.contract_end_date ?? contract.end_date ?? '',
            });
            setDatesModal(true);
          }}>
            <I.Calendar size={15} /> {t('contracts_change_dates_btn')}
          </button>
          {contract.status !== 'TERMINATED' && (
            <button className="btn ghost" onClick={() => { setNewStatus(contract.status); setStatusModal(true); }}>
              <I.ShieldOff size={15} /> {t('contracts_change_status_title')}
            </button>
          )}
          {contract.status === 'ACTIVE' && (
            <button className="btn ghost" onClick={() => { setTerminateReason(''); const _n = new Date(); _n.setMinutes(_n.getMinutes() - _n.getTimezoneOffset()); setTerminateAt(_n.toISOString().slice(0, 16)); setTerminateModal(true); }} style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }}>
              <I.XCircle size={15} /> {t('contracts_cancel_modal_title')}
            </button>
          )}
          <button className="btn" onClick={openPdf}><I.FileText size={15} /> {t('contracts_pdf_open_btn')}</button>
          <button className="btn primary" onClick={regenerate} disabled={regenerating}>
            <I.RefreshCw size={15} /> {regenerating ? t('loading') : t('contracts_pdf_regen_btn')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>{t('contracts_info_card')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              [t('contracts_contract_number_label'), contract.contract_number],
              [t('contracts_status'), statusChip(contract.status, t)],
              [t('contracts_student'), studentName],
              [t('contracts_client_label'), cust.full_name || '—'],
              [t('contracts_start_date'), contract.start_date || '—'],
              [t('contracts_end_date'), contract.end_date || '—'],
              [t('contracts_monthly_fee'), `${fmt.format(contract.monthly_fee || 0)} so'm`],
              [t('contracts_contract_year_label'), contract.contract_year || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{k}</div>
                <div style={{ fontSize: 13.5, marginTop: 4, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>{t('contracts_extra_card')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              [t('contracts_passport_label'), cust.passport_number || '—'],
              [t('profile_address'), cust.address || '—'],
              [t('contracts_birth_year_label'), contract.birth_year || '—'],
              [t('contracts_created'), (contract.created_at || '').slice(0, 19).replace('T', ' ') || '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div>
                <div style={{ fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          {contract.termination_reason && (
            <div style={{ marginTop: 10, padding: 10, background: 'var(--accent-soft)', borderRadius: 8, border: '1px solid var(--brand-red)' }}>
              <div style={{ fontSize: 11, color: 'var(--brand-red)', fontWeight: 700 }}>{t('contracts_termination_reason_label')}</div>
              <div style={{ fontSize: 13 }}>{contract.termination_reason}</div>
            </div>
          )}
        </div>
      </div>

      {/* Payments & Debt section */}
      {(() => {
        const successTx = transactions.filter(tx => tx.status === 'success' || tx.status === 'completed');
        const totalPaid = successTx.reduce((s, tx) => s + (tx.amount || 0), 0);
        const months = contract.start_date && contract.end_date
          ? Math.max(1, Math.round((new Date(contract.end_date) - new Date(contract.start_date)) / (1000 * 60 * 60 * 24 * 30.4)))
          : 0;
        const totalExpected = (contract.monthly_fee || 0) * months;
        const debt = Math.max(0, totalExpected - totalPaid);

        const srcLabel = s => ({ cash: t('tx_src_cash'), bank: t('tx_src_bank'), click: 'Click', payme: 'Payme' }[s] || s || '—');
        const stChip = st => {
          if (st === 'success' || st === 'completed') return <span className="chip success"><span className="chip-dot"></span>{t('tx_st_success')}</span>;
          if (st === 'pending') return <span className="chip warning"><span className="chip-dot"></span>{t('tx_st_pending')}</span>;
          if (st === 'cancelled') return <span className="chip danger"><span className="chip-dot"></span>{t('tx_st_cancelled')}</span>;
          return <span className="chip">{st}</span>;
        };

        return (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('tx_st_success')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--success)' }}>{fmt.format(totalPaid)} <span style={{ fontSize: 13, fontWeight: 500 }}>so'm</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{successTx.length} ta to'lov</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('contracts_monthly_fee')} × {months} oy</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{fmt.format(totalExpected)} <span style={{ fontSize: 13, fontWeight: 500 }}>so'm</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t('nav_contracts')} bo'yicha jami</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('rpt_debtors_col_debt') || 'Qarz'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: debt > 0 ? 'var(--brand-red)' : 'var(--success)' }}>
                  {debt > 0 ? fmt.format(debt) : '0'} <span style={{ fontSize: 13, fontWeight: 500 }}>so'm</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{debt > 0 ? "To'lanmagan" : 'Qarz yo\'q'}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                {t('nav_transactions')} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12.5 }}>({transactions.length})</span>
              </div>
              {txLoading ? (
                <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>{t('loading')}</div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>To'lovlar mavjud emas</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('contracts_col_number')}</th>
                      <th>{t('contracts_monthly_fee')}</th>
                      <th>{t('tx_src_label') || 'Manba'}</th>
                      <th>{t('tx_pd_label') || 'Oy'}</th>
                      <th>{t('audit_col_created') || 'Sana'}</th>
                      <th>{t('contracts_col_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--muted)', fontSize: 12.5 }}>#{tx.id}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.format(tx.amount || 0)} so'm</td>
                        <td>{srcLabel(tx.source)}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{tx.payment_month ? `${tx.payment_year || ''}/${String(tx.payment_month).padStart(2,'0')}` : '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{(tx.created_at || '').slice(0, 10) || '—'}</td>
                        <td>{stChip(tx.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })()}

      {/* Terminate modal */}
      {terminateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setTerminateModal(false)}>
          <div className="card" style={{ width: 440, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_cancel_modal_title')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setTerminateModal(false)}><I.X size={15} /></button>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>{t('contracts_cancel_reason_field')}</label>
              <textarea rows={3} value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="" />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('contracts_cancel_date_field')}</label>
              <input type="datetime-local" value={terminateAt} onChange={e => setTerminateAt(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setTerminateModal(false)}>{t('cancel')}</button>
              <button className="btn" style={{ background: 'var(--brand-red)', color: '#fff', border: 'none' }} onClick={confirmTerminate} disabled={saving || !terminateReason.trim()}>
                {saving ? t('loading') : t('contracts_cancel_modal_title')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee modal */}
      {feeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setFeeModal(false)}>
          <div className="card" style={{ width: 380, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_edit_fee')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setFeeModal(false)}><I.X size={15} /></button>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('contracts_new_fee_label')}</label>
              <input type="number" value={newFee} onChange={e => setNewFee(e.target.value)} placeholder="500000" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setFeeModal(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveFee} disabled={saving || !newFee}>
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dates modal */}
      {datesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDatesModal(false)}>
          <div className="card" style={{ width: 400, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_change_dates_btn')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDatesModal(false)}><I.X size={15} /></button>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('contracts_start_date')} *</label>
              <input type="date" value={datesForm.start_date} onChange={e => setDatesForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('contracts_end_date')} *</label>
              <input type="date" value={datesForm.end_date} onChange={e => setDatesForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setDatesModal(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveDates} disabled={saving || !datesForm.start_date || !datesForm.end_date}>
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setEditModal(false)}>
          <div className="card" style={{ width: 460, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_edit_modal_title')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setEditModal(false)}><I.X size={15} /></button>
            </div>
            {[
              [t('contracts_new_fee_label'), 'monthly_fee', 'number', '500000'],
              [t('contracts_client_name_label'), 'customer_full_name', 'text', ''],
              [t('contracts_passport_no_label'), 'customer_passport_number', 'text', 'AA1234567'],
              [t('profile_address'), 'customer_address', 'text', ''],
            ].map(([label, key, type, ph]) => (
              <div className="field" key={key} style={{ marginBottom: 10 }}>
                <label>{label}</label>
                <input type={type} value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button className="btn ghost" onClick={() => setEditModal(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveEdit} disabled={saving}>
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status modal */}
      {statusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setStatusModal(false)}>
          <div className="card" style={{ width: 360, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('contracts_change_status_title')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setStatusModal(false)}><I.X size={15} /></button>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('contracts_new_status_label')}</label>
              <SearchableSelect
                value={newStatus}
                onChange={v => setNewStatus(v)}
                options={[
                  { value: 'ACTIVE', label: `${t('status_active')} (ACTIVE)` },
                  { value: 'EXPIRED', label: `${t('status_cancelled')} (EXPIRED)` },
                  { value: 'ARCHIVED', label: `${t('status_archived')} (ARCHIVED)` },
                ]}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setStatusModal(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveStatus} disabled={saving || !newStatus}>
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gate ────────────────────────────────────────────────────────────────────

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
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} style={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} style={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        <Stat label={t('gate_allowed_chip')} value={allowedCount} tone="success" icon={I.LogIn} />
        <Stat label={t('gate_denied_chip')} value={deniedCount} tone="danger" icon={I.ShieldOff} />
        <Stat label={t('gate_total_page_label')} value={meta.total} icon={I.Users} />
      </div>

      {error && <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 8, fontSize: 13, color: 'var(--brand-red)' }}>{error}</div>}

      {loading ? (
        <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
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
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: l.allowed !== false ? 'var(--success-soft)' : 'var(--accent-soft)', color: l.allowed !== false ? 'var(--success)' : 'var(--brand-red)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
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
                    {(l.gate_timestamp || l.created_at || '').replace('T', ' ').slice(0, 19)}
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

const ALL_PERMS = [
  { code: 'students:view', label: "O'quvchilarni ko'rish" },
  { code: 'students:edit', label: "O'quvchilarni tahrirlash" },
  { code: 'groups:view', label: "Guruhlarni ko'rish" },
  { code: 'groups:edit', label: 'Guruhlarni tahrirlash' },
  { code: 'attendance:coach:mark', label: 'Davomat belgilash' },
  { code: 'attendance:view', label: "Davomatni ko'rish" },
  { code: 'sessions:create', label: 'Sessiya yaratish' },
  { code: 'sessions:manage', label: 'Sessiyalarni boshqarish' },
  { code: 'reports:dashboard:view', label: 'Dashboard' },
  { code: 'reports:attendance:view', label: 'Davomat hisobotlari' },
  { code: 'settings:system:view', label: "Sozlamalarni ko'rish" },
  { code: 'settings:system:edit', label: 'Sozlamalarni tahrirlash' },
  { code: 'roles:manage', label: 'Rollarni boshqarish' },
  { code: 'users:manage', label: 'Foydalanuvchilarni boshqarish' },
  { code: 'gate:logs:view', label: "Darvoza loglarini ko'rish" },
  { code: 'contracts:view', label: "Shartnomalarni ko'rish" },
  { code: 'contracts:edit', label: 'Shartnomalarni tahrirlash' },
  { code: 'finance:transactions:view', label: "To'lovlarni ko'rish" },
  { code: 'finance:transactions:manual', label: "Qo'lda to'lov kiritish" },
  { code: 'finance:transactions:cancel', label: "To'lovni bekor qilish" },
  { code: 'finance:unassigned:view', label: "Biriktirilmagan to'lovlar" },
  { code: 'finance:unassigned:assign', label: "To'lovlarni biriktirish" },
];

const PERM_CATS = {
  students:   "O'quvchilar",
  groups:     'Guruhlar',
  attendance: 'Davomat',
  sessions:   'Sessiyalar',
  reports:    'Hisobotlar',
  settings:   'Sozlamalar',
  roles:      'Rollar',
  users:      'Foydalanuvchilar',
  gate:       'Darvoza',
  contracts:  'Shartnomalar',
  finance:    'Moliya',
};

function getPermGroups(perms) {
  const map = {};
  perms.forEach(p => {
    const cat = p.code.split(':')[0];
    if (!map[cat]) map[cat] = { label: PERM_CATS[cat] || cat, items: [] };
    map[cat].items.push(p);
  });
  return Object.values(map);
}

function PermSelector({ ids, onChange, permissions }) {
  const groups = getPermGroups(permissions);
  return (
    <div style={{ maxHeight: 270, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {groups.map(g => {
        const groupIds = g.items.map(p => p.id);
        const allChecked = groupIds.length > 0 && groupIds.every(id => ids.includes(id));
        const someChecked = groupIds.some(id => ids.includes(id));
        function toggleGroup(e) {
          onChange(e.target.checked ? [...new Set([...ids, ...groupIds])] : ids.filter(id => !groupIds.includes(id)));
        }
        return (
          <div key={g.label}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, padding: '7px 0 3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={toggleGroup} />
              {g.label}
            </label>
            {g.items.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, paddingLeft: 20, paddingBottom: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={ids.includes(p.id)} onChange={e => {
                  onChange(e.target.checked ? [...ids, p.id] : ids.filter(x => x !== p.id));
                }} />
                <span>{p.description}</span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function UsersScreen({ initialView = 'users', onToast } = {}) {
  const I = Icon;
  const { t } = useT();
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [permissions, setPermissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState(initialView);

  // Role form
  const [newRole, setNewRole] = React.useState({ name: '', description: '', permission_ids: [] });
  const [editingRole, setEditingRole] = React.useState(null);

  // User create modal
  const [showCreateUser, setShowCreateUser] = React.useState(false);
  const [userForm, setUserForm] = React.useState({ full_name: '', phone: '', email: '', password: '', status: 'active', is_super_admin: false, role_ids: [] });
  const [savingUser, setSavingUser] = React.useState(false);

  // User edit modal
  const [editingUser, setEditingUser] = React.useState(null);
  const [editUserForm, setEditUserForm] = React.useState({ full_name: '', phone: '', email: '', password: '', status: 'active', role_ids: [] });
  const [savingEditUser, setSavingEditUser] = React.useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  // Menus
  const [openMenuUserId, setOpenMenuUserId] = React.useState(null);
  const [deletingUserId, setDeletingUserId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });

  async function load() {
    setLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.allSettled([
        apiGetUsers({ page_size: 200 }),
        apiGetRoles(),
        apiGetPermissions(),
      ]);
      setUsers(uRes.status === 'fulfilled' ? (uRes.value?.data || []) : []);
      setRoles(rRes.status === 'fulfilled' ? (rRes.value?.data || []) : []);
      setPermissions(pRes.status === 'fulfilled' ? (pRes.value?.data || []) : []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    const closeMenu = () => setOpenMenuUserId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Role CRUD
  async function createRole() {
    if (!newRole.name.trim()) { onToast?.(t('toast_role_name_required')); return; }
    try {
      await apiCreateRole({ name: newRole.name, description: newRole.description, permission_ids: newRole.permission_ids });
      setNewRole({ name: '', description: '', permission_ids: [] });
      onToast?.(t('toast_role_created'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  function openEditRole(role) {
    setEditingRole({
      ...role,
      permission_ids: (role.permissions || []).map(p => p.id),
    });
  }

  async function saveEditRole() {
    if (!editingRole) return;
    try {
      await apiUpdateRole(editingRole.id, { name: editingRole.name, description: editingRole.description, permission_ids: editingRole.permission_ids });
      setEditingRole(null);
      onToast?.(t('toast_role_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  async function removeRole(roleId) {
    if (!confirm(t('delete') + '?')) return;
    try {
      await apiDeleteRole(roleId);
      onToast?.(t('toast_role_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  // User CRUD
  async function deleteUser(userId) {
    if (!confirm(t('delete') + '?')) return;
    setDeletingUserId(userId);
    try {
      await apiDeleteUser(userId);
      setOpenMenuUserId(null);
      setSelectedIds(prev => prev.filter(id => id !== userId));
      onToast?.(t('toast_user_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setDeletingUserId(null);
    }
  }

  async function bulkDeleteUsers() {
    if (selectedIds.length === 0) return;
    if (!confirm(selectedIds.length + ' ' + t('delete') + '?')) return;
    setBulkDeleting(true);
    try {
      await apiDeleteUsersBulk(selectedIds);
      setSelectedIds([]);
      onToast?.(t('toast_user_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  function openEditUser(u) {
    setEditingUser(u);
    setEditUserForm({
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      password: '',
      status: u.status || 'active',
      role_ids: (u.roles || []).map(r => r.id),
    });
    setOpenMenuUserId(null);
  }

  async function saveEditUser() {
    if (!editUserForm.full_name || !editUserForm.phone) { onToast?.(t('toast_required_fields')); return; }
    setSavingEditUser(true);
    try {
      const payload = {
        full_name: editUserForm.full_name,
        phone: editUserForm.phone,
        email: editUserForm.email || undefined,
        status: editUserForm.status,
      };
      if (editUserForm.password) payload.password = editUserForm.password;
      await apiUpdateUser(editingUser.id, payload);
      await apiUpdateUserRoles(editingUser.id, editUserForm.role_ids.map(Number));
      setEditingUser(null);
      onToast?.(t('toast_user_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSavingEditUser(false);
    }
  }

  async function createUser() {
    if (!userForm.full_name || !userForm.phone || !userForm.password) { onToast?.(t('toast_required_fields')); return; }
    setSavingUser(true);
    try {
      const res = await apiCreateUser({
        full_name: userForm.full_name,
        phone: userForm.phone,
        email: userForm.email || undefined,
        password: userForm.password,
        status: userForm.status,
        is_super_admin: userForm.is_super_admin,
      });
      const newUserId = res?.data?.id;
      if (newUserId && userForm.role_ids.length > 0) {
        await apiUpdateUserRoles(newUserId, userForm.role_ids.map(Number));
      }
      setShowCreateUser(false);
      setUserForm({ full_name: '', phone: '', email: '', password: '', status: 'active', is_super_admin: false, role_ids: [] });
      onToast?.(t('toast_user_created'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSavingUser(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const selectableUsers = users.filter(u => !u.is_super_admin);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedIds.includes(u.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableUsers.map(u => u.id));
    }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('users_heading')}</h1>
          <div className="page-sub">{users.length} {t('users_tab_users').toLowerCase()} · {roles.length} {t('users_tab_roles').toLowerCase()}</div>
        </div>
        {tab === 'users' && (
          <div className="page-actions">
            {selectedIds.length > 0 && (
              <button className="btn danger" onClick={bulkDeleteUsers} disabled={bulkDeleting}>
                <I.Trash2 size={14} /> {bulkDeleting ? t('deleting') : `${selectedIds.length} ${t('delete')}`}
              </button>
            )}
            <button className="btn primary" onClick={() => setShowCreateUser(true)}><I.UserPlus size={15} /> {t('users_new')}</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="tabs">
          <div className={'tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>{t('users_tab_users')}</div>
          <div className={'tab' + (tab === 'roles' ? ' active' : '')} onClick={() => setTab('roles')}>{t('users_tab_roles')}</div>
        </div>
      </div>

      {tab === 'users' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title={t('all')} />
                </th>
                <th>{t('users_fio_label')}</th>
                <th>{t('users_phone_email_label')}</th>
                <th>{t('users_col_role')}</th>
                <th>{t('users_col_status')}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={6} style={{ padding: 18, color: 'var(--muted)' }}>{t('users_not_found')}</td></tr>}
              {users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr key={u.id} style={isSelected ? { background: 'var(--brand-blue-dim, rgba(59,130,246,0.07))' } : {}}>
                    <td>
                      {!u.is_super_admin && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u.id)} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      <div>{u.phone || '—'}</div>
                      {u.email && <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{u.email}</div>}
                    </td>
                    <td>
                      {u.is_super_admin
                        ? <span className="chip navy">Super Admin</span>
                        : (u.roles || []).length > 0
                          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(u.roles).map(r => <span key={r.id} className="chip navy">{r.name}</span>)}</div>
                          : <span className="chip">—</span>
                      }
                    </td>
                    <td>{u.status === 'active' ? <span className="chip success">{t('users_active_chip')}</span> : <span className="chip">{t('users_inactive_chip')}</span>}</td>
                    <td style={{ position: 'relative', overflow: 'visible' }}>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuUserId === u.id) {
                          setOpenMenuUserId(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
                          setOpenMenuUserId(u.id);
                        }
                      }}><I.More size={15} /></button>
                      {openMenuUserId === u.id && (
                        <div style={{ position: 'fixed', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: 160, top: menuPos.y, left: menuPos.x }} onClick={e => e.stopPropagation()}>
                          <button style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }} onClick={() => openEditUser(u)}>
                            <I.Edit size={14} /> {t('edit')}
                          </button>
                          {!u.is_super_admin && (
                            <button style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-red)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => deleteUser(u.id)} disabled={deletingUserId === u.id}>
                              <I.Trash2 size={14} /> {deletingUserId === u.id ? t('deleting') : t('delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('users_role_name_col')}</th><th>{t('users_perms_col')}</th><th style={{ width: 72 }}></th></tr></thead>
              <tbody>
                {roles.length === 0 && <tr><td colSpan={3} style={{ padding: 18, color: 'var(--muted)' }}>{t('users_role_no_found')}</td></tr>}
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 1 }}>{r.description}</div>}
                    </td>
                    <td>
                      {(r.permissions || []).length === 0
                        ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(r.permissions || []).slice(0, 5).map(p => (
                              <span key={p.id} style={{ fontSize: 10.5, background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{p.description}</span>
                            ))}
                            {(r.permissions || []).length > 5 && (
                              <span style={{ fontSize: 10.5, color: 'var(--muted)', padding: '1px 2px', alignSelf: 'center' }}>+{(r.permissions || []).length - 5} ta</span>
                            )}
                          </div>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEditRole(r)}><I.Edit size={14} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => removeRole(r.id)}><I.Trash2 size={15} color="var(--brand-red)" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>{t('users_new_role_card')}</div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_name_req')}</label>
              <input value={newRole.name} onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))} placeholder="" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_desc')}</label>
              <input value={newRole.description} onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))} placeholder="" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('users_perms_label')}</div>
            <PermSelector
              ids={newRole.permission_ids}
              onChange={ids => setNewRole(p => ({ ...p, permission_ids: ids }))}
              permissions={permissions}
            />
            <button className="btn primary" style={{ marginTop: 12 }} onClick={createRole}><I.Check size={14} /> {t('save')}</button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setShowCreateUser(false)}>
          <div className="card" style={{ width: 520, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('users_create_user_modal')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setShowCreateUser(false)}><I.X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('users_fio_label')} *</label>
                <input value={userForm.full_name} onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label>{t('profile_phone')} *</label>
                <input value={userForm.phone} onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="+998901234567" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="field">
                <label>{t('users_pwd_label')}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="field">
                <label>{t('users_col_status')}</label>
                <SearchableSelect
                  value={userForm.status}
                  onChange={v => setUserForm(p => ({ ...p, status: v }))}
                  options={[{ value: 'active', label: t('users_active_chip') }, { value: 'inactive', label: t('users_inactive_chip') }]}
                />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('users_role_select_label')}</label>
                <select multiple value={userForm.role_ids} onChange={e => {
                  const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                  setUserForm(p => ({ ...p, role_ids: vals }));
                }} style={{ height: 100 }}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('users_ctrl_hint')}</div>
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={userForm.is_super_admin} onChange={e => setUserForm(p => ({ ...p, is_super_admin: e.target.checked }))} />
                  Super Admin
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setShowCreateUser(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={createUser} disabled={savingUser}>
                {savingUser ? t('saving') : t('users_create_action')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setEditingUser(null)}>
          <div className="card" style={{ width: 520, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('users_edit_user_modal')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setEditingUser(null)}><I.X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('users_fio_label')} *</label>
                <input value={editUserForm.full_name} onChange={e => setEditUserForm(p => ({ ...p, full_name: e.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label>{t('profile_phone')} *</label>
                <input value={editUserForm.phone} onChange={e => setEditUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="+998901234567" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={editUserForm.email} onChange={e => setEditUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="field">
                <label>{t('users_new_pwd_label')}</label>
                <input type="password" value={editUserForm.password} onChange={e => setEditUserForm(p => ({ ...p, password: e.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label>{t('users_col_status')}</label>
                <SearchableSelect
                  value={editUserForm.status}
                  onChange={v => setEditUserForm(p => ({ ...p, status: v }))}
                  options={[{ value: 'active', label: t('users_active_chip') }, { value: 'inactive', label: t('users_inactive_chip') }]}
                />
              </div>
              {!editingUser.is_super_admin && (
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>{t('users_tab_roles')}</label>
                  <select multiple value={editUserForm.role_ids} onChange={e => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    setEditUserForm(p => ({ ...p, role_ids: vals }));
                  }} style={{ height: 100 }}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('users_ctrl_hint')}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setEditingUser(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveEditUser} disabled={savingEditUser}>
                {savingEditUser ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setEditingRole(null)}>
          <div className="card" style={{ width: 500, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('users_edit_role_modal')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setEditingRole(null)}><I.X size={15} /></button>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_name_req')}</label>
              <input value={editingRole.name} onChange={e => setEditingRole(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_desc')}</label>
              <input value={editingRole.description || ''} onChange={e => setEditingRole(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('users_perms_label')}</div>
            <PermSelector
              ids={editingRole.permission_ids}
              onChange={ids => setEditingRole(p => ({ ...p, permission_ids: ids }))}
              permissions={permissions}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setEditingRole(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveEditRole}><I.Check size={14} /> {t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function SettingsScreen({ theme, setTheme } = {}) {
  const I = Icon;
  const { t } = useT();
  const [settings, setSettings] = React.useState({});
  const [rawSettings, setRawSettings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('general');

  // admin / archive
  const [adminYear, setAdminYear] = React.useState(new Date().getFullYear());
  const [archiveStats, setArchiveStats] = React.useState(null);
  const [adminLoading, setAdminLoading] = React.useState(false);

  // backup
  const [backupStatus, setBackupStatus] = React.useState(null);
  const [backupLoading, setBackupLoading] = React.useState(false);
  const [backupRunning, setBackupRunning] = React.useState(false);
  const [backupMsg, setBackupMsg] = React.useState('');

  // import
  const [importFile, setImportFile] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);

  const tabDefs = [
    { id: 'general', label: t('settings_tab_general'), icon: I.Settings },
    { id: 'billing', label: t('settings_tab_billing'), icon: I.CreditCard },
    { id: 'integrations', label: t('settings_tab_integrations'), icon: I.Link },
    { id: 'import', label: t('settings_tab_import'), icon: I.Upload },
    { id: 'backup', label: t('settings_tab_backup'), icon: I.Save },
    { id: 'admin', label: t('settings_tab_archive'), icon: I.Archive },
  ];

  React.useEffect(() => {
    Promise.allSettled([
      apiGetSettings(),
      apiGetSettingsRaw(),
    ]).then(([flatRes, rawRes]) => {
      setSettings(flatRes.status === 'fulfilled' ? (flatRes.value || {}) : {});
      setRawSettings(rawRes.status === 'fulfilled' ? (rawRes.value?.data || []) : []);
    }).finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'backup') return;
    setBackupLoading(true);
    apiGetBackupStatus()
      .then(res => setBackupStatus(res?.data || null))
      .catch(() => setBackupStatus(null))
      .finally(() => setBackupLoading(false));
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab !== 'admin') return;
    setAdminLoading(true);
    apiGetArchiveStats(adminYear)
      .then(res => setArchiveStats(res?.data || null))
      .catch(() => setArchiveStats(null))
      .finally(() => setAdminLoading(false));
  }, [activeTab, adminYear]);

  function setVal(k, v) { setSettings((p) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      await apiUpdateSettings(settings);
      alert(t('toast_settings_saved'));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function runBackup() {
    setBackupRunning(true);
    setBackupMsg('');
    try {
      const res = await apiTriggerManualBackup();
      setBackupMsg(res?.data?.message || t('backup_started'));
      const bRes = await apiGetBackupStatus();
      setBackupStatus(bRes?.data || null);
    } catch (e) {
      setBackupMsg(e.message);
    } finally {
      setBackupRunning(false);
    }
  }

  async function refreshBackupStatus() {
    setBackupLoading(true);
    try {
      const res = await apiGetBackupStatus();
      setBackupStatus(res?.data || null);
    } finally {
      setBackupLoading(false);
    }
  }

  async function archiveYear(action) {
    try {
      const year = Number(adminYear);
      if (!year) return;
      if (action === 'archive') await apiArchiveYear(year);
      else await apiUnarchiveYear(year);
      const aRes = await apiGetArchiveStats(year);
      setArchiveStats(aRes?.data || null);
      alert(action === 'archive' ? t('toast_archived') : t('toast_unarchived'));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await apiImportStudents(fd);
      setImportResult({ ok: true, data: res?.data || res });
    } catch (e) {
      setImportResult({ ok: false, message: e.message });
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  const isSavingTab = ['general', 'billing', 'integrations'].includes(activeTab);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav_settings')}</h1>
          <div className="page-sub">{t('settings_sub')}</div>
        </div>
        <div className="page-actions">
          {isSavingTab && (
            <button className="btn primary" onClick={save} disabled={saving}>
              <I.Save size={15} /> {saving ? t('saving') : t('save')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 10, height: 'fit-content' }}>
          {tabDefs.map((t) => {
            const Ic = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', marginBottom: 4, background: active ? 'var(--selected)' : 'transparent', color: active ? 'var(--brand-navy)' : 'var(--text-2)', fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 13 }}>
                <Ic size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: 20 }}>

          {activeTab === 'general' && (
            <div>
              {rawSettings.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{t('settings_all_settings')}</div>
                  <table className="table">
                    <thead><tr><th>{t('settings_col_key')}</th><th>{t('settings_col_value')}</th><th>{t('settings_col_desc')}</th></tr></thead>
                    <tbody>
                      {rawSettings.map((s) => (
                        <tr key={s.id || s.key}>
                          <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--muted)' }}>{s.key}</td>
                          <td>
                            <input
                              value={settings[s.key] ?? s.value ?? ''}
                              onChange={e => setVal(s.key, e.target.value)}
                              style={{ width: '100%', height: 30, border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
                            />
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>{t('settings_currency')}</label><input value={settings.currency || "so'm"} onChange={(e) => setVal('currency', e.target.value)} /></div>
              <div className="field"><label>{t('settings_default_monthly')}</label><input type="number" value={settings.monthly_fee_default || settings.default_monthly_fee || ''} onChange={(e) => setVal('monthly_fee_default', Number(e.target.value))} /></div>
              <div className="field"><label>{t('settings_late_fee')}</label><input type="number" value={settings.late_fee_percent || ''} onChange={(e) => setVal('late_fee_percent', Number(e.target.value))} /></div>
              <div className="field"><label>{t('settings_report_day')}</label><input type="number" value={settings.report_day || ''} onChange={(e) => setVal('report_day', Number(e.target.value))} /></div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="field"><label>Click merchant id</label><input value={settings.click_merchant_id || ''} onChange={(e) => setVal('click_merchant_id', e.target.value)} /></div>
              <div className="field"><label>Payme merchant id</label><input value={settings.payme_merchant_id || ''} onChange={(e) => setVal('payme_merchant_id', e.target.value)} /></div>
              <div className="field"><label>SMS provider token</label><input value={settings.sms_token || ''} onChange={(e) => setVal('sms_token', e.target.value)} /></div>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{t('settings_import_title')}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                {t('settings_import_desc')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  ['first_name', t('import_col_first_name'), true],
                  ['last_name', t('import_col_last_name'), true],
                  ['date_of_birth', t('import_col_birth_date'), true],
                  ['height', t('import_col_height'), true],
                  ['weight', t('import_col_weight'), true],
                  ['pnfl', t('import_col_pnfl'), true],
                  ['phone', t('import_col_phone'), false],
                  ['address', t('import_col_address'), false],
                  ['ampula', t('import_col_position'), false],
                  ['millati', t('import_col_nationality'), false],
                  ['status', t('import_col_status'), false],
                  ['group_name', t('import_col_group'), false],
                ].map(([key, label, required]) => (
                  <div key={key} style={{ padding: '8px 12px', background: required ? 'var(--success-soft)' : 'var(--surface-2)', borderRadius: 8, border: '1px solid ' + (required ? 'transparent' : 'var(--border)') }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: required ? 'var(--success)' : 'var(--text)' }}>{key}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{label}{required ? ' *' : ''}</div>
                  </div>
                ))}
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>{t('settings_import_file_label')}</label>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }} />
              </div>
              {importFile && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                  {t('settings_import_selected')}: <strong style={{ color: 'var(--text)' }}>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <button className="btn primary" onClick={handleImport} disabled={!importFile || importing}>
                <I.Upload size={14} /> {importing ? t('loading') : t('settings_import_btn')}
              </button>

              {importResult && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: importResult.ok ? 'var(--success-soft)' : 'var(--accent-soft)', border: '1px solid ' + (importResult.ok ? 'var(--success)' : 'var(--brand-red)') }}>
                  {importResult.ok ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 6 }}>{t('settings_import_ok')}</div>
                      {importResult.data && typeof importResult.data === 'object' && (
                        <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                          {importResult.data.created_count != null && <div>{t('settings_import_created')}: <strong>{importResult.data.created_count}</strong></div>}
                          {importResult.data.updated_count != null && <div>{t('settings_import_updated')}: <strong>{importResult.data.updated_count}</strong></div>}
                          {importResult.data.skipped_count != null && <div>{t('settings_import_skipped')}: <strong>{importResult.data.skipped_count}</strong></div>}
                          {importResult.data.errors?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontWeight: 600, color: 'var(--warning)' }}>{t('settings_import_errors')}:</div>
                              {importResult.data.errors.map((e, i) => <div key={i} style={{ fontSize: 12 }}>{e}</div>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--brand-red)', fontWeight: 600 }}>{importResult.message}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'backup' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('settings_backup_title')}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{t('settings_backup_desc')}</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button className="btn primary" onClick={runBackup} disabled={backupRunning}>
                  <I.Save size={14} /> {backupRunning ? t('settings_backup_running') : t('settings_backup_btn')}
                </button>
                <button className="btn ghost" onClick={refreshBackupStatus} disabled={backupLoading}>
                  <I.ArrowRight size={14} /> {t('settings_backup_refresh')}
                </button>
              </div>

              {backupMsg && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 8, fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                  {backupMsg}
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{t('settings_backup_status_title')}</div>

              {backupLoading ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t('loading')}</div>
              ) : backupStatus ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(backupStatus).map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.replace(/_/g, ' ')}</div>
                      <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 600, wordBreak: 'break-all' }}>
                        {typeof v === 'boolean' ? (v ? t('yes') : t('no')) : String(v ?? '—')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  {t('settings_backup_not_found')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t('settings_admin_title')}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>{t('year_label')}</label>
                  <input type="number" value={adminYear} onChange={(e) => setAdminYear(e.target.value)} style={{ width: 120 }} />
                </div>
                <button className="btn" onClick={() => archiveYear('archive')} disabled={adminLoading}>{t('settings_archive_btn')}</button>
                <button className="btn ghost" onClick={() => archiveYear('unarchive')} disabled={adminLoading}>{t('settings_unarchive_btn')}</button>
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{t('settings_archive_stats')}</div>
              {adminLoading ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t('loading')}</div>
              ) : archiveStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(archiveStats).map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.replace(/_/g, ' ')}</div>
                      <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 600 }}>{String(v ?? '—')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  {t('settings_no_data')}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

const MONTH_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
function monthName(n) { return MONTH_UZ[(n - 1) % 12] || `Oy ${n}`; }
function todayDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function TransactionsScreen({ onToast } = {}) {
  const I = Icon;
  const { t } = useT();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [source, setSource] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [scope, setScope] = React.useState('all');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [paymentYear, setPaymentYear] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [stats, setStats] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [deleting, setDeleting] = React.useState(false);

  const [showManual, setShowManual] = React.useState(false);
  const [manualWithProof, setManualWithProof] = React.useState(false);
  const [manualForm, setManualForm] = React.useState({
    contract_number: '', amount: '', payment_months: [], source: 'cash',
    comment: '', payment_year: new Date().getFullYear(), paid_at: todayDateTimeLocal(), proof_file: null,
  });
  const [manualSaving, setManualSaving] = React.useState(false);
  const [manualContractMatches, setManualContractMatches] = React.useState([]);
  const [manualContractLoading, setManualContractLoading] = React.useState(false);
  const [manualContractError, setManualContractError] = React.useState('');

  const [assignTxId, setAssignTxId] = React.useState(null);
  const [assignForm, setAssignForm] = React.useState({ student_id: '', contract_id: '' });
  const [assigning, setAssigning] = React.useState(false);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      let res;
      if (scope === 'unassigned') {
        res = await apiGetUnassignedTransactions({ page, page_size: 50 });
      } else {
        const params = { page, page_size: 50 };
        if (source) params.source = source;
        if (statusFilter) params.status = statusFilter;
        if (fromDate) params.from_date = fromDate + 'T00:00:00';
        if (toDate) params.to_date = toDate + 'T23:59:59';
        if (paymentYear) params.payment_year = Number(paymentYear);
        res = await apiGetTransactionsWithName(params);
      }
      const meta = res?.meta;
      setRows(res?.data || []);
      setTotalPages(meta?.total_pages || 1);
      setTotalCount(meta?.total || 0);
      setSelectedIds([]);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
    apiGetTransactionStats().then(r => setStats(r?.data || null)).catch(() => {});
  }

  React.useEffect(() => { loadData(); }, [scope, source, statusFilter, fromDate, toDate, paymentYear, page]);

  React.useEffect(() => {
    const query = manualForm.contract_number.trim();
    if (!showManual || query.length < 2) {
      setManualContractMatches([]);
      setManualContractError('');
      setManualContractLoading(false);
      return;
    }

    let active = true;
    setManualContractLoading(true);
    setManualContractError('');
    const timer = setTimeout(async () => {
      try {
        const res = await apiGetContracts({ search: query, page_size: 8 });
        if (!active) return;
        const contracts = res?.data || [];
        setManualContractMatches(contracts);
        const exactContract = contracts.find((contract) => String(contract.contract_number || '').toLowerCase() === query.toLowerCase());
        if (exactContract?.monthly_fee) {
          setManualForm((p) => (
            p.contract_number.trim().toLowerCase() === query.toLowerCase()
              ? { ...p, amount: String(exactContract.monthly_fee), paid_at: p.paid_at || todayDateTimeLocal() }
              : p
          ));
        }
      } catch (e) {
        if (!active) return;
        setManualContractMatches([]);
        setManualContractError(e.message || t('contracts_not_found'));
      } finally {
        if (active) setManualContractLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showManual, manualForm.contract_number]);

  async function handleExport() {
    try {
      const blob = await apiDownloadPaymentsExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { alert('Export xatoligi: ' + e.message); }
  }

  async function openDetail(id, rowData = null) {
    setDetailLoading(true);
    setDetail(rowData ? { ...rowData } : { id });
    try {
      const res = await apiGetTransaction(id);
      const tx = res?.data || null;
      if (!tx) { setDetail(null); return; }
      const merged = { ...rowData, ...tx };
      if (tx.contract_id && !merged.contract_number) {
        try {
          const cr = await apiGetContract(tx.contract_id);
          merged.contract_number = cr?.data?.contract_number || null;
        } catch {}
      }
      setDetail(merged);
    } catch (e) { setDetail(null); alert('Tranzaksiya ochilmadi: ' + e.message); }
    finally { setDetailLoading(false); }
  }

  async function handleCancel(id) {
    if (!confirm(t('tx_cancel_action') + '?')) return;
    try {
      await apiCancelTransaction(id);
      setDetail(null); onToast?.(t('toast_tx_cancelled')); loadData();
    } catch (e) { alert(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm(t('delete') + '?')) return;
    try {
      await apiDeleteTransaction(id);
      setDetail(null); onToast?.(t('toast_tx_deleted')); loadData();
    } catch (e) { alert(e.message); }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(selectedIds.length + ' ' + t('delete') + '?')) return;
    setDeleting(true);
    try {
      await apiDeleteTransactionsBulk(selectedIds);
      setSelectedIds([]); onToast?.(t('toast_tx_deleted')); loadData();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  }

  async function handleAssign() {
    if (!assignTxId || !assignForm.student_id || !assignForm.contract_id) return;
    setAssigning(true);
    try {
      await apiAssignTransaction(assignTxId, {
        student_id: Number(assignForm.student_id), contract_id: Number(assignForm.contract_id),
      });
      setAssignTxId(null); setAssignForm({ student_id: '', contract_id: '' });
      onToast?.(t('toast_tx_assigned')); loadData();
    } catch (e) { alert(e.message); }
    finally { setAssigning(false); }
  }

  async function submitManual() {
    if (!manualForm.contract_number || !manualForm.amount || manualForm.payment_months.length === 0) {
      onToast?.(t('toast_tx_required')); return;
    }
    setManualSaving(true);
    try {
      if (manualWithProof && manualForm.proof_file) {
        const fd = new FormData();
        fd.append('contract_number', manualForm.contract_number);
        fd.append('source', manualForm.source);
        fd.append('amount', String(Number(manualForm.amount)));
        fd.append('payment_year', String(manualForm.payment_year));
        fd.append('payment_months', manualForm.payment_months.join(','));
        if (manualForm.comment) fd.append('comment', manualForm.comment);
        if (manualForm.paid_at) fd.append('paid_at', new Date(manualForm.paid_at).toISOString());
        fd.append('proof_file', manualForm.proof_file);
        await apiCreateManualTransactionWithProof(fd);
      } else {
        await apiCreateManualTransaction({
          contract_number: manualForm.contract_number,
          amount: Number(manualForm.amount),
          source: manualForm.source,
          payment_year: manualForm.payment_year,
          payment_months: manualForm.payment_months,
          comment: manualForm.comment || undefined,
          paid_at: manualForm.paid_at ? new Date(manualForm.paid_at).toISOString() : undefined,
        });
      }
      setShowManual(false); setManualWithProof(false);
      setManualForm({ contract_number: '', amount: '', payment_months: [], source: 'cash', comment: '', payment_year: new Date().getFullYear(), paid_at: todayDateTimeLocal(), proof_file: null });
      onToast?.(t('toast_tx_added')); loadData();
    } catch (e) { onToast?.(e.message); }
    finally { setManualSaving(false); }
  }

  function sourceLabel(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'cash') return t('tx_src_cash');
    if (s === 'click') return 'Click';
    if (s === 'payme') return 'Payme';
    if (s === 'bank') return t('tx_src_bank');
    return String(v || '—');
  }

  function statusLabel(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'success') return { cls: 'success', text: t('tx_st_success') };
    if (s === 'pending') return { cls: 'warning', text: t('tx_st_pending') };
    if (s === 'cancelled' || s === 'failed') return { cls: 'danger', text: t('tx_st_cancelled') };
    return { cls: '', text: v || '—' };
  }

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const pageTotal = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const colCount = scope === 'unassigned' ? 8 : 7;

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('transactions_title')}</h1>
          <div className="page-sub">{totalCount} ta {t('nav_transactions').toLowerCase()} · {fmt.format(pageTotal)} so'm</div>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => { setManualForm(p => ({ ...p, paid_at: p.paid_at || todayDateTimeLocal() })); setShowManual(true); }}><I.Plus size={15} /> {t('add')}</button>
          {selectedIds.length > 0 && (
            <button className="btn ghost" style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }} onClick={handleBulkDelete} disabled={deleting}>
              <I.Trash2 size={15} /> {t('delete')} ({selectedIds.length})
            </button>
          )}
          <button className="btn" onClick={handleExport}><I.Download size={15} /> {t('export')}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchableSelect
          value={scope}
          onChange={v => { setScope(v); setPage(1); }}
          options={[{ value: 'all', label: t('tx_scope_all') }, { value: 'unassigned', label: t('tx_scope_unassigned') }]}
        />
        <SearchableSelect
          value={source}
          onChange={v => { setSource(v); setPage(1); }}
          options={[
            { value: '', label: t('tx_src_all') },
            { value: 'cash', label: t('tx_src_cash') },
            { value: 'click', label: 'Click' },
            { value: 'payme', label: 'Payme' },
            { value: 'bank', label: t('tx_src_bank') },
          ]}
        />
        <SearchableSelect
          value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: '', label: t('tx_st_all') },
            { value: 'success', label: t('tx_st_success') },
            { value: 'pending', label: t('tx_st_pending') },
            { value: 'cancelled', label: t('tx_st_cancelled') },
          ]}
        />
        <input type="number" placeholder={t('year_label')} value={paymentYear} onChange={e => { setPaymentYear(e.target.value); setPage(1); }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: 80 }} />
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        {(source || statusFilter || fromDate || toDate || paymentYear) && (
          <button className="btn ghost" onClick={() => { setSource(''); setStatusFilter(''); setFromDate(''); setToDate(''); setPaymentYear(''); setPage(1); }} style={{ height: 36, fontSize: 13 }}>
            <I.X size={13} /> {t('clear_filters')}
          </button>
        )}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          <Stat label={t('tx_stat_total_paid')} value={`${fmt.format(stats.total_paid || 0)} so'm`} tone="success" icon={I.Wallet} />
          <Stat label={t('tx_stat_success_count')} value={stats.successful_transactions || 0} tone="navy" icon={I.Check} />
          <Stat label="Click" value={stats.click_transactions || 0} icon={I.CreditCard} />
          <Stat label="Payme" value={stats.payme_transactions || 0} icon={I.CreditCard} />
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36, padding: '0 8px' }}>
                <input type="checkbox" checked={allSelected} onChange={e => setSelectedIds(e.target.checked ? rows.map(r => r.id) : [])} />
              </th>
              <th>{t('transactions_col_date')}</th><th>{t('transactions_col_student')}</th><th>{t('transactions_col_source')}</th><th>{t('tx_months_col')}</th>
              <th style={{ textAlign: 'right' }}>{t('tx_amount_col')}</th><th>{t('transactions_col_status')}</th>
              {scope === 'unassigned' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={colCount} style={{ padding: 18, color: 'var(--muted)' }}>{loadError || t('tx_not_found_msg')}</td></tr>
            )}
            {rows.map(t => {
              const st = statusLabel(t.status);
              const checked = selectedIds.includes(t.id);
              return (
                <tr key={t.id}>
                  <td style={{ padding: '0 8px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checked} onChange={e => setSelectedIds(p => e.target.checked ? [...p, t.id] : p.filter(x => x !== t.id))} />
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', cursor: 'pointer', fontSize: 12.5 }} onClick={() => openDetail(t.id, t)}>{(t.paid_at || t.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => openDetail(t.id, t)}>{t.student_full_name || `#${t.student_id || '—'}`}</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => openDetail(t.id, t)}><span className="chip">{sourceLabel(t.source)}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' }} onClick={() => openDetail(t.id, t)}>{(t.payment_months || []).map(m => monthName(m)).join(', ') || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }} onClick={() => openDetail(t.id, t)}>{fmt.format(t.amount || 0)} so'm</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => openDetail(t.id, t)}><span className={'chip' + (st.cls ? ` ${st.cls}` : '')}>{st.text}</span></td>
                  {scope === 'unassigned' && (
                    <td>
                      <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setAssignTxId(t.id)}>{t('tx_assign_btn')}</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 14px' }}>‹ {t('prev')}</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{page} / {totalPages}</span>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 14px' }}>{t('next')} ›</button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDetail(null)}>
          <div className="card" style={{ width: 560, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('transactions_title')} #{detail.id}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setDetail(null)}><I.X size={15} /></button>
            </div>
            {detailLoading ? (
              <div className="empty" style={{ padding: 24 }}>{t('loading')}</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    [t('tx_amount_col'), `${fmt.format(detail.amount || 0)} so'm`],
                    [t('transactions_col_source'), sourceLabel(detail.source)],
                    [t('transactions_col_status'), statusLabel(detail.status).text],
                    [t('transactions_col_date'), (detail.paid_at || detail.created_at || '').slice(0, 19).replace('T', ' ')],
                    [t('tx_months_col'), (detail.payment_months || []).map(m => monthName(m)).join(', ') || '—'],
                    [t('transactions_col_student'), detail.student_full_name || (detail.student_id ? `#${detail.student_id}` : '—')],
                    [t('transactions_col_contract'), detail.contract_number || (detail.contract_id ? `#${detail.contract_id}` : '—')],
                    [t('tx_py_label'), detail.payment_year || '—'],
                    ['External ID', detail.external_id || '—'],
                    [t('tx_note_label'), detail.comment || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 13.5 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {detail.settlement_document_url && (
                  <div style={{ marginBottom: 10 }}>
                    <a href={detail.settlement_document_url} target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <I.File size={13} /> {t('tx_view_document')}
                    </a>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {detail.status !== 'cancelled' && detail.status !== 'failed' && (
                    <button className="btn ghost" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => handleCancel(detail.id)}>
                      <I.XCircle size={14} /> {t('tx_cancel_action')}
                    </button>
                  )}
                  <button className="btn ghost" style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }} onClick={() => handleDelete(detail.id)}>
                    <I.Trash2 size={14} /> {t('delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignTxId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setAssignTxId(null)}>
          <div className="card" style={{ width: 420, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('tx_assign_modal')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setAssignTxId(null)}><I.X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="field">
                <label>{t('tx_st_id')}</label>
                <input type="number" value={assignForm.student_id} onChange={e => setAssignForm(p => ({ ...p, student_id: e.target.value }))} placeholder={t('tx_st_id')} />
              </div>
              <div className="field">
                <label>{t('tx_ct_id')}</label>
                <input type="number" value={assignForm.contract_id} onChange={e => setAssignForm(p => ({ ...p, contract_id: e.target.value }))} placeholder={t('tx_ct_id')} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setAssignTxId(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleAssign} disabled={assigning}>
                {assigning ? t('tx_doing_assign') : t('tx_assign_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual transaction modal */}
      {showManual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setShowManual(false)}>
          <div className="card" style={{ width: 520, padding: 18, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{t('tx_manual_modal')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setShowManual(false); setManualWithProof(false); }}><I.X size={15} /></button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={manualWithProof} onChange={e => setManualWithProof(e.target.checked)} />
              {t('tx_proof_toggle')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('tx_ct_no_label')}</label>
                <input value={manualForm.contract_number} onChange={e => setManualForm(p => ({ ...p, contract_number: e.target.value }))} placeholder="1-2026" />
                {(manualContractLoading || manualContractError || manualContractMatches.length > 0 || manualForm.contract_number.trim().length >= 2) && (
                  <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    {manualContractLoading && (
                      <div style={{ padding: '9px 10px', fontSize: 12.5, color: 'var(--muted)' }}>{t('tx_contract_searching')}</div>
                    )}
                    {!manualContractLoading && manualContractError && (
                      <div style={{ padding: '9px 10px', fontSize: 12.5, color: 'var(--brand-red)' }}>{manualContractError}</div>
                    )}
                    {!manualContractLoading && !manualContractError && manualContractMatches.length === 0 && manualForm.contract_number.trim().length >= 2 && (
                      <div style={{ padding: '9px 10px', fontSize: 12.5, color: 'var(--muted)' }}>{t('tx_contract_not_found')}</div>
                    )}
                    {!manualContractLoading && manualContractMatches.map((contract) => {
                      const customerName = contract.custom_fields?.customer?.full_name || contract.customer_full_name || '';
                      const studentName = contract.student
                        ? `${contract.student.first_name || ''} ${contract.student.last_name || ''}`.trim()
                        : (contract.student_name || contract.full_name || '');
                      const displayName = studentName || customerName || `${t('student_num_prefix')}${contract.student_id || '-'}`;
                      return (
                        <button
                          key={contract.id}
                          type="button"
                          onClick={() => setManualForm(p => ({
                            ...p,
                            contract_number: contract.contract_number || p.contract_number,
                            amount: String(contract.monthly_fee || ''),
                            paid_at: p.paid_at || todayDateTimeLocal(),
                          }))}
                          style={{
                            width: '100%',
                            border: 0,
                            borderBottom: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text)',
                            padding: '9px 10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>{displayName}</strong>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{contract.contract_number || '-'}</span>
                          </div>
                          <div style={{ marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)' }}>
                            {customerName && studentName && <span>{t('contracts_client_label')}: {customerName}</span>}
                            <span>{t('transactions_col_student')} ID: #{contract.student_id || '-'}</span>
                            <span>{fmt.format(contract.monthly_fee || 0)} so'm</span>
                            <span>{contract.status || '-'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="field">
                <label>{t('tx_sum_label')}</label>
                <input type="number" value={manualForm.amount} onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))} placeholder="500000" />
              </div>
              <div className="field">
                <label>{t('tx_src_label')}</label>
                <SearchableSelect
                  value={manualForm.source}
                  onChange={v => setManualForm(p => ({ ...p, source: v }))}
                  options={[
                    { value: 'cash', label: t('tx_src_cash') },
                    { value: 'click', label: 'Click' },
                    { value: 'payme', label: 'Payme' },
                    { value: 'bank', label: t('tx_src_bank') },
                  ]}
                />
              </div>
              <div className="field">
                <label>{t('tx_py_label')}</label>
                <input type="number" value={manualForm.payment_year} onChange={e => setManualForm(p => ({ ...p, payment_year: Number(e.target.value) }))} />
              </div>
              <div className="field">
                <label>{t('tx_pd_label')}</label>
                <input type="datetime-local" value={manualForm.paid_at} onChange={e => setManualForm(p => ({ ...p, paid_at: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('tx_months_select_label')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border)', background: manualForm.payment_months.includes(m) ? 'var(--accent-soft,rgba(200,32,44,0.1))' : 'var(--surface)', cursor: 'pointer', fontWeight: manualForm.payment_months.includes(m) ? 700 : 400 }}>
                      <input type="checkbox" checked={manualForm.payment_months.includes(m)} onChange={e => setManualForm(p => ({ ...p, payment_months: e.target.checked ? [...p.payment_months, m] : p.payment_months.filter(x => x !== m) }))} style={{ display: 'none' }} />
                      {monthName(m)}
                    </label>
                  ))}
                </div>
                {manualForm.payment_months.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('tx_selected_months')}: {manualForm.payment_months.map(m => monthName(m)).join(', ')}</div>
                )}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('tx_note_label')}</label>
                <input value={manualForm.comment} onChange={e => setManualForm(p => ({ ...p, comment: e.target.value }))} placeholder={t('tx_note_label')} />
              </div>
              {manualWithProof && (
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>{t('tx_proof_label')}</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setManualForm(p => ({ ...p, proof_file: e.target.files?.[0] || null }))} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => { setShowManual(false); setManualWithProof(false); }}>{t('cancel')}</button>
              <button className="btn primary" onClick={submitManual} disabled={manualSaving}>
                {manualSaving ? t('saving') : t('tx_submit_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function ReportsScreen() {
  const I = Icon;
  const { t } = useT();
  const [tab, setTab] = React.useState('dashboard');
  const [summary, setSummary] = React.useState(null);
  const [financeReport, setFinanceReport] = React.useState(null);
  const [txStats, setTxStats] = React.useState(null);
  const [attendanceGroups, setAttendanceGroups] = React.useState([]);
  const [terminatedSummary, setTerminatedSummary] = React.useState(null);
  const [debtors, setDebtors] = React.useState([]);
  const [debtorsLoading, setDebtorsLoading] = React.useState(false);
  const [payers, setPayers] = React.useState([]);
  const [payersLoading, setPayersLoading] = React.useState(false);
  const [payersYear, setPayersYear] = React.useState(new Date().getFullYear());
  const [payersMonth, setPayersMonth] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [financeFrom, setFinanceFrom] = React.useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [financeTo, setFinanceTo] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setLoadError('');
      try {
        const results = await Promise.allSettled([
          apiGetReportsSummary(),
          apiGetFinanceReport({ from_date: financeFrom, to_date: financeTo }),
          apiGetTransactionStats({ from_date: financeFrom, to_date: financeTo }),
          apiGetAttendanceGroupsReport(),
          apiGetReportsTerminatedSummary(),
        ]);

        if (!mounted) return;

        const [s, f, tx, a, t] = results;
        setSummary(s.status === 'fulfilled' ? (s.value || {}) : {});
        setFinanceReport(f.status === 'fulfilled' ? (f.value?.data || null) : null);
        setTxStats(tx.status === 'fulfilled' ? (tx.value?.data || null) : null);
        setAttendanceGroups(a.status === 'fulfilled' ? (a.value?.data || []) : []);
        setTerminatedSummary(t.status === 'fulfilled' ? (t.value?.data || null) : null);

        if (results.every((r) => r.status === 'rejected')) {
          setLoadError('Hisobot API javobi olinmadi');
        } else if (results.some((r) => r.status === 'rejected')) {
          setLoadError("Ba'zi hisobot endpointlari javob bermadi");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [financeFrom, financeTo]);

  React.useEffect(() => {
    if (tab !== 'debtors') return;
    setDebtorsLoading(true);
    apiGetDebtors({ page_size: 100 })
      .then(res => setDebtors(res?.data || []))
      .catch(() => setDebtors([]))
      .finally(() => setDebtorsLoading(false));
  }, [tab]);

  React.useEffect(() => {
    if (tab !== 'payers') return;
    setPayersLoading(true);
    const params = { payment_year: payersYear, page_size: 100 };
    if (payersMonth) params.payment_month = payersMonth;
    apiGetPayers(params)
      .then(res => setPayers(res?.data || []))
      .catch(() => setPayers([]))
      .finally(() => setPayersLoading(false));
  }, [tab, payersYear, payersMonth]);

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  const safeSummary = summary || {};

  async function handleExcel() {
    try {
      const blob = await apiDownloadPaymentsExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      alert('Export xatoligi: ' + e.message);
    }
  }
  async function handleDebtorsExport() {
    try {
      const blob = await apiDownloadDebtors();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debtors-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      alert('Export xatoligi: ' + e.message);
    }
  }

  async function handlePayersExport() {
    try {
      const params = { payment_year: payersYear };
      if (payersMonth) params.payment_month = payersMonth;
      const blob = await apiDownloadPayers(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payers-${payersYear}${payersMonth ? '-' + String(payersMonth).padStart(2, '0') : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      alert('Export xatoligi: ' + e.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav_reports')}</h1>
          <div className="page-sub">{t('rpt_subtitle')}</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={handleDebtorsExport}><I.Download size={15} /> {t('rpt_debtors')}</button>
          <button className="btn" onClick={handleExcel}><I.Download size={15} /> Excel</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="tabs">
          {[
            { id: 'dashboard', label: t('rpt_dashboard') },
            { id: 'finance', label: t('rpt_finance') },
            { id: 'attendance', label: t('rpt_attendance') },
            { id: 'debtors', label: t('rpt_debtors') },
            { id: 'payers', label: t('rpt_payers') },
          ].map(tb => (
            <div key={tb.id} className={'tab' + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)}>{tb.label}</div>
          ))}
        </div>
      </div>

      {loadError && <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--warning-soft)', borderRadius: 8, fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>{loadError}</div>}

      {tab === 'dashboard' && (
        <div className="grid-4" style={{ marginBottom: 16 }}>
          {[
            { label: t('rpt_active_students'), value: safeSummary.active_students ?? '—', icon: I.Users, color: 'var(--text)' },
            { label: t('rpt_today_revenue'), value: safeSummary.today_revenue != null ? `${fmt.format(safeSummary.today_revenue)} so'm` : '—', icon: I.TrendingUp, color: 'var(--success)' },
            {
              label: t('rpt_debtors_count_lbl'), value: safeSummary.total_debtors ?? '—', icon: I.AlertTriangle, color: 'var(--brand-red)',
              sub: (safeSummary.total_debt ?? safeSummary.total_outstanding ?? safeSummary.outstanding_debt) != null
                ? `${fmt.format(safeSummary.total_debt ?? safeSummary.total_outstanding ?? safeSummary.outstanding_debt)} so'm ${t('rpt_total_debt')}`
                : null,
            },
            { label: t('rpt_today_sessions'), value: safeSummary.today_sessions ?? '—', icon: I.Calendar, color: 'var(--text)' },
          ].map((item) => (
            <div key={item.label} className="stat">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-label">{item.label}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                  <item.icon size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: item.color }}>{item.value}</div>
              {item.sub && <div style={{ fontSize: 12, color: item.color, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{item.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'finance' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {[
              {
                label: t('rpt_total_income'),
                value: financeReport ? `${fmt.format(financeReport.total_income ?? financeReport.total_revenue ?? 0)} so'm` : (txStats ? `${fmt.format(txStats.total_paid || 0)} so'm` : '—'),
                icon: I.TrendingUp, color: 'var(--success)',
              },
              {
                label: t('rpt_paid'),
                value: financeReport?.total_paid != null ? `${fmt.format(financeReport.total_paid)} so'm` : (txStats ? `${fmt.format(txStats.total_paid || 0)} so'm` : '—'),
                icon: I.Check, color: 'var(--text)',
              },
              {
                label: t('rpt_total_debt'),
                value: financeReport?.total_debt != null ? `${fmt.format(financeReport.total_debt)} so'm` : '—',
                icon: I.AlertTriangle, color: 'var(--brand-red)',
              },
              {
                label: t('rpt_success_tx'),
                value: txStats?.successful_transactions ?? '—',
                icon: I.Wallet, color: 'var(--text)',
              },
            ].map((item, idx, arr) => (
              <div key={item.label} style={{
                padding: '20px 24px',
                borderRight: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                  <item.icon size={15} color={item.color} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>{t('rpt_from')}</label>
              <input type="date" value={financeFrom} onChange={e => setFinanceFrom(e.target.value)} style={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>{t('rpt_to')}</label>
              <input type="date" value={financeTo} onChange={e => setFinanceTo(e.target.value)} style={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
          </div>

          {financeReport ? (
            <div className="card" style={{ padding: 16 }}>
              {false && financeReport.by_month && Array.isArray(financeReport.by_month) && financeReport.by_month.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>{t('rpt_by_month_title')}</div>
                  <table className="table">
                    <thead><tr><th>{t('rpt_month_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_income_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_expected_col')}</th></tr></thead>
                    <tbody>
                      {financeReport.by_month.map((m, i) => (
                        <tr key={i}>
                          <td>{m.month || m.period}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.format(m.income || m.total_income || m.amount || 0)} so'm</td>
                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt.format(m.expected || 0)} so'm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {financeReport.breakdown && Array.isArray(financeReport.breakdown) && financeReport.breakdown.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>{t('rpt_by_source_title')}</div>
                  <div className="report-table-scroll">
                    <table className="table compact-report-table">
                      <thead><tr><th>{t('rpt_source_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_sum_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_count_col')}</th></tr></thead>
                      <tbody>
                        {financeReport.breakdown.map((b, i) => (
                          <tr key={i}>
                            <td>{b.source || '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.format(b.total_amount || 0)} so'm</td>
                            <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{b.transaction_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {financeReport.by_month && Array.isArray(financeReport.by_month) && financeReport.by_month.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>{t('rpt_by_month_title')}</div>
                  <table className="table">
                    <thead><tr><th>{t('rpt_month_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_income_col')}</th><th style={{ textAlign: 'right' }}>{t('rpt_expected_col')}</th></tr></thead>
                    <tbody>
                      {financeReport.by_month.map((m, i) => (
                        <tr key={i}>
                          <td>{m.month || m.period}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.format(m.income || m.total_income || m.amount || 0)} so'm</td>
                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt.format(m.expected || 0)} so'm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="empty" style={{ padding: 48 }}>{t('rpt_finance_empty')}</div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>{t('rpt_att_groups')}</div>
          {attendanceGroups.length === 0 ? (
            <div className="empty" style={{ padding: 18 }}>{t('rpt_att_not_found')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {attendanceGroups.map((g) => (
                <div key={g.group_id || g.id} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{g.group_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {g.total_sessions} {t('nav_sessions').toLowerCase()} · {g.total_students} {t('nav_students').toLowerCase()}
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${g.attendance_percentage || g.attendance_rate || 0}%`, height: '100%', background: 'var(--brand-navy)' }} />
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 6, fontWeight: 700 }}>{g.attendance_percentage || g.attendance_rate || 0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'debtors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{debtors.length} {t('rpt_debtors_count_sfx')}</div>
            <button className="btn" onClick={handleDebtorsExport}><I.Download size={15} /> Excel export</button>
          </div>
          {debtorsLoading ? (
            <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('rpt_debtors_col_student')}</th>
                    <th>{t('rpt_debtors_col_contract')}</th>
                    <th>{t('rpt_debtors_col_group')}</th>
                    <th>{t('rpt_debtors_col_phone')}</th>
                    <th>{t('rpt_debtors_col_overdue')}</th>
                    <th style={{ textAlign: 'right' }}>{t('rpt_debtors_col_debt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 18, color: 'var(--muted)' }}>{t('rpt_debtors_none')}</td></tr>
                  )}
                  {debtors.map((d, idx) => (
                    <tr key={d.student_id || d.id || idx}>
                      <td style={{ fontWeight: 600 }}>{d.student_name || `#${d.student_id || idx}`}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{d.contract_number || '—'}</td>
                      <td style={{ color: 'var(--text-2)' }}>{d.group_name || '—'}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{d.primary_phone || d.father_phone || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(d.overdue_months || []).map((m, mi) => (
                            <span key={mi} className="chip danger" style={{ fontSize: 11 }}>{m.label}</span>
                          ))}
                          {(!d.overdue_months || d.overdue_months.length === 0) && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand-red)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt.format(d.debt_amount || Math.abs(d.debt || d.balance || 0))} so'm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'payers' && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <SearchableSelect
              value={String(payersYear)}
              onChange={v => setPayersYear(Number(v))}
              options={[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => ({ value: String(y), label: String(y) }))}
              style={{ minWidth: 100 }}
            />
            <SearchableSelect
              value={String(payersMonth)}
              onChange={v => setPayersMonth(v)}
              options={[
                { value: '', label: t('rpt_all_months') },
                ...['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'].map((m, i) => ({ value: String(i + 1), label: m })),
              ]}
              style={{ minWidth: 140 }}
            />
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{payers.length} {t('rpt_payers_count_sfx')}</div>
            <button className="btn" onClick={handlePayersExport}><I.Download size={15} /> Excel export</button>
          </div>
          {payersLoading ? (
            <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('rpt_payers_col_student')}</th>
                    <th>{t('rpt_payers_col_contract')}</th>
                    <th>{t('rpt_payers_col_group')}</th>
                    <th>{t('rpt_payers_col_months')}</th>
                    <th style={{ textAlign: 'right' }}>{t('rpt_payers_col_total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payers.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 18, color: 'var(--muted)' }}>{t('rpt_payers_none')}</td></tr>
                  )}
                  {payers.map((p, idx) => {
                    const MONTH_NAMES = ['','Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
                    return (
                      <tr key={p.student_id || idx}>
                        <td style={{ fontWeight: 600 }}>{p.student_name || `#${p.student_id}`}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{p.contract_number || '—'}</td>
                        <td style={{ color: 'var(--text-2)' }}>{p.group_name || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(p.payment_months || []).map((m, mi) => (
                              <span key={mi} className="chip success" style={{ fontSize: 11 }}>{MONTH_NAMES[m] || m}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt.format(p.total_paid || 0)} so'm
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Waiting List ─────────────────────────────────────────────────────────────

export function WaitingListScreen({ onToast } = {}) {
  const I = Icon;
  const { t } = useT();
  const [rows, setRows] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // filters
  const [groupFilter, setGroupFilter] = React.useState('');
  const [birthYearFilter, setBirthYearFilter] = React.useState('');

  // add/edit modal
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    student_first_name: '', student_last_name: '', birth_year: '',
    father_name: '', father_phone: '', mother_name: '', mother_phone: '',
    group_id: '', priority: 0, notes: '',
  });

  // next in queue
  const [nextLoading, setNextLoading] = React.useState(false);
  const [nextEntry, setNextEntry] = React.useState(null);
  const [showNextModal, setShowNextModal] = React.useState(false);

  async function loadList(overrides = {}) {
    setLoading(true);
    try {
      const params = { page_size: 50, page, ...overrides };
      if (groupFilter) params.group_id = groupFilter;
      if (birthYearFilter) params.birth_year = birthYearFilter;
      const res = await apiGetWaitingList(params);
      setRows(res?.data || []);
      setTotalPages(res?.meta?.total_pages || 1);
      setTotalCount(res?.meta?.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    apiGetGroups({ page_size: 100 }).then(r => setGroups(r?.data || [])).catch(() => {});
  }, []);

  React.useEffect(() => { loadList(); }, [groupFilter, birthYearFilter, page]);

  async function loadNext() {
    if (!groupFilter) { alert(t('group_required_alert')); return; }
    setNextLoading(true);
    try {
      const res = await apiGetWaitingListNext(Number(groupFilter));
      setNextEntry(res?.data || null);
      setShowNextModal(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setNextLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ student_first_name: '', student_last_name: '', birth_year: '', father_name: '', father_phone: '', mother_name: '', mother_phone: '', group_id: groupFilter || '', priority: 0, notes: '' });
    setShowModal(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      student_first_name: r.student_first_name || '', student_last_name: r.student_last_name || '',
      birth_year: r.birth_year || '', father_name: r.father_name || '', father_phone: r.father_phone || '',
      mother_name: r.mother_name || '', mother_phone: r.mother_phone || '',
      group_id: String(r.group_id || ''), priority: r.priority ?? 0, notes: r.notes || '',
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.student_first_name.trim() || !form.student_last_name.trim() || !form.birth_year) {
      onToast?.(t('toast_required'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student_first_name: form.student_first_name.trim(),
        student_last_name: form.student_last_name.trim(),
        birth_year: Number(form.birth_year),
        father_name: form.father_name || undefined,
        father_phone: form.father_phone || undefined,
        mother_name: form.mother_name || undefined,
        mother_phone: form.mother_phone || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
        priority: Number(form.priority || 0),
        notes: form.notes || undefined,
      };
      if (editing) await apiUpdateWaitingList(editing.id, payload);
      else await apiCreateWaitingList(payload);
      onToast?.(editing ? t('toast_candidate_updated') : t('toast_candidate_added'));
      setShowModal(false);
      loadList();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm(t('delete') + '?')) return;
    try {
      await apiDeleteWaitingList(id);
      onToast?.(t('toast_candidate_deleted'));
      loadList();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  const groupMap = React.useMemo(() => {
    const m = {};
    groups.forEach(g => { m[g.id] = g.name; });
    return m;
  }, [groups]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('waiting_title')}</h1>
          <div className="page-sub">{totalCount} {t('wl_candidates_sfx')}</div>
        </div>
        <div className="page-actions">
          {groupFilter && (
            <button className="btn ghost" onClick={loadNext} disabled={nextLoading}>
              <I.Users size={15}/> {nextLoading ? t('loading') : t('wl_next')}
            </button>
          )}
          <button className="btn primary" onClick={openNew}><I.UserPlus size={15} /> {t('waiting_new')}</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchableGroupSelect value={groupFilter} onChange={v => { setGroupFilter(v); setPage(1); }} groups={groups} />
        <input
          type="number" placeholder={t('wl_birth_year')} value={birthYearFilter}
          onChange={e => { setBirthYearFilter(e.target.value); setPage(1); }}
          style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: 130 }}
        />
        {(groupFilter || birthYearFilter) && (
          <button className="btn sm ghost" onClick={() => { setGroupFilter(''); setBirthYearFilter(''); setPage(1); }}>
            <I.X size={13}/> {t('wl_clear')}
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
                <th>{t('waiting_col_name')}</th>
                <th>{t('wl_parent')}</th>
                <th>{t('wl_birth_year')}</th>
                <th>{t('waiting_col_group')}</th>
                <th>{t('wl_priority')}</th>
                <th>{t('waiting_col_date')}</th>
                <th>{t('wl_notes')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} style={{ padding: 18, color: 'var(--muted)' }}>{t('waiting_not_found')}</td></tr>}
              {rows.map((r) => {
                const p = Number(r.priority || 0);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.student_first_name} {r.student_last_name}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {(r.father_name || r.father_phone) && (
                        <div><span style={{ color: 'var(--muted)' }}>{t('wl_father_name')}:</span> {r.father_name || '—'} {r.father_phone ? `· ${r.father_phone}` : ''}</div>
                      )}
                      {(r.mother_name || r.mother_phone) && (
                        <div><span style={{ color: 'var(--muted)' }}>{t('wl_mother_name')}:</span> {r.mother_name || '—'} {r.mother_phone ? `· ${r.mother_phone}` : ''}</div>
                      )}
                      {!r.father_name && !r.father_phone && !r.mother_name && !r.mother_phone && <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.birth_year || '—'}</td>
                    <td>{groupMap[r.group_id] || (r.group_id ? `#${r.group_id}` : '—')}</td>
                    <td>
                      <span className={'chip' + (p >= 8 ? ' danger' : p >= 4 ? ' warning' : ' success')} style={{ fontSize: 11.5, fontWeight: 700 }}>
                        {p}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {(r.created_at || '').slice(0, 10)}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5, maxWidth: 160 }}>{r.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} title={t('edit')} onClick={() => openEdit(r)}><I.Edit size={13} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--brand-red)' }} title={t('delete')} onClick={() => remove(r.id)}><I.Trash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ {t('prev')}</button>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{page} / {totalPages} · {t('total')}: {totalCount}</span>
              <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('next')} ›</button>
            </div>
          )}
        </div>
      )}

      {/* Next in queue modal */}
      {showNextModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 120 }} onClick={() => setShowNextModal(false)}>
          <div className="card" style={{ width: 460, padding: 24, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>{t('wl_next_modal_title')} — {groupMap[groupFilter] || `${t('nav_groups')} #${groupFilter}`}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setShowNextModal(false)}><I.X size={15}/></button>
            </div>
            {nextEntry ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '12px 14px', background: 'var(--success-soft)', borderRadius: 10, border: '1px solid var(--success)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{nextEntry.student_first_name} {nextEntry.student_last_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{t('wl_birth_year')}: {nextEntry.birth_year || '—'} · {t('wl_priority')}: <strong>{nextEntry.priority ?? 0}</strong></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {nextEntry.father_name && <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{t('wl_father_name').toUpperCase()}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{nextEntry.father_name}</div>{nextEntry.father_phone && <div style={{ fontSize: 12.5, color: 'var(--accent)' }}>{nextEntry.father_phone}</div>}</div>}
                  {nextEntry.mother_name && <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{t('wl_mother_name').toUpperCase()}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{nextEntry.mother_name}</div>{nextEntry.mother_phone && <div style={{ fontSize: 12.5, color: 'var(--accent)' }}>{nextEntry.mother_phone}</div>}</div>}
                </div>
                {nextEntry.notes && <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--muted)' }}>{nextEntry.notes}</div>}
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t('wl_added_date')}: {(nextEntry.created_at || '').slice(0, 10)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn ghost" onClick={() => { setShowNextModal(false); openEdit(nextEntry); }}>
                    <I.Edit size={13}/> {t('edit')}
                  </button>
                  <button className="btn ghost" style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }}
                    onClick={() => { setShowNextModal(false); remove(nextEntry.id); }}>
                    <I.Trash size={13}/> {t('delete')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: 24 }}>{t('wl_empty_queue')}</div>
            )}
          </div>
        </div>
      )}

      {/* Add/edit modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 540, padding: 22, boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? t('wl_edit_candidate') : t('wl_new_candidate')}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setShowModal(false)}><I.X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field"><label>{t('wl_first_name_req')}</label><input value={form.student_first_name} onChange={(e) => setForm((p) => ({ ...p, student_first_name: e.target.value }))} /></div>
              <div className="field"><label>{t('wl_last_name_req')}</label><input value={form.student_last_name} onChange={(e) => setForm((p) => ({ ...p, student_last_name: e.target.value }))} /></div>
              <div className="field"><label>{t('wl_birth_year_req')}</label><input type="number" min={2000} max={2020} value={form.birth_year} onChange={(e) => setForm((p) => ({ ...p, birth_year: e.target.value }))} placeholder="2010" /></div>
              <div className="field"><label>{t('nav_groups')}</label>
                <SearchableGroupSelect value={form.group_id} onChange={v => setForm(p => ({ ...p, group_id: v }))} groups={groups} placeholder={t('all')} />
              </div>
              <div className="field"><label>{t('wl_father_name')}</label><input value={form.father_name} onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))} /></div>
              <div className="field"><label>{t('wl_father_phone')}</label><input value={form.father_phone} onChange={(e) => setForm((p) => ({ ...p, father_phone: e.target.value }))} placeholder="+998..." /></div>
              <div className="field"><label>{t('wl_mother_name')}</label><input value={form.mother_name} onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))} /></div>
              <div className="field"><label>{t('wl_mother_phone')}</label><input value={form.mother_phone} onChange={(e) => setForm((p) => ({ ...p, mother_phone: e.target.value }))} placeholder="+998..." /></div>
              <div className="field"><label>{t('wl_priority_label')}</label><input type="number" min={0} max={100} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>{t('wl_notes_label')}</label><textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn ghost" onClick={() => setShowModal(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={save} disabled={saving}><I.Check size={14} /> {saving ? t('saving') : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDetail(null)}>
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
