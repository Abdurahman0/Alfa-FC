// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { apiGetDashboard, apiGetGroups, apiGetSessions } from '@/shared/api';
import { useT } from '@/shared/i18n/lang';
import { fmtDate } from '@/shared/lib/format';

function MiniSpark({ values, color = 'var(--accent)', height = 42 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const W = 200, H = height;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * (H - 10) - 5).toFixed(1)}`).join(' ');
  const area = `0,${H} ${points} ${W},${H}`;
  const gid = React.useId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`}/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function fmtMln(v) {
  if (!v) return '0';
  return (v / 1_000_000).toFixed(1) + ' mln';
}

export function Dashboard({ role, onNav, onOpenGroup }) {
  const I = Icon;
  const { t } = useT();
  const [summary, setSummary] = React.useState(null);
  const [todaySessions, setTodaySessions] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const todayIso = new Date().toISOString().slice(0, 10);

  React.useEffect(() => {
    Promise.all([
      apiGetDashboard(),
      apiGetSessions({ date: todayIso }),
      apiGetGroups({ page_size: 50 }),
    ]).then(([dashRes, sessRes, grpRes]) => {
      setSummary(dashRes?.data || null);
      setTodaySessions(sessRes?.data || []);
      setGroups(grpRes?.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const m30 = summary?.last_30_days;
  const inflow30 = m30?.total_inflow || 0;
  const trendPoints = m30?.trend?.map(p => p.inflow) || [0];
  const openRoute = (route) => onNav?.(route);
  const onActionKey = (e, action) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    action();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('dashboard_title')}</h1>
          <div className="page-sub">
            {fmtDate(new Date())} · {loading ? '...' : (summary?.today_sessions ?? todaySessions.length) + ' ' + t('dashboard_sessions_today')}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => onNav('students-new')}><I.Plus size={15}/> {t('dashboard_new_student')}</button>
        </div>
      </div>

      <div className="grid-4">
        {[
          { labelKey: 'dashboard_stat_active_students', value: loading ? '...' : (summary?.active_students ?? '-'), spark: [60,62,64,68,70,75,78,80,82,84], color: 'var(--accent)', icon: <I.Users size={18}/>, route: 'students' },
          { labelKey: 'dashboard_stat_today_sessions', value: loading ? '...' : (summary?.today_sessions ?? '-'), spark: [2,3,2,3,4,3,4,3,4,3], color: 'var(--success)', icon: <I.Calendar size={18}/>, soft: 'var(--success-soft)', route: 'sessions' },
          { labelKey: 'dashboard_stat_monthly', value: loading ? '...' : fmtMln(inflow30), spark: trendPoints.length > 1 ? trendPoints : [0,1], color: 'var(--warning)', icon: <I.TrendingUp size={18}/>, soft: 'var(--warning-soft)', route: 'transactions' },
          { labelKey: 'dashboard_stat_debtors', value: loading ? '...' : (summary?.total_debtors ?? '-'), spark: [8,9,8,10,11,10,9,10,11,12], color: 'var(--danger)', icon: <I.AlertTriangle size={18}/>, soft: 'var(--danger-soft)', route: 'reports' },
        ].map(s => (
          <div
            key={s.labelKey}
            className="stat dashboard-action"
            role="button"
            tabIndex={0}
            onClick={() => openRoute(s.route)}
            onKeyDown={(e) => onActionKey(e, () => openRoute(s.route))}
          >
            <div className="stat-head">
              <div className="stat-label">{t(s.labelKey)}</div>
              <div className="stat-icon" style={s.soft ? { background: s.soft, color: s.color } : undefined}>
                {s.icon}
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-spark">
              <MiniSpark values={s.spark} color={s.color}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 16 }}></div>

      <div className="dashboard-panels">
        <div className="card">
          <div className="card-header">
            <I.Calendar size={16} color="var(--accent)"/>
            <div className="card-title">{t('dashboard_today_sessions')}</div>
            <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => onNav('sessions')}>{t('dashboard_view_all')} <I.ArrowRight size={13}/></button>
          </div>
          <div style={{ padding: 6 }}>
            {loading && <div className="empty">{t('loading')}</div>}
            {!loading && todaySessions.length === 0 && <div className="empty">{t('dashboard_no_sessions')}</div>}
            {todaySessions.map((s) => (
              <div
                key={s.id}
                className="session-item dashboard-row-action"
                role="button"
                tabIndex={0}
                onClick={() => openRoute('sessions')}
                onKeyDown={(e) => onActionKey(e, () => openRoute('sessions'))}
              >
                <div className="session-time">
                  <div className="from">{s.start_time || '--:--'}</div>
                  {s.end_time && <div className="to">{s.end_time}</div>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic || t('dashboard_training')}</div>
                  {s.location && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <I.MapPin size={12}/> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.location}</span>
                    </div>
                  )}
                </div>
                <span className="chev"><I.ChevronRight size={16}/></span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <I.Group size={16} color="var(--accent)"/>
            <div className="card-title">{t('dashboard_groups')}</div>
            <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => onNav('groups')}>{t('dashboard_all_groups')} <I.ArrowRight size={13}/></button>
          </div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading && <div className="empty" style={{ padding: 20 }}>{t('loading')}</div>}
            {groups.slice(0, 6).map(g => {
              const count = g.active_students_count || 0;
              const maxCapacity = 25;
              const pct = Math.min(Math.round((count / maxCapacity) * 100), 100);
              const openGroup = () => onOpenGroup ? onOpenGroup(g.id) : openRoute('groups');
              return (
                <div
                  key={g.id}
                  className="group-row dashboard-row-action"
                  role="button"
                  tabIndex={0}
                  onClick={openGroup}
                  onKeyDown={(e) => onActionKey(e, openGroup)}
                >
                  <div className="top">
                    <span className="name">{g.name}</span>
                    <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{count} / {maxCapacity}</span>
                  </div>
                  <div className={'progress' + (pct >= 95 ? ' red' : pct >= 70 ? ' gold' : '')}>
                    <span style={{ width: pct + '%' }}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 16 }}></div>

      <div className="card">
        <div className="card-header">
          <I.Wallet size={16} color="var(--accent)"/>
          <div className="card-title">{t('dashboard_finance')}</div>
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => onNav('transactions')}>{t('dashboard_transactions')} <I.ArrowRight size={13}/></button>
        </div>
        <div className="fin-grid">
          {[
            { label: t('dashboard_total_income'), value: fmtMln(m30?.total_inflow), color: 'var(--success)' },
            { label: t('dashboard_transactions'), value: (m30?.successful_transactions || 0) + ' ta', color: 'var(--text)' },
            ...( m30?.source_breakdown?.map(s => ({ label: s.source === 'payme' ? 'Payme' : s.source === 'click' ? 'Click' : (t('lang_uz') === "O'ZBEK" ? 'Boshqa' : 'Другое'), value: fmtMln(s.amount), color: 'var(--warning)' })) || []),
          ].map((item, i) => (
            <div
              key={i}
              className="fin-card dashboard-finance-action"
              role="button"
              tabIndex={0}
              onClick={() => openRoute('transactions')}
              onKeyDown={(e) => onActionKey(e, () => openRoute('transactions'))}
            >
              <div className="label">{item.label}</div>
              <div className="value" style={{ color: item.color }}>{loading ? '...' : item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
