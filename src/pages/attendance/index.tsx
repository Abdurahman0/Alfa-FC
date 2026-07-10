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
import { fmtDate } from '@/shared/lib/format';

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
            <span><I.Calendar size={12} style={{ verticalAlign: -2 }}/> {fmtDate(session.session_date)}</span>
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

      <div className="grid-4" style={{ marginBottom: 16 }}>
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
        <div className="stat" style={{ padding: 14, background: 'var(--danger-soft)', borderColor: 'transparent' }}>
          <div className="stat-label" style={{ color: 'var(--danger)' }}>{t('att_absent')}</div>
          <div className="stat-value" style={{ color: 'var(--danger)', fontSize: 22 }}>{counts.absent}</div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('att_mark_all')}</span>
          <button className="btn sm" onClick={() => { const m = {}; students.forEach(s => m[s.id] = 'present'); setMarks(m); }}>
            <I.Check size={13} color="var(--success)"/> {t('att_btn_present')}
          </button>
          <button className="btn sm" onClick={() => { const m = {}; students.forEach(s => m[s.id] = 'absent'); setMarks(m); }}>
            <I.X size={13} color="var(--danger)"/> {t('att_btn_absent')}
          </button>
          <div style={{ flex: 1 }}></div>
          {students.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('att_attendance_label')} <strong style={{ color: 'var(--text)' }}>{Math.round(counts.present / students.length * 100)}%</strong></span>}
        </div>
      )}

      {students.length === 0 && <div className="empty">{t('att_no_students')}</div>}

      {students.length > 0 && (
        <div className="table-wrap">
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
                          { k: 'absent', l: t('att_btn_absent'), color: 'var(--danger)', soft: 'var(--danger-soft)', icon: 'X' },
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

