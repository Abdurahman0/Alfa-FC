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

import { statusChip } from './status-chip';

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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setTerminateModal(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setFeeModal(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setDatesModal(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setEditModal(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 140 }} onClick={() => setStatusModal(false)}>
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

