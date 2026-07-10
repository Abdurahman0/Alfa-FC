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
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', marginBottom: 4, background: active ? 'var(--selected)' : 'transparent', color: active ? 'var(--navy-ink)' : 'var(--text-2)', fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 13 }}>
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

