// @ts-nocheck
import React from 'react';
import { Icon } from './icons';
import { MOCK } from './data';
import {
  apiGetGroups, apiGetHeadCoachGroups, apiGetGroup, apiGetGroupStudents, apiCreateGroup, apiUpdateGroup, apiDeleteGroup, apiDeleteGroupsBulk,
  apiGetSessions, apiGetSessionDetails, apiGetCoachSessionDetails, apiCreateSession,
  apiUpdateSession, apiDeleteSession, apiCreateHeadCoachSessionsBulk,
  apiGetCoaches, apiDownloadGroupStudentsExport, apiDownloadCoachGroupPerformanceTableExport,
  apiMarkAttendance, apiMarkBulkAttendance, apiAddPerformanceTableMatch,
  apiSaveCoachGroupPerformanceTable, apiDeleteCoachPerformanceTableColumn, apiUpdateCoachPerformanceTableColumn,
  apiUploadCoachSessionKonspekt, apiGetCoachMyAttendances,
} from './api';
import { useCoachGroupsQuery, useGroupPerformanceTableQuery } from './features/performance-table/model/use-performance-table';
import { SearchableGroupSelect, SearchableSelect } from './components';
import { useT } from './lang';

const AVATAR_COLORS = ['#0F1F4D', '#C8202C', '#0E7C5E', '#7B2FBE', '#D97706', '#0284C7'];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

function sessionStatus(session_date) {
  const today = new Date().toISOString().slice(0, 10);
  if (session_date === today) return 'today';
  if (session_date > today) return 'upcoming';
  return 'completed';
}

function GroupFormFields({ form, setForm, coaches }) {
  const { t } = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field">
        <label>{t('groups_name_label')} <span className="req">*</span></label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('groups_name_placeholder')} />
      </div>
      <div className="field">
        <label>{t('groups_desc_label')}</label>
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={t('groups_desc_placeholder')} />
      </div>
      <div className="field">
        <label>{t('groups_coach_label')}</label>
        <SearchableSelect
          value={form.coach_id}
          onChange={v => setForm(p => ({ ...p, coach_id: v }))}
          options={[{ value: '', label: t('groups_coach_none') }, ...coaches.map(c => ({ value: String(c.id), label: c.full_name }))]}
        />
      </div>
    </div>
  );
}

export function GroupsScreen({ onOpen, selectedGroupId = null, onCloseGroup, onToast } = {}) {
  const I = Icon;
  const { t } = useT();
  const [groups, setGroups] = React.useState([]);
  const [coaches, setCoaches] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState('cards');
  const [includeArchived, setIncludeArchived] = React.useState(false);

  // new group
  const [showNew, setShowNew] = React.useState(false);
  const [newGroup, setNewGroup] = React.useState({ name: '', description: '', coach_id: '' });
  const [saving, setSaving] = React.useState(false);

  // edit group
  const [editingGroup, setEditingGroup] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ name: '', description: '', coach_id: '' });

  // bulk select
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  // group detail
  const [groupDetail, setGroupDetail] = React.useState(null);
  const [groupStudents, setGroupStudents] = React.useState([]);
  const [groupLoading, setGroupLoading] = React.useState(false);

  // context menu (list view)
  const [openMenuGroupId, setOpenMenuGroupId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });

  async function loadData() {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        apiGetGroups({ page_size: 100, include_archived: includeArchived }),
        apiGetCoaches(),
      ]);
      setGroups(gRes?.data || []);
      setCoaches(cRes?.data || []);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadData(); }, [includeArchived]);

  React.useEffect(() => {
    const closeMenu = () => setOpenMenuGroupId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  React.useEffect(() => {
    if (!selectedGroupId) { setGroupDetail(null); setGroupStudents([]); return; }
    setGroupLoading(true);
    Promise.all([apiGetGroup(selectedGroupId), apiGetGroupStudents(selectedGroupId)])
      .then(([gRes, sRes]) => {
        setGroupDetail(gRes?.data || null);
        setGroupStudents(sRes?.data || []);
      })
      .catch(() => {})
      .finally(() => setGroupLoading(false));
  }, [selectedGroupId]);

  const coachMap = React.useMemo(() => {
    const m = {};
    coaches.forEach(c => { m[c.id] = c.full_name; });
    return m;
  }, [coaches]);

  async function handleCreateGroup() {
    if (!newGroup.name.trim()) return;
    setSaving(true);
    try {
      await apiCreateGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
        coach_id: newGroup.coach_id ? Number(newGroup.coach_id) : undefined,
      });
      setShowNew(false);
      setNewGroup({ name: '', description: '', coach_id: '' });
      onToast?.(`"${newGroup.name.trim()}" ${t('toast_group_added')}`);
      await loadData();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(g) {
    setEditingGroup(g);
    setEditForm({ name: g.name || '', description: g.description || '', coach_id: String(g.coach_id || '') });
    setOpenMenuGroupId(null);
  }

  async function handleEditGroup() {
    if (!editForm.name.trim() || !editingGroup) return;
    setSaving(true);
    try {
      await apiUpdateGroup(editingGroup.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        coach_id: editForm.coach_id ? Number(editForm.coach_id) : undefined,
      });
      setEditingGroup(null);
      onToast?.(t('toast_group_updated'));
      await loadData();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(g) {
    if (!window.confirm(`"${g.name}" ${t('confirm_delete_group')}`)) return;
    try {
      await apiDeleteGroup(g.id);
      setOpenMenuGroupId(null);
      onToast?.(`"${g.name}" ${t('toast_group_deleted')}`);
      await loadData();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} ${t('confirm_delete_groups')}`)) return;
    setBulkDeleting(true);
    try {
      await apiDeleteGroupsBulk(selectedIds);
      setSelectedIds([]);
      await loadData();
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    setSelectedIds(prev => prev.length === groups.length ? [] : groups.map(g => g.id));
  }

  async function handleExport(groupId) {
    try {
      const blob = await apiDownloadGroupStudentsExport(groupId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guruh-${groupId}-export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  const selectedGroup = groupDetail || groups.find(g => g.id === selectedGroupId) || null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('groups_title')}</h1>
          <div className="page-sub">{groups.length} {t('groups_sub')}</div>
        </div>
        <div className="page-actions">
          {selectedIds.length > 0 && (
            <button className="btn ghost" style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }} onClick={handleBulkDelete} disabled={bulkDeleting}>
              <I.Trash size={14}/> {bulkDeleting ? t('deleting') : `${selectedIds.length} ${t('delete')}`}
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
            {t('groups_archived')}
          </label>
          <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
            <button className={'btn sm ' + (view === 'cards' ? '' : 'ghost')} style={{ height: 30, border: 'none', background: view === 'cards' ? 'var(--selected)' : 'transparent' }} onClick={() => setView('cards')}>{t('groups_cards')}</button>
            <button className={'btn sm ' + (view === 'list' ? '' : 'ghost')} style={{ height: 30, border: 'none', background: view === 'list' ? 'var(--selected)' : 'transparent' }} onClick={() => setView('list')}>{t('groups_list')}</button>
          </div>
          <button className="btn primary" onClick={() => setShowNew(true)}><I.Plus size={15}/> {t('groups_new')}</button>
        </div>
      </div>

      {/* Group detail modal */}
      {selectedGroup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'grid', placeItems: 'center', background: 'rgba(11,20,38,0.5)' }} onClick={() => onCloseGroup?.()}>
          <div className="card" style={{ position: 'relative', width: 640, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column', gap: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className="chip success"><span className="chip-dot"></span>{t('groups_active')}</span>
                  <span className="chip navy">{groupStudents.length} {t('groups_students_count')}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedGroup.name}</h2>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>{selectedGroup.description || t('groups_no_desc')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn ghost sm" onClick={() => { onCloseGroup?.(); openEdit(selectedGroup); }}>
                  <I.Edit size={13}/> {t('edit')}
                </button>
                <button className="btn ghost sm" onClick={() => handleExport(selectedGroup.id)}>
                  <I.Download size={13}/> {t('export')}
                </button>
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => onCloseGroup?.()}>
                  <I.X size={16}/>
                </button>
              </div>
            </div>

            {groupLoading ? (
              <div className="empty" style={{ padding: 20 }}>{t('loading')}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <StatCard label={t('groups_coach_label2')} value={selectedGroup.coach_name || coachMap[selectedGroup.coach_id] || '—'} />
                <StatCard label={t('groups_capacity')} value={selectedGroup.capacity ?? '—'} />
                <StatCard label={t('groups_active_students')} value={selectedGroup.active_students_count ?? groupStudents.filter(s => s.status === 'active').length} />
                <StatCard label={t('groups_waiting_list')} value={selectedGroup.waiting_list_count ?? '—'} />
              </div>
            )}

            <div>
              <div className="card-title" style={{ marginBottom: 10 }}>{t('groups_members')}</div>
              {groupStudents.length === 0 ? (
                <div className="empty" style={{ padding: 20 }}>{t('groups_no_students')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groupStudents.map((s) => (
                    <div key={s.id} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="avatar sm" style={{ background: avatarColor(s.id) }}>{s.first_name?.[0]}{s.last_name?.[0]}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.phone || t('groups_no_phone')}</div>
                      </div>
                      <span className={'chip' + (s.status === 'active' ? ' success' : '')} style={{ fontSize: 11 }}>
                        {s.status === 'active' ? t('status_active') : s.status || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cards view */}
      {view === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {groups.map(g => {
            const coachName = coachMap[g.coach_id] || '—';
            const count = g.active_students_count ?? 0;
            const isSelected = selectedIds.includes(g.id);
            return (
              <div key={g.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, outline: isSelected ? '2px solid var(--accent)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', flex: 1 }} onClick={() => onOpen && onOpen(g.id)}>
                    <input type="checkbox" checked={isSelected} onClick={e => e.stopPropagation()} onChange={() => toggleSelect(g.id)} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div>
                      {g.description && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.description}</div>}
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: g.description ? 4 : 0 }}>{g.name}</div>
                    </div>
                  </div>
                  <span className="chip success"><span className="chip-dot"></span>{t('status_active')}</span>
                </div>
                {g.coach_id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => onOpen && onOpen(g.id)}>
                    <div className="avatar sm" style={{ background: 'var(--brand-navy)' }}>
                      {coachName.split(' ').map(p => p[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{coachName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('groups_coach_label2')}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)' }}>{t('groups_active_students')}: <strong style={{ color: 'var(--text)' }}>{count}</strong></span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title={t('btn_edit')} onClick={() => openEdit(g)}><I.Edit size={13}/></button>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title="Export" onClick={() => handleExport(g.id)}><I.Download size={13}/></button>
                    <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--brand-red)' }} title={t('btn_delete')} onClick={() => handleDeleteGroup(g)}><I.Trash size={13}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selectedIds.length === groups.length && groups.length > 0} onChange={toggleAll} />
                </th>
                <th>{t('groups_col_group')}</th><th>{t('groups_col_desc')}</th><th>{t('groups_col_coach')}</th><th>{t('groups_col_students')}</th><th>{t('groups_col_waiting')}</th><th>{t('groups_col_status')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const coachName = coachMap[g.coach_id] || '—';
                const isSelected = selectedIds.includes(g.id);
                return (
                  <tr key={g.id} style={{ background: isSelected ? 'var(--selected)' : undefined }}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(g.id)} />
                    </td>
                    <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => onOpen && onOpen(g.id)}>{g.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{g.description || '—'}</td>
                    <td>{coachName}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.active_students_count ?? '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>{g.waiting_list_count ?? '—'}</td>
                    <td><span className="chip success">{t('status_active')}</span></td>
                    <td style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => {
                        if (openMenuGroupId === g.id) { setOpenMenuGroupId(null); return; }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
                        setOpenMenuGroupId(g.id);
                      }}><I.More size={15}/></button>
                      {openMenuGroupId === g.id && (
                        <div style={{ position: 'fixed', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: 160, top: menuPos.y, left: menuPos.x }}>
                          {[
                            { icon: 'Eye', label: t('view'), action: () => { onOpen?.(g.id); setOpenMenuGroupId(null); } },
                            { icon: 'Edit', label: t('edit'), action: () => openEdit(g) },
                            { icon: 'Download', label: t('export'), action: () => { handleExport(g.id); setOpenMenuGroupId(null); } },
                            { icon: 'Trash', label: t('delete'), action: () => { setOpenMenuGroupId(null); handleDeleteGroup(g); }, danger: true },
                          ].map(item => {
                            const Ic = I[item.icon];
                            return (
                              <button key={item.label} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: item.danger ? 'var(--brand-red)' : 'var(--text)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }} onClick={item.action}>
                                <Ic size={14}/> {item.label}
                              </button>
                            );
                          })}
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

      {/* New group modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div className="card" style={{ width: 460, padding: 24, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('groups_new_title')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowNew(false)}><I.X size={16}/></button>
            </div>
            <GroupFormFields form={newGroup} setForm={setNewGroup} coaches={coaches} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowNew(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleCreateGroup} disabled={saving}>
                <I.Check size={14}/> {saving ? t('saving') : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit group modal */}
      {editingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div className="card" style={{ width: 460, padding: 24, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('groups_edit_title')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setEditingGroup(null)}><I.X size={16}/></button>
            </div>
            <GroupFormFields form={editForm} setForm={setEditForm} coaches={coaches} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setEditingGroup(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleEditGroup} disabled={saving}>
                <I.Check size={14}/> {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function SessionsScreen({ onMark }) {
  const I = Icon;
  const { t } = useT();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = React.useState('sessions');
  const [sessions, setSessions] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [selectedDate, setSelectedDate] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [myAttendances, setMyAttendances] = React.useState([]);
  const [attendancesLoading, setAttendancesLoading] = React.useState(false);
  const [attGroupFilter, setAttGroupFilter] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');
  const [openMenuSessionId, setOpenMenuSessionId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });
  const [editingSession, setEditingSession] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ group_id: '', session_date: '', topic: '', start_time: '', end_time: '', station: '', description: '' });
  const [showBulkCreate, setShowBulkCreate] = React.useState(false);
  const [bulkDays, setBulkDays] = React.useState([]);
  const [bulkForm, setBulkForm] = React.useState({ group_id: '', from_date: todayIso, to_date: todayIso, topic: '', start_time: '10:00', end_time: '11:00', station: '' });
  const [savingBulk, setSavingBulk] = React.useState(false);
  const [newSession, setNewSession] = React.useState({
    group_id: '',
    session_date: todayIso,
    topic: '',
    start_time: '10:00',
    end_time: '11:00',
    station: '',
    description: '',
  });

  const today = todayIso;

  React.useEffect(() => {
    setLoading(true);
    const params = {};
    if (groupFilter) params.group_id = groupFilter;
    Promise.all([
      apiGetSessions(params),
      apiGetHeadCoachGroups(),
    ]).then(([sRes, gRes]) => {
      setSessions(sRes?.data || []);
      setGroups(gRes?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [groupFilter]);

  React.useEffect(() => {
    const closeMenu = () => setOpenMenuSessionId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'attendances') return;
    setAttendancesLoading(true);
    const params = {};
    if (attGroupFilter) params.group_id = attGroupFilter;
    apiGetCoachMyAttendances(params)
      .then(r => setMyAttendances(r?.data || []))
      .catch(() => setMyAttendances([]))
      .finally(() => setAttendancesLoading(false));
  }, [activeTab, attGroupFilter]);

  const groupMap = React.useMemo(() => {
    const m = {};
    groups.forEach(g => { m[g.id] = g.name; });
    return m;
  }, [groups]);

  const sessionsWithStatus = sessions.map(s => ({ ...s, _status: sessionStatus(s.session_date) }));

  const list = sessionsWithStatus.filter(s => {
    if (selectedDate && s.session_date !== selectedDate) return false;
    if (filter === 'all') return true;
    if (filter === 'week') {
      const d = new Date(s.session_date);
      const start = new Date(today);
      start.setDate(start.getDate() - 3);
      const end = new Date(today);
      end.setDate(end.getDate() + 3);
      return d >= start && d <= end;
    }
    if (filter === 'today') return s._status === 'today';
    if (filter === 'upcoming') return s._status === 'upcoming';
    if (filter === 'past') return s._status === 'completed';
    return true;
  });

  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: d, iso,
      label: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'][(d.getDay() + 6) % 7],
      num: d.getDate(),
      count: sessions.filter(s => s.session_date === iso).length,
    });
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  function openEditSession(s) {
    setEditingSession(s);
    setEditForm({
      group_id: String(s.group_id || ''),
      session_date: s.session_date || todayIso,
      topic: s.topic || '',
      start_time: s.start_time || '10:00',
      end_time: s.end_time || '11:00',
      station: s.station || '',
      description: s.description || '',
    });
    setOpenMenuSessionId(null);
  }

  async function handleDeleteSession(id) {
    if (!window.confirm(t('confirm_delete_session'))) return;
    try {
      await apiDeleteSession(id);
      const params = {};
      if (groupFilter) params.group_id = groupFilter;
      const sRes = await apiGetSessions(params);
      setSessions(sRes?.data || []);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleEditSession() {
    if (!editingSession || !editForm.topic.trim() || !editForm.session_date) return;
    setSaving(true);
    try {
      await apiUpdateSession(editingSession.id, {
        group_id: Number(editForm.group_id),
        session_date: editForm.session_date,
        topic: editForm.topic.trim(),
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        station: editForm.station.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });
      setEditingSession(null);
      const params = {};
      if (groupFilter) params.group_id = groupFilter;
      const sRes = await apiGetSessions(params);
      setSessions(sRes?.data || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkCreate() {
    if (!bulkForm.group_id || !bulkForm.from_date || !bulkForm.to_date || !bulkForm.topic.trim() || bulkDays.length === 0) {
      alert(t('toast_required'));
      return;
    }
    setSavingBulk(true);
    try {
      await apiCreateHeadCoachSessionsBulk({
        group_id: Number(bulkForm.group_id),
        from_date: bulkForm.from_date,
        to_date: bulkForm.to_date,
        days_of_week: bulkDays.map(Number),
        topic: bulkForm.topic.trim(),
        start_time: bulkForm.start_time,
        end_time: bulkForm.end_time,
        station: bulkForm.station.trim() || undefined,
      });
      setShowBulkCreate(false);
      setBulkDays([]);
      setBulkForm(p => ({ ...p, topic: '', station: '' }));
      const params = {};
      if (groupFilter) params.group_id = groupFilter;
      const sRes = await apiGetSessions(params);
      setSessions(sRes?.data || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingBulk(false);
    }
  }

  async function handleCreateSession() {
    if (!newSession.group_id || !newSession.topic.trim() || !newSession.session_date) {
      alert(t('toast_required'));
      return;
    }
    setSaving(true);
    try {
      await apiCreateSession({
        group_id: Number(newSession.group_id),
        session_date: newSession.session_date,
        topic: newSession.topic.trim(),
        start_time: newSession.start_time,
        end_time: newSession.end_time,
        station: newSession.station.trim() || undefined,
        description: newSession.description.trim() || undefined,
      });
      setShowCreate(false);
      setNewSession((p) => ({ ...p, topic: '', station: '', description: '' }));
      const [sRes] = await Promise.all([apiGetSessions()]);
      setSessions(sRes?.data || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('sessions_title')}</h1>
          <div className="page-sub">{sessions.length} {t('sessions_page_sub')} · {sessions.filter(s => sessionStatus(s.session_date) === 'upcoming').length} {t('sessions_filter_upcoming').toLowerCase()}</div>
        </div>
        <div className="page-actions">
          {activeTab === 'sessions' && (
            <>
              <button className={'btn' + (filter === 'week' ? ' primary' : '')} onClick={() => setFilter('week')}>
                <I.Calendar size={15}/> {t('filter_week')}
              </button>
              <button className="btn ghost" onClick={() => setShowBulkCreate(true)}><I.Plus size={15}/> {t('sessions_tab_bulk')}</button>
              <button className="btn primary" onClick={() => setShowCreate(true)}><I.Plus size={15}/> {t('sessions_new')}</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'sessions', labelKey: 'sessions_tab_sessions' },
          { key: 'attendances', labelKey: 'sessions_tab_attendance' },
        ].map(tb => (
          <button key={tb.key} className={`btn${activeTab === tb.key ? ' primary' : ' ghost'}`} style={{ fontSize: 13 }} onClick={() => setActiveTab(tb.key)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'attendances' && (
        <div>
          <div className="table-wrap">
            <div className="table-toolbar">
              <SearchableGroupSelect value={attGroupFilter} onChange={v => setAttGroupFilter(v)} groups={groups} />
              <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>{myAttendances.length} yozuv</div>
            </div>
            {attendancesLoading ? (
              <div className="empty" style={{ padding: 32 }}>{t('loading')}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>{t('sess_id')}</th><th>{t('student_id')}</th><th>{t('sessions_col_status')}</th><th>{t('transactions_comment')}</th><th>{t('sessions_col_date')}</th></tr>
                </thead>
                <tbody>
                  {myAttendances.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 18, color: 'var(--muted)' }}>{t('sessions_no_sessions')}</td></tr>
                  )}
                  {myAttendances.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>#{a.session_id}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>#{a.student_id}</td>
                      <td>
                        {a.status === 'present' && <span className="chip success"><span className="chip-dot"></span>{t('att_present')}</span>}
                        {a.status === 'absent' && <span className="chip danger"><span className="chip-dot"></span>{t('att_absent')}</span>}
                        {a.status === 'late' && <span className="chip warning"><span className="chip-dot"></span>{t('att_late')}</span>}
                        {!['present','absent','late'].includes(a.status) && <span className="chip">{a.status}</span>}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{a.comment || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'var(--muted)' }}>{(a.created_at || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
      <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <SearchableGroupSelect value={groupFilter} onChange={v => setGroupFilter(v)} groups={groups} />
        {groupFilter && <button className="btn sm ghost" onClick={() => setGroupFilter('')}><I.X size={13}/> {t('clear_filters')}</button>}
      </div>
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div className="week-calendar" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {days.map(d => {
            const isToday = d.iso === today;
            const isSelected = d.iso === selectedDate;
            return (
              <div
                key={d.iso}
                onClick={() => { setSelectedDate(d.iso); setFilter('all'); }}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: isSelected ? '1px solid var(--brand-red)' : '1px solid transparent',
                  background: isSelected ? 'var(--selected)' : isToday ? 'var(--brand-navy)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--text)' : isToday ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, opacity: isSelected ? 0.8 : isToday ? 0.8 : 0.6, fontWeight: 600, textTransform: 'uppercase' }}>{d.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{d.num}</div>
                <div style={{ fontSize: 11, opacity: isSelected ? 0.85 : isToday ? 0.85 : 0.7 }}>{d.count > 0 ? d.count + ' ' + t('session_sfx') : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="filter-buttons" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['today', t('sessions_filter_today')], ['upcoming', t('sessions_filter_upcoming')], ['past', t('sessions_filter_completed')], ['all', t('sessions_filter_all')]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={'btn sm ' + (filter === k ? '' : 'ghost')} style={{ background: filter === k ? 'var(--selected)' : 'transparent' }}>{l}</button>
        ))}
        {selectedDate && (
          <button className="btn sm ghost" onClick={() => setSelectedDate('')}>
            {t('sessions_date_filter')}: {selectedDate} <I.X size={13}/>
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('sessions_col_date')}</th><th>{t('sessions_col_time')}</th><th>{t('sessions_col_topic')}</th><th>{t('sessions_col_group')}</th><th>{t('sessions_col_location')}</th><th>{t('sessions_col_status')}</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan="7">
                  <div className="empty" style={{ padding: 32 }}>
                    {t('sessions_no_sessions')}
                  </div>
                </td>
              </tr>
            )}
            {list.slice(0, 20).map(s => (
              <tr key={s.id} onClick={() => onMark(s.id)}>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.session_date}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.start_time} – {s.end_time}</td>
                <td>{s.topic}</td>
                <td><span className="chip navy">{groupMap[s.group_id] || '—'}</span></td>
                <td style={{ color: 'var(--muted)' }}>{s.station || '—'}</td>
                <td>
                  {s._status === 'completed' && <span className="chip success"><span className="chip-dot"></span>{t('sessions_completed_chip')}</span>}
                  {s._status === 'today' && <span className="chip warning"><span className="chip-dot"></span>{t('sessions_today_chip')}</span>}
                  {s._status === 'upcoming' && <span className="chip"><span className="chip-dot"></span>{t('sessions_upcoming_chip')}</span>}
                </td>
                <td style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => {
                    if (openMenuSessionId === s.id) { setOpenMenuSessionId(null); return; }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
                    setOpenMenuSessionId(s.id);
                  }}><I.More size={15}/></button>
                  {openMenuSessionId === s.id && (
                    <div style={{ position: 'fixed', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: 160, top: menuPos.y, left: menuPos.x }}>
                      {[
                        { icon: 'Calendar', label: t('sessions_mark_attendance'), action: () => { onMark(s.id); setOpenMenuSessionId(null); } },
                        { icon: 'Edit', label: t('edit'), action: () => openEditSession(s) },
                        { icon: 'Trash', label: t('delete'), action: () => { setOpenMenuSessionId(null); handleDeleteSession(s.id); }, danger: true },
                      ].map(item => {
                        const Ic = I[item.icon];
                        return (
                          <button key={item.label} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: item.danger ? 'var(--brand-red)' : 'var(--text)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }} onClick={item.action}>
                            <Ic size={14}/> {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 560, padding: 22, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('sessions_new_title')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowCreate(false)}><I.X size={16}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>{t('sessions_group')} <span className="req">*</span></label>
                <SearchableGroupSelect value={newSession.group_id} onChange={v => setNewSession(p => ({ ...p, group_id: v }))} groups={groups} placeholder={t('groups_coach_none')} />
              </div>
              <div className="field">
                <label>{t('sessions_date')} <span className="req">*</span></label>
                <input type="date" value={newSession.session_date} onChange={e => setNewSession(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('sessions_topic')} <span className="req">*</span></label>
                <input value={newSession.topic} onChange={e => setNewSession(p => ({ ...p, topic: e.target.value }))} placeholder="Masalan: Tezlik mashqi" />
              </div>
              <div className="field">
                <label>{t('sessions_location')}</label>
                <input value={newSession.station} onChange={e => setNewSession(p => ({ ...p, station: e.target.value }))} placeholder="Maydon 1" />
              </div>
              <div className="field">
                <label>{t('sessions_start')}</label>
                <input type="time" value={newSession.start_time} onChange={e => setNewSession(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('sessions_end')}</label>
                <input type="time" value={newSession.end_time} onChange={e => setNewSession(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('transactions_comment')}</label>
                <textarea value={newSession.description} onChange={e => setNewSession(p => ({ ...p, description: e.target.value }))} placeholder="" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setShowCreate(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleCreateSession} disabled={saving}><I.Check size={14}/> {saving ? t('saving') : t('sessions_create')}</button>
            </div>
          </div>
        </div>
      )}
      {editingSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setEditingSession(null)}>
          <div className="card" style={{ width: 560, padding: 22, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('edit')} — {t('sessions_tab_sessions')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setEditingSession(null)}><I.X size={16}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>{t('sessions_col_group')} <span className="req">*</span></label>
                <SearchableGroupSelect value={editForm.group_id} onChange={v => setEditForm(p => ({ ...p, group_id: v }))} groups={groups} placeholder="Tanlang" />
              </div>
              <div className="field">
                <label>{t('sessions_col_date')} <span className="req">*</span></label>
                <input type="date" value={editForm.session_date} onChange={e => setEditForm(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('sessions_topic')} <span className="req">*</span></label>
                <input value={editForm.topic} onChange={e => setEditForm(p => ({ ...p, topic: e.target.value }))} placeholder="Masalan: Tezlik mashqi" />
              </div>
              <div className="field">
                <label>{t('field_pitch')}</label>
                <input value={editForm.station} onChange={e => setEditForm(p => ({ ...p, station: e.target.value }))} placeholder="Maydon 1" />
              </div>
              <div className="field">
                <label>{t('sessions_start')}</label>
                <input type="time" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('sessions_end')}</label>
                <input type="time" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('field_comment')}</label>
                <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder={t('field_comment')} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setEditingSession(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleEditSession} disabled={saving}><I.Check size={14}/> {saving ? t('saving') : t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showBulkCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setShowBulkCreate(false)}>
          <div className="card" style={{ width: 560, padding: 22, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('bulk_create_title')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowBulkCreate(false)}><I.X size={16}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('field_group')} <span className="req">*</span></label>
                <SearchableGroupSelect value={bulkForm.group_id} onChange={v => setBulkForm(p => ({ ...p, group_id: v }))} groups={groups} placeholder="Tanlang" />
              </div>
              <div className="field">
                <label>{t('bulk_from_date')} <span className="req">*</span></label>
                <input type="date" value={bulkForm.from_date} onChange={e => setBulkForm(p => ({ ...p, from_date: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('bulk_to_date')} <span className="req">*</span></label>
                <input type="date" value={bulkForm.to_date} onChange={e => setBulkForm(p => ({ ...p, to_date: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('bulk_weekdays')} <span className="req">*</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['1','Du'],['2','Se'],['3','Ch'],['4','Pa'],['5','Ju'],['6','Sh'],['0','Ya']].map(([val, label]) => {
                    const sel = bulkDays.includes(val);
                    return (
                      <button key={val} type="button" onClick={() => setBulkDays(prev => sel ? prev.filter(d => d !== val) : [...prev, val])}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'), background: sel ? 'var(--selected)' : 'var(--surface)', color: sel ? 'var(--accent)' : 'var(--text)', fontWeight: sel ? 700 : 500, cursor: 'pointer', fontSize: 13 }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('sessions_topic')} <span className="req">*</span></label>
                <input value={bulkForm.topic} onChange={e => setBulkForm(p => ({ ...p, topic: e.target.value }))} placeholder="Masalan: Tezlik mashqi" />
              </div>
              <div className="field">
                <label>{t('sessions_start')}</label>
                <input type="time" value={bulkForm.start_time} onChange={e => setBulkForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('sessions_end')}</label>
                <input type="time" value={bulkForm.end_time} onChange={e => setBulkForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('field_pitch')}</label>
                <input value={bulkForm.station} onChange={e => setBulkForm(p => ({ ...p, station: e.target.value }))} placeholder="Maydon 1" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setShowBulkCreate(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleBulkCreate} disabled={savingBulk}><I.Check size={14}/> {savingBulk ? t('creating') : t('create')}</button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}

export function AttendanceMark({ sessionId, onBack }) {
  const I = Icon;
  const { t } = useT();
  const [session, setSession] = React.useState(null);
  const [students, setStudents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [marks, setMarks] = React.useState({});
  const [comments, setComments] = React.useState({});
  const [konspektFile, setKonspektFile] = React.useState(null);
  const [konspektDesc, setKonspektDesc] = React.useState('');
  const [uploadingKonspekt, setUploadingKonspekt] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId) return;
    apiGetCoachSessionDetails(sessionId).then(async (sRes) => {
      const sess = sRes?.data;
      setSession(sess);
      if (sess?.group_id) {
        const stuRes = await apiGetGroupStudents(sess.group_id);
        const active = (stuRes?.data || []).filter(s => s.status === 'active');
        setStudents(active);
        const init = {};
        active.forEach(s => { init[s.id] = 'present'; });
        setMarks(init);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [sessionId]);

  function setMark(id, status) { setMarks(prev => ({ ...prev, [id]: status })); }

  const counts = { present: 0, absent: 0, late: 0 };
  Object.values(marks).forEach(m => { if (counts[m] !== undefined) counts[m]++; });

  async function handleSave() {
    if (!sessionId) return;
    setSaving(true);
    try {
      const attendances = students.map(s => ({
        student_id: s.id,
        status: marks[s.id] || 'absent',
        comment: comments[s.id] || undefined,
      }));
      await apiMarkBulkAttendance(sessionId, attendances);
      onBack?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;
  if (!session) return <div className="empty" style={{ padding: 48 }}>{t('not_found')}</div>;

  return (
    <div>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}><I.ArrowLeft size={14}/> {t('sessions_tab_sessions')}</button>

      <div className="page-head">
        <div>
          <h1 className="page-title">{session.topic}</h1>
          <div className="page-sub" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span><I.Calendar size={12} style={{ verticalAlign: -2 }}/> {session.session_date}</span>
            <span><I.Clock size={12} style={{ verticalAlign: -2 }}/> {session.start_time} – {session.end_time}</span>
            {session.station && <span><I.MapPin size={12} style={{ verticalAlign: -2 }}/> {session.station}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            <I.Save size={15}/> {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="stat" style={{ padding: 14 }}>
          <div className="stat-label">{t('total')}</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{students.length}</div>
        </div>
        <div className="stat" style={{ padding: 14, background: 'var(--success-soft)', borderColor: 'transparent' }}>
          <div className="stat-label" style={{ color: 'var(--success)' }}>{t('att_present')}</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: 22 }}>{counts.present}</div>
        </div>
        <div className="stat" style={{ padding: 14, background: 'var(--warning-soft)', borderColor: 'transparent' }}>
          <div className="stat-label" style={{ color: 'var(--warning)' }}>{t('att_late')}</div>
          <div className="stat-value" style={{ color: 'var(--warning)', fontSize: 22 }}>{counts.late}</div>
        </div>
        <div className="stat" style={{ padding: 14, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="stat-label" style={{ color: 'var(--brand-red)' }}>{t('att_absent')}</div>
          <div className="stat-value" style={{ color: 'var(--brand-red)', fontSize: 22 }}>{counts.absent}</div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('att_mark_all')}</span>
          <button className="btn sm" onClick={() => { const m = {}; students.forEach(s => m[s.id] = 'present'); setMarks(m); }}>
            <I.Check size={13} color="var(--success)"/> {t('att_btn_present')}
          </button>
          <button className="btn sm" onClick={() => { const m = {}; students.forEach(s => m[s.id] = 'absent'); setMarks(m); }}>
            <I.X size={13} color="var(--brand-red)"/> {t('att_btn_absent')}
          </button>
          <div style={{ flex: 1 }}></div>
          {students.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('att_attendance_label')} <strong style={{ color: 'var(--text)' }}>{Math.round(counts.present / students.length * 100)}%</strong></span>}
        </div>
      )}

      {students.length === 0 && <div className="empty">{t('att_no_students')}</div>}

      {students.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>{t('att_col_student')}</th><th style={{ width: 380, textAlign: 'center' }}>{t('att_col_status')}</th><th>{t('att_col_comment')}</th></tr>
            </thead>
            <tbody>
              {students.map(s => {
                const m = marks[s.id] || 'present';
                const name = `${s.first_name} ${s.last_name}`;
                return (
                  <tr key={s.id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="row-name">
                        <div className="avatar sm" style={{ background: avatarColor(s.id) }}>{s.first_name[0]}{s.last_name[0]}</div>
                        <div className="meta">
                          <span className="name">{name}</span>
                          <span className="sub">#{String(s.id).padStart(4, '0')}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {[
                          { k: 'present', l: t('att_btn_present'), color: 'var(--success)', soft: 'var(--success-soft)', icon: 'Check' },
                          { k: 'late', l: t('att_btn_late'), color: 'var(--warning)', soft: 'var(--warning-soft)', icon: 'Clock' },
                          { k: 'absent', l: t('att_btn_absent'), color: 'var(--brand-red)', soft: 'var(--accent-soft)', icon: 'X' },
                        ].map(b => {
                          const Ic = I[b.icon];
                          const sel = m === b.k;
                          return (
                            <button key={b.k} onClick={() => setMark(s.id, b.k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (sel ? b.color : 'var(--border)'), background: sel ? b.soft : 'var(--surface)', color: sel ? b.color : 'var(--text-2)', fontWeight: sel ? 700 : 500, fontSize: 12.5, cursor: 'pointer' }}>
                              <Ic size={13}/> {b.l}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <input placeholder={m !== 'present' ? t('att_placeholder_reason') : t('att_placeholder_optional')} value={comments[s.id] || ''} onChange={e => setComments({ ...comments, [s.id]: e.target.value })} style={{ width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Konspekt upload */}
      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Konspekt</div>
        {session.konspekt_url && (
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <I.FileText size={15} color="var(--accent)" />
            <a href={session.konspekt_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{t('konspekt_view')}</a>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label>{t('konspekt_file_label')}</label>
            <input type="file" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" onChange={e => setKonspektFile(e.target.files?.[0] || null)} />
          </div>
          <div className="field">
            <label>{t('konspekt_note_label')}</label>
            <input value={konspektDesc} onChange={e => setKonspektDesc(e.target.value)} placeholder={t('konspekt_note_ph')} />
          </div>
          <div>
            <button
              className="btn primary"
              disabled={!konspektFile || uploadingKonspekt}
              onClick={async () => {
                if (!konspektFile) return;
                setUploadingKonspekt(true);
                try {
                  const fd = new FormData();
                  fd.append('file', konspektFile);
                  if (konspektDesc.trim()) fd.append('description', konspektDesc.trim());
                  const res = await apiUploadCoachSessionKonspekt(sessionId, fd);
                  setSession(res?.data || session);
                  setKonspektFile(null);
                  setKonspektDesc('');
                } catch (e) {
                  alert(t('konspekt_upload_error') + e.message);
                } finally {
                  setUploadingKonspekt(false);
                }
              }}
            >
              <I.Upload size={14} /> {uploadingKonspekt ? t('loading') : t('upload_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PerformanceTable() {
  const { t } = useT();
  const I = Icon;
  const currentYear = new Date().getFullYear();
  const [seasonYear, setSeasonYear] = React.useState(currentYear);

  const groupsQuery = useCoachGroupsQuery();
  const groups = groupsQuery.data || [];
  const [selectedGroupId, setSelectedGroupId] = React.useState(null);
  React.useEffect(() => {
    if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  const tableQuery = useGroupPerformanceTableQuery(selectedGroupId, seasonYear);
  const tableData = tableQuery.data || null;
  const matches = tableData?.matches || [];
  const rows = tableData?.rows || [];
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

  // add match
  const [showAddMatch, setShowAddMatch] = React.useState(false);
  const [newMatch, setNewMatch] = React.useState({ match_date: new Date().toISOString().slice(0, 10), opponent: '', tour_label: '' });
  const [savingMatch, setSavingMatch] = React.useState(false);

  // edit match (column)
  const [editMatchTarget, setEditMatchTarget] = React.useState(null);
  const [editMatchForm, setEditMatchForm] = React.useState({ match_date: '', opponent: '', tour_label: '' });
  const [deletingMatchId, setDeletingMatchId] = React.useState(null);

  // cell editing
  const [editMode, setEditMode] = React.useState(false);
  const [editCells, setEditCells] = React.useState([]);
  const [savingTable, setSavingTable] = React.useState(false);
  const CELL_CYCLE = [null, 'goal', 'assist', 'yellow', 'absent'];

  function enterEditMode() {
    setEditCells(rows.map(r => {
      const cells = r.cells || [];
      return matches.map((_, mi) => cells[mi] ?? null);
    }));
    setEditMode(true);
  }

  function exitEditMode() { setEditMode(false); setEditCells([]); }

  function cycleCell(ri, mi) {
    setEditCells(prev => {
      const next = prev.map(r => [...r]);
      const cur = next[ri][mi];
      const idx = CELL_CYCLE.indexOf(cur);
      next[ri][mi] = CELL_CYCLE[(idx + 1) % CELL_CYCLE.length];
      return next;
    });
  }

  async function saveTable() {
    setSavingTable(true);
    try {
      await apiSaveCoachGroupPerformanceTable(selectedGroupId, {
        title: tableData?.title || '',
        season_year: seasonYear,
        matches: matches.map(m => ({ tour_label: m.tour_label, match_date: m.match_date, opponent: m.opponent })),
        rows: rows.map((r, ri) => ({ student_id: r.student_id, cells: editCells[ri] || [] })),
      });
      setEditMode(false);
      tableQuery.refetch();
    } catch (e) {
      alert('Saqlanmadi: ' + e.message);
    } finally {
      setSavingTable(false);
    }
  }

  async function handleAddMatch() {
    if (!selectedGroupId || !newMatch.opponent.trim() || !newMatch.match_date) { alert(t('toast_required')); return; }
    setSavingMatch(true);
    try {
      await apiAddPerformanceTableMatch(selectedGroupId, {
        season_year: seasonYear,
        match_date: newMatch.match_date,
        opponent: newMatch.opponent.trim(),
        tour_label: newMatch.tour_label.trim() || undefined,
        values: [],
      });
      setShowAddMatch(false);
      setNewMatch({ match_date: new Date().toISOString().slice(0, 10), opponent: '', tour_label: '' });
      exitEditMode();
      setTimeout(() => tableQuery.refetch(), 300);
    } catch (e) {
      alert(e.message);
    } finally { setSavingMatch(false); }
  }

  function openEditMatch(m) {
    setEditMatchTarget(m);
    setEditMatchForm({ match_date: m.match_date || '', opponent: m.opponent || '', tour_label: m.tour_label || '' });
  }

  async function handleEditMatch() {
    if (!editMatchTarget || !editMatchForm.opponent.trim()) return;
    setSavingMatch(true);
    try {
      await apiUpdateCoachPerformanceTableColumn(selectedGroupId, editMatchTarget.id, {
        match_date: editMatchForm.match_date,
        opponent: editMatchForm.opponent.trim(),
        tour_label: editMatchForm.tour_label.trim() || undefined,
        values: [],
      });
      setEditMatchTarget(null);
      tableQuery.refetch();
    } catch (e) {
      alert(e.message);
    } finally { setSavingMatch(false); }
  }

  async function handleDeleteMatch(m) {
    if (!window.confirm(`"${m.opponent}" ${t('confirm_delete_match')}`)) return;
    setDeletingMatchId(m.id);
    try {
      await apiDeleteCoachPerformanceTableColumn(selectedGroupId, m.id, seasonYear);
      exitEditMode();
      tableQuery.refetch();
    } catch (e) {
      alert(e.message);
    } finally { setDeletingMatchId(null); }
  }

  async function handleExport() {
    if (!selectedGroupId) return;
    try {
      const blob = await apiDownloadCoachGroupPerformanceTableExport(selectedGroupId, seasonYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-table-${selectedGroupId}-${seasonYear}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { alert('Excel ochilmadi: ' + e.message); }
  }

  function cellStyle(rawValue) {
    const v = rawValue == null ? null : String(rawValue).toLowerCase().trim();
    switch (v) {
      case 'goal': case 'gol': return { bg: 'var(--success-soft)', color: 'var(--success)', label: '⚽', numericGoals: 1 };
      case 'assist': case 'uzatma': return { bg: 'rgba(15,31,77,0.08)', color: 'var(--brand-navy)', label: '↗', numericGoals: 0 };
      case 'yellow': case 'sariq': return { bg: 'var(--warning-soft)', color: 'var(--warning)', label: '▢', numericGoals: 0 };
      case 'absent': case 'kelmagan': return { bg: 'var(--accent-soft)', color: 'var(--brand-red)', label: '✗', numericGoals: 0 };
      case null: case '': case 'played': return { bg: 'var(--surface-2)', color: 'var(--text-2)', label: '·', numericGoals: 0 };
      default: {
        const n = Number(rawValue);
        if (!isNaN(n) && n > 0) return { bg: 'var(--success-soft)', color: 'var(--success)', label: `⚽ ${n}`, numericGoals: n };
        return { bg: 'var(--surface-2)', color: 'var(--text-2)', label: v || '·', numericGoals: 0 };
      }
    }
  }

  if (groupsQuery.isLoading) return <div className="empty" style={{ padding: 48 }}>{t('perf_groups_loading')}</div>;
  if (groupsQuery.isError) return <div className="empty" style={{ padding: 48, color: 'var(--brand-red)' }}>{t('perf_groups_error')}</div>;
  if (groups.length === 0) return <div className="empty" style={{ padding: 48 }}>{t('perf_groups_empty')}</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('performance_title')}</h1>
          <div className="page-sub">{selectedGroup?.name || '—'} · {seasonYear} {t('perf_season_sub')} · {matches.length} {t('perf_matches_count')}</div>
        </div>
        <div className="page-actions">
          <SearchableGroupSelect value={selectedGroupId || ''} onChange={v => { setSelectedGroupId(v ? Number(v) : null); exitEditMode(); }} groups={groups} placeholder={t('group_select_ph')} />
          <SearchableSelect
            value={String(seasonYear)}
            onChange={v => { setSeasonYear(Number(v)); exitEditMode(); }}
            options={[currentYear, currentYear - 1, currentYear - 2].map(y => ({ value: String(y), label: String(y) }))}
            style={{ minWidth: 100 }}
          />
          <button className="btn" onClick={handleExport} disabled={!selectedGroupId}><I.Download size={15}/> Excel</button>
          {editMode ? (
            <>
              <button className="btn ghost" onClick={exitEditMode} disabled={savingTable}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveTable} disabled={savingTable}>
                <I.Save size={15}/> {savingTable ? t('saving') : t('save')}
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" onClick={enterEditMode} disabled={!selectedGroupId || matches.length === 0}>
                <I.Edit size={15}/> {t('edit')}
              </button>
              <button className="btn primary" onClick={() => setShowAddMatch(true)} disabled={!selectedGroupId}>
                <I.Plus size={15}/> {t('perf_add_match')}
              </button>
            </>
          )}
        </div>
      </div>

      {editMode && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 8, fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
          {t('perf_edit_mode_hint')}
        </div>
      )}

      {tableQuery.isLoading && <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>}
      {tableQuery.isError && <div className="empty" style={{ padding: 48, color: 'var(--brand-red)' }}>{t('perf_load_error')}</div>}

      {!tableQuery.isLoading && !tableQuery.isError && matches.length === 0 && (
        <div className="empty" style={{ padding: 48 }}>
          <div>{t('perf_no_data')}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>{t('perf_add_match')}</div>
        </div>
      )}

      {!tableQuery.isLoading && !tableQuery.isError && matches.length > 0 && rows.length === 0 && (
        <div className="empty" style={{ padding: 48 }}>
          <div>{t('perf_no_students')}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>{t('perf_check_students')}</div>
        </div>
      )}

      {!tableQuery.isLoading && !tableQuery.isError && matches.length > 0 && (
        <>
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table performance-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 220 }}>{t('field_student')}</th>
                  {matches.map(m => (
                    <th key={m.id} style={{ textAlign: 'center', minWidth: editMode ? 110 : 90 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.match_date?.slice(5)}{m.tour_label ? ' · ' + m.tour_label : ''}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>{m.opponent}</div>
                      {editMode && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                          <button
                            className="icon-btn"
                            style={{ width: 22, height: 22 }}
                            title={t('btn_edit')}
                            onClick={() => openEditMatch(m)}
                          ><I.Edit size={11}/></button>
                          <button
                            className="icon-btn"
                            style={{ width: 22, height: 22, color: 'var(--brand-red)', opacity: deletingMatchId === m.id ? 0.5 : 1 }}
                            title={t('btn_delete')}
                            disabled={deletingMatchId === m.id}
                            onClick={() => handleDeleteMatch(m)}
                          ><I.Trash size={11}/></button>
                        </div>
                      )}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', minWidth: 80, background: 'var(--surface-2)' }}>{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  let goals = 0;
                  return (
                    <tr key={row.student_id} style={{ cursor: editMode ? 'pointer' : 'default' }}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, borderRight: '1px solid var(--border)' }}>
                        <div className="row-name">
                          <div className="avatar sm" style={{ background: avatarColor(row.student_id) }}>
                            {row.student_name?.split(' ').map(p => p[0]).slice(0, 2).join('') || '??'}
                          </div>
                          <div className="meta">
                            <span className="name" style={{ fontSize: 13 }}>{row.student_name}</span>
                            {row.millati && <span className="sub">{row.millati}</span>}
                          </div>
                        </div>
                      </td>
                      {matches.map((m, mi) => {
                        const rawCell = editMode ? (editCells[ri]?.[mi] ?? null) : (row.cells?.[mi] ?? null);
                        const st = cellStyle(rawCell);
                        goals += st.numericGoals;
                        return (
                          <td key={m.id} style={{ textAlign: 'center', padding: 4 }} onClick={editMode ? () => cycleCell(ri, mi) : undefined}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              gap: 3, minWidth: 44, height: 30, padding: '0 10px',
                              background: st.bg, color: st.color, borderRadius: 6, fontSize: 13, fontWeight: 700,
                              outline: editMode ? '1px dashed var(--border)' : 'none',
                              cursor: editMode ? 'pointer' : 'default',
                            }}>
                              {st.label}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', background: 'var(--surface-2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{goals}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', gap: 18, fontSize: 12.5, flexWrap: 'wrap' }}>
            {[
              ['⚽', 'var(--success-soft)', 'var(--success)', t('perf_legend_goal')],
              ['↗', 'rgba(15,31,77,0.08)', 'var(--brand-navy)', t('perf_legend_assist')],
              ['▢', 'var(--warning-soft)', 'var(--warning)', t('perf_legend_yellow')],
              ['✗', 'var(--accent-soft)', 'var(--brand-red)', t('perf_legend_absent')],
              ['·', 'var(--surface-2)', 'var(--text-2)', t('perf_legend_played')],
            ].map(([lbl, bg, clr, name]) => (
              <span key={name}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 22, background: bg, color: clr, borderRadius: 4, marginRight: 6, fontWeight: 700 }}>{lbl}</span>{name}</span>
            ))}
            {editMode && <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontStyle: 'italic' }}>{t('perf_edit_hint')}</span>}
          </div>
        </>
      )}

      {/* Add match modal */}
      {showAddMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddMatch(false)}>
          <div className="card" style={{ width: 460, padding: 24, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('perf_add_match')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowAddMatch(false)}><I.X size={16}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field"><label>{t('field_date')} <span className="req">*</span></label><input type="date" value={newMatch.match_date} onChange={e => setNewMatch(p => ({ ...p, match_date: e.target.value }))} /></div>
              <div className="field"><label>{t('field_opponent')} <span className="req">*</span></label><input value={newMatch.opponent} onChange={e => setNewMatch(p => ({ ...p, opponent: e.target.value }))} placeholder="Masalan: Almaty FC"/></div>
              <div className="field"><label>{t('field_tour')}</label><input value={newMatch.tour_label} onChange={e => setNewMatch(p => ({ ...p, tour_label: e.target.value }))} placeholder="Masalan: 1-tur"/></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowAddMatch(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleAddMatch} disabled={savingMatch}>
                <I.Plus size={14}/> {savingMatch ? t('adding') : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit match modal */}
      {editMatchTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }} onClick={() => setEditMatchTarget(null)}>
          <div className="card" style={{ width: 420, padding: 24, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('perf_edit_match')}</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setEditMatchTarget(null)}><I.X size={16}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field"><label>{t('field_date')} <span className="req">*</span></label><input type="date" value={editMatchForm.match_date} onChange={e => setEditMatchForm(p => ({ ...p, match_date: e.target.value }))} /></div>
              <div className="field"><label>{t('field_opponent')} <span className="req">*</span></label><input value={editMatchForm.opponent} onChange={e => setEditMatchForm(p => ({ ...p, opponent: e.target.value }))} placeholder="Masalan: Almaty FC"/></div>
              <div className="field"><label>{t('field_tour')}</label><input value={editMatchForm.tour_label} onChange={e => setEditMatchForm(p => ({ ...p, tour_label: e.target.value }))} placeholder="Masalan: 1-tur"/></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setEditMatchTarget(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleEditMatch} disabled={savingMatch}>
                <I.Check size={14}/> {savingMatch ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
