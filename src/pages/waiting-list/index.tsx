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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 120 }} onClick={() => setShowNextModal(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
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

