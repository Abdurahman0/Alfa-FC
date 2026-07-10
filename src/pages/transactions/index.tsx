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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDetail(null)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setAssignTxId(null)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setShowManual(false)}>
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

