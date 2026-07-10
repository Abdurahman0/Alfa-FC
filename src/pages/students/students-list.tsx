// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import {
  apiGetStudents, apiGetStudentFullInfo, apiGetStudentTransactions, apiGetStudentGateLogs,
  apiGetGroups, apiCreateStudent, apiDownloadStudentsComprehensiveExport,
  apiGetStudentAttendanceReport, apiUpdateStudent,
  apiDeleteStudent, apiDeleteStudentsBulk, apiHardDeleteStudent,
  apiUploadStudentPhoto, apiUploadStudentPassport, apiUploadStudentExtraFile,
  apiContractPdfUrl, apiGetContractPdf, apiDownloadStudentFile,
  apiChangeStudentGroup,
} from '@/shared/api';
import { SearchableGroupSelect, SearchableSelect } from '@/shared/ui/controls';
import { useT } from '@/shared/i18n/lang';
import { avatarColor } from '@/shared/lib/avatar';
import { calcAge, fullName, normalizeStatus } from './lib';

export function StudentsList({ onOpen, onNew, onToast }) {
  const I = Icon;
  const { t } = useT();
  const [students, setStudents] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [groupId, setGroupId] = React.useState('');
  const [selected, setSelected] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [openMenuStudentId, setOpenMenuStudentId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });
  const PAGE_SIZE = 10;

  async function loadStudents(overrides = {}) {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (q) params.search = q;
      if (status !== 'all') params.status = status;
      if (groupId) params.group_id = groupId;
      Object.assign(params, overrides);
      const res = await apiGetStudents(params);
      setStudents(res?.data || []);
      setTotalPages(res?.meta?.total_pages || 1);
      setTotalCount(res?.meta?.total || 0);
    } catch {} finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    apiGetGroups({ page_size: 100 }).then(res => setGroups(res?.data || [])).catch(() => {});
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadStudents({ page: 1 }); }, q ? 400 : 0);
    return () => clearTimeout(timer);
  }, [q, status, groupId]);

  React.useEffect(() => { loadStudents(); }, [page]);

  React.useEffect(() => {
    const closeMenu = () => setOpenMenuStudentId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const groupMap = React.useMemo(() => {
    const m = {};
    groups.forEach(g => { m[g.id] = g.name; });
    return m;
  }, [groups]);

  const isDeletedStatusFilter = normalizeStatus(status) === 'deleted';
  const allSelected = students.length > 0 && students.every(s => selected.includes(s.id));

  async function handleDeleteStudent(id) {
    if (!confirm(t('confirm_delete_student'))) return;
    try {
      await apiDeleteStudent(id);
      setSelected(prev => prev.filter(x => x !== id));
      setOpenMenuStudentId(null);
      onToast?.(t('toast_student_deleted'));
      loadStudents();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`${selected.length} ${t('confirm_delete_students')}`)) return;
    setBulkDeleting(true);
    try {
      await apiDeleteStudentsBulk(selected);
      setSelected([]);
      onToast?.(`${selected.length} ${t('toast_students_deleted')}`);
      loadStudents();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await apiDownloadStudentsComprehensiveExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export xatoligi: ' + e.message);
    }
  }

  if (loading && students.length === 0) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('students_title')}</h1>
          <div className="page-sub">{t('students_sub')} {totalCount} {t('students_count')}</div>
        </div>
        <div className="page-actions">
          {selected.length > 0 && !isDeletedStatusFilter && (
            <button className="btn danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <I.Trash2 size={14}/> {bulkDeleting ? t('deleting') : `${selected.length} ${t('delete')}`}
            </button>
          )}
          <button className="btn" onClick={handleExport}><I.Download size={15}/> {t('students_excel_export')}</button>
          <button className="btn primary" onClick={onNew}><I.UserPlus size={15}/> {t('students_new')}</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search" style={{ maxWidth: 320 }}>
            <span className="icon-l"><I.Search size={15}/></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('students_search')}/>
          </div>
          <SearchableSelect
            value={status}
            onChange={v => { setStatus(v); setPage(1); }}
            options={[
              { value: 'all', label: t('students_all_statuses') },
              { value: 'active', label: t('status_active') },
              { value: 'inactive', label: t('status_inactive') },
              { value: 'archived', label: t('status_archived') },
              { value: 'DELETED', label: t('status_deleted') },
            ]}
          />
          <SearchableGroupSelect value={groupId} onChange={v => { setGroupId(v === 'all' ? '' : v); setPage(1); }} groups={groups} placeholder={t('students_all_groups')} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12.5 }}>
            {selected.length > 0 && <span style={{ color: 'var(--text)', fontWeight: 600 }}>{selected.length} {t('students_selected')}</span>}
            {loading && <span>{t('loading')}</span>}
            <span>{totalCount} {t('students_results')}</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36, paddingRight: 0 }}>
                  <input type="checkbox" checked={allSelected} onChange={e => setSelected(e.target.checked ? students.map(s => s.id) : [])}/>
                </th>
                <th>{t('students_col_name')}</th>
                <th>{t('students_col_group')}</th>
                <th>{t('students_col_birth')}</th>
                <th>{t('students_col_phone')}</th>
                <th>{t('students_col_status')}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>{t('students_not_found')}</td></tr>
              )}
              {students.map(s => {
                const name = fullName(s);
                const age = calcAge(s.date_of_birth);
                const grpName = groupMap[s.group_id] || '—';
                return (
                  <tr key={s.id} onClick={() => onOpen(s.id)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(x => x !== s.id))}/>
                    </td>
                    <td>
                      <div className="row-name">
                        <div className="avatar sm" style={{ background: avatarColor(s.id) }}>{s.first_name[0]}{s.last_name[0]}</div>
                        <div className="meta">
                          <span className="name">{name}</span>
                          <span className="sub">#{String(s.id).padStart(4, '0')} · {age} {t('students_years')}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip navy">{grpName}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{s.date_of_birth}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{s.phone || '—'}</td>
                    <td>
                      {normalizeStatus(s.status) === 'active' && <span className="chip success"><span className="chip-dot"></span>{t('status_active')}</span>}
                      {normalizeStatus(s.status) === 'inactive' && <span className="chip warning"><span className="chip-dot"></span>{t('status_inactive')}</span>}
                      {normalizeStatus(s.status) === 'archived' && <span className="chip"><span className="chip-dot"></span>{t('status_archived')}</span>}
                      {normalizeStatus(s.status) === 'deleted' && <span className="chip danger"><span className="chip-dot"></span>{t('status_deleted')}</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                      <button className="icon-btn" style={{ width: 32, height: 32, border: 'none', background: 'transparent' }} onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuStudentId === s.id) {
                          setOpenMenuStudentId(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
                          setOpenMenuStudentId(s.id);
                        }
                      }}><I.More size={16}/></button>
                      {openMenuStudentId === s.id && (
                        <div style={{ position: 'fixed', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: 160, top: menuPos.y, left: menuPos.x }} onClick={e => e.stopPropagation()}>
                          <button style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }} onClick={() => { onOpen(s.id); setOpenMenuStudentId(null); }}>
                            <I.Eye size={14} /> {t('open')}
                          </button>
                          <button style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-red)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => handleDeleteStudent(s.id)}>
                            <I.Trash2 size={14} /> {t('delete')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted)' }}>
          <span>{totalCount === 0 ? '0 natija' : `${(page-1)*PAGE_SIZE+1} — ${Math.min(page*PAGE_SIZE, totalCount)} / ${totalCount}`}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><I.ChevronLeft size={14}/></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = Math.max(1, page - 2) + i;
              if (p > totalPages) return null;
              return (
                <button key={p} className={'btn sm ' + (page === p ? '' : 'ghost')}
                  style={{ minWidth: 32, justifyContent: 'center', ...(page === p ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}) }}
                  onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><I.ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

    </div>
  );
}

