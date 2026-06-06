// @ts-nocheck
import React from 'react';
import { Icon } from './icons';
import { MOCK } from './data';
import {
  apiGetStudents, apiGetStudentFullInfo, apiGetStudentTransactions, apiGetStudentGateLogs,
  apiGetGroups, apiCreateStudent, apiDownloadStudentsComprehensiveExport,
  apiGetStudentAttendanceReport, apiUpdateStudent,
  apiDeleteStudent, apiDeleteStudentsBulk, apiHardDeleteStudent,
  apiUploadStudentPhoto, apiUploadStudentPassport, apiUploadStudentExtraFile,
  apiContractPdfUrl, apiGetContractPdf, apiDownloadStudentFile,
} from './api';
import { SearchableGroupSelect, SearchableSelect } from './components';
import { useT } from './lang';

const AVATAR_COLORS = ['#0F1F4D', '#C8202C', '#0E7C5E', '#7B2FBE', '#D97706', '#0284C7'];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function fullName(s) { return `${s.first_name} ${s.last_name}`; }
function normalizeStatus(status) { return String(status || '').toLowerCase(); }

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
                  style={{ minWidth: 32, justifyContent: 'center', ...(page === p ? { background: 'var(--brand-navy)', color: 'white', borderColor: 'var(--brand-navy)' } : {}) }}
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

export function StudentProfile({ studentId, onBack }) {
  const I = Icon;
  const { t } = useT();
  const [info, setInfo] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const [gateLogs, setGateLogs] = React.useState([]);
  const [attendanceReport, setAttendanceReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('overview');
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({});
  const [pdfDownloading, setPdfDownloading] = React.useState(false);
  const [downloadingFile, setDownloadingFile] = React.useState(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [uploadingFile, setUploadingFile] = React.useState(null);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [hardDeleting, setHardDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      apiGetStudentFullInfo(studentId),
      apiGetStudentTransactions(studentId),
      apiGetStudentGateLogs(studentId),
      apiGetStudentAttendanceReport(studentId),
    ]).then(([infoRes, txRes, gateRes, reportRes]) => {
      setInfo(infoRes?.data || null);
      setTransactions(txRes?.data || []);
      setGateLogs(gateRes?.data || []);
      setAttendanceReport(reportRes?.data || null);
      if (infoRes?.data?.student) {
        const s = infoRes.data.student;
        setEditForm({
          first_name: s.first_name || '',
          last_name: s.last_name || '',
          date_of_birth: s.date_of_birth || '',
          height: s.height || '',
          weight: s.weight || '',
          pnfl: s.pnfl || '',
          phone: s.phone || '',
          ampula: s.ampula || 'O(+)',
          millati: s.millati || "O'zbek",
          address: s.address || '',
          group_id: infoRes.data.group?.id || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;
  if (!info) return <div className="empty" style={{ padding: 48 }}>{t('students_not_found')}</div>;

  const s = info.student;
  const group = info.group;
  const coach = info.coach;
  const contract = info.contract;
  const attendances = info.attendances || [];
  const name = fullName(s);
  const age = calcAge(s.date_of_birth);
  const studentStatus = normalizeStatus(s.status);

  const presentCount = attendances.filter(a => a.status === 'present').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;

  return (
    <div>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}><I.ArrowLeft size={14}/> {t('profile_back')}</button>

      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          padding: 22,
          background: 'linear-gradient(135deg, #0F1F4D 0%, #173A78 55%, #1F4C9A 100%)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 36%), radial-gradient(circle at left center, rgba(245,185,33,0.14), transparent 28%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: '1 1 420px' }}>
              <div className="avatar xl" style={{ background: avatarColor(s.id), border: '4px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 30px rgba(0,0,0,0.22)', fontSize: 28 }}>
                {s.first_name[0]}{s.last_name[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  {studentStatus === 'active' && <span className="chip success" style={{ background: 'rgba(30, 138, 92, 0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.12)' }}><span className="chip-dot" style={{ background: '#7EE2B8' }}></span>{t('profile_active_student')}</span>}
                  {studentStatus === 'inactive' && <span className="chip warning" style={{ background: 'rgba(245,185,33,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.12)' }}><span className="chip-dot" style={{ background: '#F5B921' }}></span>{t('status_inactive')}</span>}
                  {studentStatus === 'archived' && <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.12)' }}><span className="chip-dot"></span>{t('status_archived')}</span>}
                  {studentStatus === 'deleted' && <span className="chip danger" style={{ background: 'rgba(200,32,44,0.22)', color: 'white', borderColor: 'rgba(255,255,255,0.16)' }}><span className="chip-dot" style={{ background: '#FF8D95' }}></span>{t('status_deleted')}</span>}
                  {attendances.length > 0 && (
                    <span className="chip navy" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.12)' }}>{t('profile_attendance_label')} {Math.round((presentCount / attendances.length) * 100)}%</span>
                  )}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'white', lineHeight: 1.15 }}>{name}</h1>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.78)', flexWrap: 'wrap' }}>
                  <span>{age} {t('students_years')} ({s.date_of_birth})</span>
                  {group && <><span>·</span><span>{group.name}</span></>}
                  {coach && <><span>·</span><span>{t('profile_coach')}: {coach.full_name}</span></>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn sm" onClick={() => setShowEditModal(true)}><I.Edit size={13}/> {t('edit')}</button>
              {contract && <button className="btn sm" onClick={() => setTab('contract')}><I.FileText size={13}/> {t('profile_contract')}</button>}
              {studentStatus === 'deleted' && <button className="btn sm danger" onClick={() => setShowHardDeleteModal(true)}><I.Trash2 size={13}/> {t('student_full_delete')}</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="tabs">
          {[
            { id: 'overview', labelKey: 'profile_overview' },
            { id: 'attendance', labelKey: 'profile_attendance' },
            { id: 'contract', labelKey: 'profile_contract' },
            { id: 'transactions', labelKey: 'profile_payments' },
            { id: 'files', labelKey: 'profile_files' },
          ].map(tb => (
            <div key={tb.id} className={'tab' + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)}>
              {t(tb.labelKey)}
            </div>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_personal')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {[
                  [t('profile_dob'), s.date_of_birth],
                  [t('profile_nationality'), s.millati || '—'],
                  [t('profile_blood'), s.ampula || '—'],
                  [t('profile_height_weight'), `${s.height} sm · ${s.weight} kg`],
                  [t('profile_pnfl'), s.pnfl],
                  [t('profile_phone'), s.phone || '—'],
                  [t('profile_address'), s.address || '—'],
                  [t('profile_joined'), s.created_at ? s.created_at.slice(0, 10) : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
              {contract?.custom_fields?.customer && (
                <div style={{ marginTop: 22 }}>
                  <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_parent')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    {[
                      [t('profile_col_fullname') || 'To\'liq ismi', contract.custom_fields.customer.full_name || '—', false],
                      [t('profile_upload_passport'), contract.custom_fields.customer.passport_number || '—', false],
                      [t('profile_address'), contract.custom_fields.customer.address || '—', true],
                    ].map(([k, v, span2]) => (
                      <div key={k} style={span2 ? { gridColumn: 'span 2' } : {}}>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{k}</div>
                        <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_stats')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { l: t('profile_total_trainings'), v: String(attendances.length), sub: t('profile_this_season') },
                  { l: t('profile_present_absent'), v: `${presentCount}/${absentCount}`, sub: t('profile_attendance_label') },
                  { l: t('profile_late'), v: String(lateCount), sub: t('profile_last_records') },
                  { l: t('profile_monthly_fee'), v: contract ? `${contract.monthly_fee.toLocaleString()} so'm` : '—', sub: t('profile_contract_label') },
                ].map(it => (
                  <div key={it.l} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{it.l}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.sub}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{it.v}</div>
                  </div>
                ))}
                {attendanceReport && (
                  <div style={{ padding: 12, background: 'rgba(15,31,77,0.08)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('profile_official_report')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>attendance/students/{studentId}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
                      {attendanceReport.total_sessions || 0} sessiya
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted)' }}>
                        {attendanceReport.present_count || 0} / {attendanceReport.absent_count || 0} / {attendanceReport.late_count || 0}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div style={{ padding: 22 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_last_trainings')} {Math.min(attendances.length, 14)} {t('profile_last_trainings_suffix')}</div>
            {attendances.length === 0 && <div className="empty">{t('profile_no_attendance')}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 6 }}>
              {attendances.slice(0, 14).map((a, i) => {
                const color = a.status === 'present' ? 'var(--success)' : a.status === 'absent' ? 'var(--brand-red)' : 'var(--brand-gold)';
                const label = a.status === 'present' ? '✓' : a.status === 'absent' ? '✗' : 'L';
                return (
                  <div key={i} title={a.status} style={{ aspectRatio: '1', borderRadius: 6, background: color, opacity: 0.85, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {label}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 12.5 }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>● {t('profile_present')} {presentCount}</span>
              <span style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>● {t('profile_late_chip')} {lateCount}</span>
              <span style={{ color: 'var(--brand-red)', fontWeight: 600 }}>● {t('profile_absent')} {absentCount}</span>
            </div>
          </div>
        )}

        {tab === 'contract' && (
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_current_contract')}</div>
              {!contract && <div className="empty">{t('profile_contract_not_found')}</div>}
              {contract && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    [t('contracts_number'), contract.contract_number],
                    [t('contracts_status'), <span className="chip success" key="s"><span className="chip-dot"></span>{t('status_active')}</span>],
                    [t('contracts_start_date'), contract.start_date || '—'],
                    [t('contracts_end_date'), contract.end_date || '—'],
                    [t('contracts_monthly_fee'), `${contract.monthly_fee.toLocaleString()} so'm`],
                  ].map(([k, v], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{k}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {contract && (
                  <button className="btn" disabled={pdfDownloading} onClick={async () => {
                    setPdfDownloading(true);
                    try {
                      const blob = await apiGetContractPdf(contract.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `shartnoma-${contract.contract_number || contract.id}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      alert('PDF yuklab bo\'lmadi: ' + err.message);
                    } finally {
                      setPdfDownloading(false);
                    }
                  }}>
                    <I.Download size={14}/> {pdfDownloading ? t('loading') : 'PDF ' + t('download')}
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="card-title" style={{ marginBottom: 14 }}>{t('profile_parent')}</div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, fontSize: 13.5 }}>
                {contract?.custom_fields?.customer ? (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{contract.custom_fields.customer.full_name || '—'}</div>
                    <div style={{ color: 'var(--muted)', marginBottom: 8 }}>{t('profile_upload_passport')}: {contract.custom_fields.customer.passport_number || '—'}</div>
                    <div style={{ color: 'var(--muted)' }}>{contract.custom_fields.customer.address || '—'}</div>
                  </>
                ) : <div className="empty">{t('not_found')}</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div style={{ padding: 22 }}>
            {transactions.length === 0 && <div className="empty">{t('profile_no_payments')}</div>}
            {transactions.length > 0 && (
              <table className="table" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                <thead>
                  <tr><th>{t('profile_tx_date_time')}</th><th>{t('profile_tx_source')}</th><th>Oylar</th><th style={{ textAlign: 'right' }}>{t('profile_tx_amount')}</th><th>{t('profile_tx_status')}</th></tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{tx.paid_at ? tx.paid_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td><span className="chip">{tx.source}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{tx.payment_months?.join(', ') || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{tx.amount.toLocaleString()} so'm</td>
                      <td>
                        {tx.status === 'SETTLED' && <span className="chip success"><span className="chip-dot"></span>{t('tx_st_success')}</span>}
                        {tx.status === 'UNASSIGNED' && <span className="chip warning"><span className="chip-dot"></span>{t('tx_scope_unassigned')}</span>}
                        {tx.status === 'CANCELLED' && <span className="chip"><span className="chip-dot"></span>{t('tx_st_cancelled')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* tab === 'gatelogs' && (
          <div style={{ padding: 22 }}>
            {gateLogs.length === 0 && <div className="empty">{t('profile_no_gate')}</div>}
            {gateLogs.slice(0, 30).map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: log.allowed ? 'var(--success-soft)' : 'var(--accent-soft)',
                  color: log.allowed ? 'var(--success)' : 'var(--brand-red)' }}>
                  {log.allowed ? <I.Check size={15}/> : <I.X size={15}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{log.allowed ? t('profile_gate_entry') : t('profile_gate_exit')}</div>
                  {log.reason && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{log.reason}</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {log.gate_timestamp ? log.gate_timestamp.slice(0, 16).replace('T', ' ') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) */}

        {tab === 'files' && (
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { name: t('file_photo_label'), urlKey: 'photo_url', icon: 'Camera', apiKey: 'photo', accept: 'image/*', uploadFn: apiUploadStudentPhoto },
              { name: t('file_passport_label'), urlKey: 'passport_url', icon: 'File', apiKey: 'passport', accept: 'image/*,.pdf', uploadFn: apiUploadStudentPassport },
              { name: t('file_extra_label'), urlKey: 'extra_file_url', icon: 'FileText', apiKey: 'extra_file', accept: '*', uploadFn: apiUploadStudentExtraFile },
            ].map((f) => {
              const Ic = I[f.icon];
              const url = s[f.urlKey];
              const uploading = uploadingFile === f.apiKey;
              return (
                <div key={f.apiKey} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: url ? 'var(--success-soft)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: url ? 'var(--success)' : 'var(--muted)', flexShrink: 0 }}>
                      <Ic size={20}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{url ? t('file_available') : t('file_missing')}</div>
                    </div>
                    {url && (
                      <button className="icon-btn" style={{ width: 30, height: 30 }} disabled={downloadingFile === f.apiKey} title={t('download_btn')}
                        onClick={async () => {
                          setDownloadingFile(f.apiKey);
                          try {
                            const { blob, filename } = await apiDownloadStudentFile(url);
                            const dlUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = dlUrl;
                            a.download = filename || f.name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(dlUrl);
                          } catch (err) {
                            alert(err.message);
                          } finally {
                            setDownloadingFile(null);
                          }
                        }}>
                        {downloadingFile === f.apiKey ? <span style={{ fontSize: 10, fontWeight: 700 }}>...</span> : <I.Download size={13}/>}
                      </button>
                    )}
                  </div>
                  <label className="btn ghost sm" style={{ cursor: uploading ? 'not-allowed' : 'pointer', justifyContent: 'center', opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? t('loading') : <><I.Upload size={13}/> {url ? t('reupload_btn') : t('upload_btn')}</>}
                    <input type="file" style={{ display: 'none' }} accept={f.accept} disabled={uploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingFile(f.apiKey);
                      try {
                        const fd = new FormData();
                        fd.append(f.apiKey, file);
                        await f.uploadFn(studentId, fd);
                        const infoRes = await apiGetStudentFullInfo(studentId);
                        setInfo(infoRes?.data || null);
                      } catch (err) {
                        alert(err.message);
                      } finally {
                        setUploadingFile(null);
                        e.target.value = '';
                      }
                    }}/>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showHardDeleteModal && info && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }} onClick={() => !hardDeleting && setShowHardDeleteModal(false)}>
          <div style={{
            background: 'var(--bg)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: 460, width: '100%', padding: 24
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,32,44,0.12)', color: 'var(--brand-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.Trash2 size={20}/></div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{t('student_full_delete_confirm_title')}</div>
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55, marginBottom: 20 }}>
              {t('student_full_delete_confirm_desc')}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowHardDeleteModal(false)} disabled={hardDeleting}>{t('cancel')}</button>
              <button className="btn danger" onClick={async () => {
                setHardDeleting(true);
                try {
                  await apiHardDeleteStudent(studentId);
                  setShowHardDeleteModal(false);
                  onBack?.();
                } catch (e) {
                  alert(e.message);
                } finally {
                  setHardDeleting(false);
                }
              }} disabled={hardDeleting}>{hardDeleting ? t('deleting') : t('student_full_delete')}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && info && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }} onClick={() => !editLoading && setShowEditModal(false)}>
          <div style={{
            background: 'var(--bg)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: 500, width: '100%', padding: 24, maxHeight: '90vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{t('edit')} — {t('students_title')}</div>
            {editError && <div style={{ background: 'var(--brand-red-soft)', color: 'var(--brand-red)', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{editError}</div>}
            <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
              {[
                [t('student_new_first_name'), 'first_name'],
                [t('student_new_last_name'), 'last_name'],
                [t('profile_dob'), 'date_of_birth'],
                [t('field_height'), 'height'],
                [t('field_weight'), 'weight'],
                [t('profile_pnfl'), 'pnfl'],
                [t('profile_phone'), 'phone'],
                [t('profile_address'), 'address'],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>{label}</label>
                  <input
                    type={field === 'date_of_birth' ? 'date' : field === 'height' || field === 'weight' ? 'number' : 'text'}
                    value={editForm[field] || ''}
                    onChange={(e) => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                    disabled={editLoading}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>{t('profile_blood')}</label>
                <SearchableSelect
                  value={editForm.ampula || 'O(+)'}
                  onChange={v => setEditForm(p => ({ ...p, ampula: v }))}
                  options={['O(+)', 'O(-)', 'A(+)', 'A(-)', 'B(+)', 'B(-)', 'AB(+)', 'AB(-)'].map(v => ({ value: v, label: v }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowEditModal(false)} disabled={editLoading}>{t('cancel')}</button>
              <button className="btn primary" onClick={async () => {
                setEditError('');
                if (!editForm.first_name || !editForm.last_name || !editForm.date_of_birth || !editForm.pnfl) {
                  setEditError(t('required_student_fields'));
                  return;
                }
                setEditLoading(true);
                try {
                  const fd = new FormData();
                  ['first_name', 'last_name', 'date_of_birth', 'height', 'weight', 'pnfl', 'phone', 'ampula', 'millati', 'address'].forEach(k => {
                    if (editForm[k]) fd.append(k, editForm[k]);
                  });
                  await apiUpdateStudent(studentId, fd);
                  setShowEditModal(false);
                  setLoading(true);
                  const infoRes = await apiGetStudentFullInfo(studentId);
                  setInfo(infoRes?.data || null);
                  setEditForm({
                    first_name: infoRes.data.student.first_name,
                    last_name: infoRes.data.student.last_name,
                    date_of_birth: infoRes.data.student.date_of_birth,
                    height: infoRes.data.student.height,
                    weight: infoRes.data.student.weight,
                    pnfl: infoRes.data.student.pnfl,
                    phone: infoRes.data.student.phone,
                    ampula: infoRes.data.student.ampula,
                    millati: infoRes.data.student.millati,
                    address: infoRes.data.student.address,
                  });
                  setLoading(false);
                } catch (e) {
                  setEditError(e.message);
                } finally {
                  setEditLoading(false);
                }
              }} disabled={editLoading}>{editLoading ? t('saving') : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentNew({ onBack, onCreated, onViewContract }) {
  const I = Icon;
  const { t } = useT();
  const [groups, setGroups] = React.useState([]);
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showSuccessCard, setShowSuccessCard] = React.useState(false);
  const [createdStudentId, setCreatedStudentId] = React.useState(null);
  const [createdContractId, setCreatedContractId] = React.useState(null);
  const [viewingContract, setViewingContract] = React.useState(false);
  const steps = [t('step1_label'), t('step2_label'), t('step3_label')];

  const [form, setForm] = React.useState({
    first_name: '', last_name: '', date_of_birth: '', height: '', weight: '',
    pnfl: '', phone: '', ampula: 'O(+)', millati: "O'zbek", address: '', group_id: '',
    customer_full_name: '', customer_passport_number: '', customer_address: '',
    monthly_fee_amount: '500000', uniform_fee_amount: '',
    contract_start_date: new Date().toISOString().slice(0, 10),
    contract_end_date: new Date().getFullYear() + '-12-31',
  });
  const [files, setFiles] = React.useState({ photo: null, passport: null, extra_file: null });

  function setF(field, value) { setForm(p => ({ ...p, [field]: value })); }

  React.useEffect(() => {
    apiGetGroups({ page_size: 100 }).then(res => setGroups(res?.data || [])).catch(() => {});
  }, []);

  async function handleSubmit() {
    setError('');
    if (!form.first_name || !form.last_name || !form.date_of_birth || !form.height || !form.weight || !form.pnfl) {
      setError(t('required_student_create_fields'));
      return;
    }
    if (!form.customer_full_name || !form.customer_passport_number || !form.customer_address || !form.monthly_fee_amount) {
      setError(t('required_contract_fields'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const studentFields = ['first_name', 'last_name', 'date_of_birth', 'height', 'weight', 'pnfl', 'phone', 'ampula', 'millati', 'address', 'group_id'];
      studentFields.forEach(k => { if (form[k]) fd.append(k, k === 'pnfl' ? String(form[k]) : form[k]); });
      const contractFields = ['customer_full_name', 'customer_passport_number', 'customer_address', 'monthly_fee_amount', 'uniform_fee_amount', 'contract_start_date', 'contract_end_date'];
      contractFields.forEach(k => { if (form[k]) fd.append(k, form[k]); });
      if (files.photo) fd.append('photo', files.photo);
      if (files.passport) fd.append('passport', files.passport);
      if (files.extra_file) fd.append('extra_file', files.extra_file);
      const result = await apiCreateStudent(fd);
      setShowSuccessCard(true);
      const newStudentId = result?.data?.id || result?.data?.student?.id || result?.id || result?.student?.id;
      if (newStudentId) {
        setCreatedStudentId(newStudentId);
        try {
          const fullInfo = await apiGetStudentFullInfo(newStudentId);
          const contractId = fullInfo?.data?.contract?.id || fullInfo?.data?.contracts?.[0]?.id;
          setCreatedContractId(contractId || null);
        } catch { setCreatedContractId(null); }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}><I.ArrowLeft size={14}/> {t('back_btn')}</button>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('new_student_title')}</h1>
          <div className="page-sub">{t('new_student_sub')} · POST /students</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 6 }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} onClick={() => setStep(n)} style={{ flex: 1, padding: '10px 14px', borderRadius: 6, background: active ? 'var(--selected)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? 'var(--success)' : active ? 'var(--brand-navy)' : 'var(--surface-2)', color: done || active ? 'white' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {done ? <I.Check size={14}/> : n}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{t('step_label')} {n}</div>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 24 }}>
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="field"><label>{t('field_first_name')} <span className="req">*</span></label><input value={form.first_name} onChange={e => setF('first_name', e.target.value)} placeholder="Ali"/></div>
              <div className="field"><label>{t('field_last_name')} <span className="req">*</span></label><input value={form.last_name} onChange={e => setF('last_name', e.target.value)} placeholder="Karimov"/></div>
              <div className="field"><label>{t('field_birth_date')} <span className="req">*</span></label><input type="date" value={form.date_of_birth} onChange={e => setF('date_of_birth', e.target.value)}/></div>
              <div className="field"><label>{t('field_height')} <span className="req">*</span></label><input type="number" value={form.height} onChange={e => setF('height', e.target.value)} placeholder="140"/></div>
              <div className="field"><label>{t('field_weight')} <span className="req">*</span></label><input type="number" value={form.weight} onChange={e => setF('weight', e.target.value)} placeholder="35"/></div>
              <div className="field"><label>{t('field_pnfl')} <span className="req">*</span></label><input value={form.pnfl} onChange={e => setF('pnfl', e.target.value)} placeholder={t('pnfl_placeholder')}/></div>
              <div className="field"><label>{t('field_phone')}</label><input value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+998 90 123 45 67"/></div>
              <div className="field"><label>{t('field_blood')}</label>
                <SearchableSelect
                  value={form.ampula || 'O(+)'}
                  onChange={v => setF('ampula', v)}
                  options={['O(+)', 'O(-)', 'A(+)', 'A(-)', 'B(+)', 'B(-)', 'AB(+)', 'AB(-)'].map(v => ({ value: v, label: v }))}
                />
              </div>
              <div className="field"><label>{t('field_nationality')}</label><input value={form.millati} onChange={e => setF('millati', e.target.value)} placeholder="O'zbek"/></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>{t('field_address')}</label><input value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Toshkent sh., Chilonzor t."/></div>
              <div className="field"><label>{t('field_group2')}</label>
                <SearchableGroupSelect value={form.group_id} onChange={v => setF('group_id', v)} groups={groups} placeholder="Tanlanmagan" />
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>{t('field_customer_name')} <span className="req">*</span></label><input value={form.customer_full_name} onChange={e => setF('customer_full_name', e.target.value)} placeholder="Karimov Ravshan Akmalovich"/></div>
              <div className="field"><label>{t('field_passport_num')} <span className="req">*</span></label><input value={form.customer_passport_number} onChange={e => setF('customer_passport_number', e.target.value)} placeholder="AB 1234567"/></div>
              <div className="field"><label>{t('field_address')} <span className="req">*</span></label><input value={form.customer_address} onChange={e => setF('customer_address', e.target.value)} placeholder="Toshkent sh., Chilonzor t."/></div>
              <div className="field"><label>{t('field_monthly_fee')} <span className="req">*</span></label><input type="number" value={form.monthly_fee_amount} onChange={e => setF('monthly_fee_amount', e.target.value)} placeholder="500000"/></div>
              <div className="field"><label>{t('field_uniform_fee')}</label><input type="number" value={form.uniform_fee_amount} onChange={e => setF('uniform_fee_amount', e.target.value)} placeholder="0"/></div>
              <div className="field"><label>{t('field_contract_start')}</label><input type="date" value={form.contract_start_date} onChange={e => setF('contract_start_date', e.target.value)}/></div>
              <div className="field"><label>{t('field_contract_end')}</label><input type="date" value={form.contract_end_date} onChange={e => setF('contract_end_date', e.target.value)}/></div>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[
                { key: 'photo', label: t('file_photo_label'), desc: t('file_photo_desc'), icon: 'Camera' },
                { key: 'passport', label: t('file_passport_label'), desc: t('file_passport_desc'), icon: 'File' },
                { key: 'extra_file', label: t('file_extra_label'), desc: t('file_extra_desc'), icon: 'FileText' },
              ].map(f => {
                const Ic = I[f.icon];
                return (
                  <div key={f.key} className="dropzone" style={{ minHeight: 160 }}>
                    <Ic size={28}/>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{f.label}</div>
                    <div>{files[f.key] ? files[f.key].name : f.desc}</div>
                    <label className="btn sm" style={{ marginTop: 6, cursor: 'pointer' }}>
                      <I.Upload size={13}/> {t('upload_btn')}
                      <input type="file" style={{ display: 'none' }} onChange={e => setFiles(p => ({ ...p, [f.key]: e.target.files[0] || null }))}/>
                    </label>
                  </div>
                );
              })}
              <div style={{ gridColumn: 'span 3', padding: 14, background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <I.Check size={18}/>
                <div>
                  <div style={{ fontWeight: 600 }}>{t('new_student_ready_title')}</div>
                  <div style={{ opacity: 0.85 }}>{t('new_student_ready_desc')}</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--accent-soft)', border: '1px solid var(--brand-red)', borderRadius: 8, fontSize: 13, color: 'var(--brand-red)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <button className="btn ghost" onClick={onBack}>{t('cancel')}</button>
            <div style={{ flex: 1 }}></div>
            {step > 1 && <button className="btn" onClick={() => setStep(step - 1)}><I.ArrowLeft size={14}/> {t('prev')}</button>}
            {step < 3 && <button className="btn primary" onClick={() => setStep(step + 1)}>{t('next')} <I.ArrowRight size={14}/></button>}
            {step === 3 && (
              <button className="btn primary" onClick={handleSubmit} disabled={saving}>
                <I.Check size={14}/> {saving ? t('new_student_creating') : t('new_student_create_btn')}
              </button>
            )}
          </div>
        </div>
      </div>

      {showSuccessCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', padding: '40px 36px', maxWidth: 420, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I.Check size={36} color="var(--success)"/>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{t('contract_ready_title')}</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>{t('contract_ready_desc')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {createdContractId && (
                <button className="btn primary" style={{ justifyContent: 'center', width: '100%', padding: '12px 0', fontSize: 14 }}
                  disabled={viewingContract}
                  onClick={async () => {
                    setViewingContract(true);
                    try {
                      const blob = await apiGetContractPdf(createdContractId);
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (err) {
                      alert(t('contract_open_error') + err.message);
                    } finally {
                      setViewingContract(false);
                    }
                  }}>
                  <I.FileText size={15}/> {viewingContract ? t('contract_opening') : t('contract_view_btn')}
                </button>
              )}
              <button className="btn ghost" style={{ justifyContent: 'center', width: '100%', padding: '11px 0', fontSize: 13.5 }}
                onClick={() => onCreated?.()}>
                {t('back_to_students')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
