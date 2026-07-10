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

export function StudentProfile({ studentId, onBack }) {
  const I = Icon;
  const { t } = useT();
  const [info, setInfo] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const [gateLogs, setGateLogs] = React.useState([]);
  const [attendanceReport, setAttendanceReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('overview');
  const [groups, setGroups] = React.useState([]);
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
    apiGetGroups({ page_size: 100 }).then(res => setGroups(res?.data || [])).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!studentId) {
      setInfo(null);
      setLoading(false);
      return;
    }
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
          group_id: infoRes.data.group?.id ? String(infoRes.data.group.id) : '',
          status: s.status || 'active',
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
          background: 'linear-gradient(135deg, #101D42 0%, #173A78 55%, #1F4C9A 100%)',
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
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <div className="attendance-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 6 }}>
              {attendances.slice(0, 14).map((a, i) => {
                const color = a.status === 'present' ? 'var(--success)' : a.status === 'absent' ? 'var(--brand-red)' : 'var(--brand-gold)';
                const label = a.status === 'present' ? '✓' : a.status === 'absent' ? '✗' : 'L';
                return (
                  <div key={i} title={a.status} style={{ aspectRatio: '1', borderRadius: 6, background: color, opacity: 0.85, color: a.status === 'late' ? 'rgba(0,0,0,0.6)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {label}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 12.5 }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>● {t('profile_present')} {presentCount}</span>
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>● {t('profile_late_chip')} {lateCount}</span>
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
              <div style={{ paddingBottom: 8 }}>
                <label style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>{t('field_group')}</label>
                <SearchableGroupSelect
                  value={editForm.group_id || ''}
                  onChange={v => setEditForm(p => ({ ...p, group_id: v }))}
                  groups={groups}
                  placeholder={t('students_all_groups')}
                  style={{ width: '100%' }}
                  direction="up"
                />
              </div>
              <div style={{ paddingBottom: 8 }}>
                <label style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>{t('students_all_statuses')}</label>
                <SearchableSelect
                  value={editForm.status || 'active'}
                  onChange={v => setEditForm(p => ({ ...p, status: v }))}
                  options={[
                    { value: 'active', label: t('status_active') },
                    { value: 'inactive', label: t('status_inactive') },
                    { value: 'archived', label: t('status_archived') },
                  ]}
                  style={{ width: '100%' }}
                  direction="up"
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
                  ['first_name', 'last_name', 'date_of_birth', 'height', 'weight', 'pnfl', 'phone', 'ampula', 'millati', 'address', 'status'].forEach(k => {
                    if (editForm[k]) fd.append(k, editForm[k]);
                  });
                  await apiUpdateStudent(studentId, fd);
                  if (editForm.group_id && String(editForm.group_id) !== String(info?.group?.id || '')) {
                    await apiChangeStudentGroup(studentId, editForm.group_id);
                  }
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
                    group_id: infoRes.data.group?.id ? String(infoRes.data.group.id) : '',
                    status: infoRes.data.student.status || 'active',
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

