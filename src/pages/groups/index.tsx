// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import {
  apiGetGroups, apiGetHeadCoachGroups, apiGetGroup, apiGetGroupStudents, apiCreateGroup, apiUpdateGroup, apiDeleteGroup, apiDeleteGroupsBulk,
  apiGetSessions, apiGetSessionDetails, apiGetCoachSessionDetails, apiCreateSession,
  apiUpdateSession, apiDeleteSession, apiCreateHeadCoachSessionsBulk,
  apiGetCoaches, apiDownloadGroupStudentsExport, apiDownloadCoachGroupPerformanceTableExport,
  apiMarkAttendance, apiMarkBulkAttendance, apiAddPerformanceTableMatch,
  apiSaveCoachGroupPerformanceTable, apiDeleteCoachPerformanceTableColumn, apiUpdateCoachPerformanceTableColumn,
  apiUploadCoachSessionKonspekt, apiGetCoachMyAttendances,
} from '@/shared/api';
import { useCoachGroupsQuery, useGroupPerformanceTableQuery } from '@/features/performance-table/model/use-performance-table';
import { SearchableGroupSelect, SearchableSelect } from '@/shared/ui/controls';
import { useT } from '@/shared/i18n/lang';
import { avatarColor } from '@/shared/lib/avatar';

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
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'grid', placeItems: 'center', background: 'var(--overlay)' }} onClick={() => onCloseGroup?.()}>
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
                    <div className="avatar sm" style={{ background: 'var(--primary)' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
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

