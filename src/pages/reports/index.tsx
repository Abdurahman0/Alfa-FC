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
            { label: t('rpt_active_students'), value: safeSummary.active_students ?? '—', icon: I.Users, color: 'var(--text)', iconBg: 'var(--surface-2)' },
            { label: t('rpt_today_revenue'), value: safeSummary.today_revenue != null ? `${fmt.format(safeSummary.today_revenue)} so'm` : '—', icon: I.TrendingUp, color: 'var(--success)', iconBg: 'var(--success-soft)' },
            {
              label: t('rpt_debtors_count_lbl'), value: safeSummary.total_debtors ?? '—', icon: I.AlertTriangle, color: 'var(--danger)', iconBg: 'var(--danger-soft)',
              sub: (safeSummary.total_debt ?? safeSummary.total_outstanding ?? safeSummary.outstanding_debt) != null
                ? `${fmt.format(safeSummary.total_debt ?? safeSummary.total_outstanding ?? safeSummary.outstanding_debt)} so'm ${t('rpt_total_debt')}`
                : null,
            },
            { label: t('rpt_today_sessions'), value: safeSummary.today_sessions ?? '—', icon: I.Calendar, color: 'var(--text)', iconBg: 'var(--surface-2)' },
          ].map((item) => (
            <div key={item.label} className="stat">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-label">{item.label}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.iconBg || 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
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
          <div className="grid-4" style={{ marginBottom: 20 }}>
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
                icon: I.AlertTriangle, color: 'var(--danger)',
              },
              {
                label: t('rpt_success_tx'),
                value: txStats?.successful_transactions ?? '—',
                icon: I.Wallet, color: 'var(--text)',
              },
            ].map((item) => (
              <div key={item.label} className="stat">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-label">{item.label}</span>
                  <item.icon size={15} color={item.color} />
                </div>
                <div className="stat-value" style={{ color: item.color, fontSize: 24 }}>{item.value}</div>
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
                  <div className="report-table-scroll">
                    <table className="table compact-report-table">
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
            <div className="grid-cards" style={{ gap: 12 }}>
              {attendanceGroups.map((g) => (
                <div key={g.group_id || g.id} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.group_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {g.total_sessions} {t('nav_sessions').toLowerCase()} · {g.total_students} {t('nav_students').toLowerCase()}
                  </div>
                  <div className="progress">
                    <span style={{ width: `${g.attendance_percentage || g.attendance_rate || 0}%` }} />
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
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
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

