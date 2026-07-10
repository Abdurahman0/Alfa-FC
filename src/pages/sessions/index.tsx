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

function sessionStatus(session_date) {
  const today = new Date().toISOString().slice(0, 10);
  if (session_date === today) return 'today';
  if (session_date > today) return 'upcoming';
  return 'completed';
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
                  background: isSelected ? 'var(--selected)' : isToday ? 'var(--primary)' : 'var(--surface-2)',
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setShowCreate(false)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setEditingSession(null)}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }} onClick={() => setShowBulkCreate(false)}>
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

