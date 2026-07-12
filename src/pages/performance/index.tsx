// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { DateInput, DateTimeInput } from '@/shared/ui/date-picker';
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
import { monthName } from '@/shared/lib/format';

// compact "19 May" for narrow match-column headers
function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${d.getDate()} ${monthName(d.getMonth())}`;
}
import { Modal } from '@/shared/ui/modal';

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
      case 'assist': case 'uzatma': return { bg: 'var(--navy-soft)', color: 'var(--navy-ink)', label: '↗', numericGoals: 0 };
      case 'yellow': case 'sariq': return { bg: 'var(--warning-soft)', color: 'var(--warning)', label: '▢', numericGoals: 0 };
      case 'absent': case 'kelmagan': return { bg: 'var(--danger-soft)', color: 'var(--danger)', label: '✗', numericGoals: 0 };
      case null: case '': case 'played': return { bg: 'var(--surface-2)', color: 'var(--text-2)', label: '·', numericGoals: 0 };
      default: {
        const n = Number(rawValue);
        if (!isNaN(n) && n > 0) return { bg: 'var(--success-soft)', color: 'var(--success)', label: `⚽ ${n}`, numericGoals: n };
        return { bg: 'var(--surface-2)', color: 'var(--text-2)', label: v || '·', numericGoals: 0 };
      }
    }
  }

  if (groupsQuery.isLoading) return <div className="empty" style={{ padding: 48 }}>{t('perf_groups_loading')}</div>;
  if (groupsQuery.isError) return <div className="empty" style={{ padding: 48, color: 'var(--danger)' }}>{t('perf_groups_error')}</div>;
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
      {tableQuery.isError && <div className="empty" style={{ padding: 48, color: 'var(--danger)' }}>{t('perf_load_error')}</div>}

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
          <div className="table-wrap" style={{ overflow: 'auto' }}>
            <table className="table performance-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 220 }}>{t('field_student')}</th>
                  {matches.map(m => (
                    <th key={m.id} style={{ textAlign: 'center', minWidth: editMode ? 110 : 90 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{shortDate(m.match_date)}{m.tour_label ? ' · ' + m.tour_label : ''}</div>
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
                            className="icon-btn danger"
                            style={{ width: 22, height: 22, opacity: deletingMatchId === m.id ? 0.5 : 1 }}
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
              ['↗', 'var(--navy-soft)', 'var(--navy-ink)', t('perf_legend_assist')],
              ['▢', 'var(--warning-soft)', 'var(--warning)', t('perf_legend_yellow')],
              ['✗', 'var(--danger-soft)', 'var(--danger)', t('perf_legend_absent')],
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
        <Modal
          onClose={() => setShowAddMatch(false)}
          title={t('perf_add_match')}
          footer={(
            <>
              <button className="btn ghost" onClick={() => setShowAddMatch(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleAddMatch} disabled={savingMatch}>
                <I.Plus size={14}/> {savingMatch ? t('adding') : t('add')}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>{t('field_date')} <span className="req">*</span></label><DateInput value={newMatch.match_date} onChange={v => setNewMatch(p => ({ ...p, match_date: v }))} /></div>
            <div className="field"><label>{t('field_opponent')} <span className="req">*</span></label><input value={newMatch.opponent} onChange={e => setNewMatch(p => ({ ...p, opponent: e.target.value }))} placeholder="Masalan: Almaty FC"/></div>
            <div className="field"><label>{t('field_tour')}</label><input value={newMatch.tour_label} onChange={e => setNewMatch(p => ({ ...p, tour_label: e.target.value }))} placeholder="Masalan: 1-tur"/></div>
          </div>
        </Modal>
      )}

      {/* Edit match modal */}
      {editMatchTarget && (
        <Modal
          onClose={() => setEditMatchTarget(null)}
          title={t('perf_edit_match')}
          size="sm"
          footer={(
            <>
              <button className="btn ghost" onClick={() => setEditMatchTarget(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleEditMatch} disabled={savingMatch}>
                <I.Check size={14}/> {savingMatch ? t('saving') : t('save')}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>{t('field_date')} <span className="req">*</span></label><DateInput value={editMatchForm.match_date} onChange={v => setEditMatchForm(p => ({ ...p, match_date: v }))} /></div>
            <div className="field"><label>{t('field_opponent')} <span className="req">*</span></label><input value={editMatchForm.opponent} onChange={e => setEditMatchForm(p => ({ ...p, opponent: e.target.value }))} placeholder="Masalan: Almaty FC"/></div>
            <div className="field"><label>{t('field_tour')}</label><input value={editMatchForm.tour_label} onChange={e => setEditMatchForm(p => ({ ...p, tour_label: e.target.value }))} placeholder="Masalan: 1-tur"/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
