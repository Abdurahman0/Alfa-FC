// @ts-nocheck
import React from 'react';
import { Icon } from './icons';
import { AlphaShield, AlphaWordmark } from './logo';
import { apiSearchStudents } from './api';
import { useT } from './lang';

const NAV_ITEMS = [
  { sectionKey: 'nav_main', items: [
    { id: 'dashboard', labelKey: 'nav_dashboard', icon: 'Dashboard', perm: 'reports:dashboard:view' },
  ]},
  { sectionKey: 'nav_study', items: [
    { id: 'students', labelKey: 'nav_students', icon: 'Users', perm: 'students:view' },
    { id: 'groups', labelKey: 'nav_groups', icon: 'Group', perm: 'groups:view' },
    { id: 'sessions', labelKey: 'nav_sessions', icon: 'Calendar', perm: 'attendance:view' },
    { id: 'performance', labelKey: 'nav_performance', icon: 'Trophy', perm: 'sessions:manage' },
  ]},
  { sectionKey: 'nav_docs_finance', items: [
    { id: 'contracts', labelKey: 'nav_contracts', icon: 'FileText', perm: 'contracts:view' },
    { id: 'transactions', labelKey: 'nav_transactions', icon: 'Wallet', perm: 'finance:transactions:view' },
    { id: 'reports', labelKey: 'nav_reports', icon: 'Activity', perm: 'finance:transactions:view' },
    // { id: 'gate', labelKey: 'gate_title', icon: 'Gate', perm: 'gate:logs:view' },
  ]},
  { sectionKey: 'nav_management', items: [
    { id: 'waiting-list', labelKey: 'nav_waiting_list', icon: 'Bell', perm: 'students:view' },
    { id: 'users', labelKey: 'nav_users', icon: 'Users', perm: 'users:manage' },
    { id: 'audit-logs', labelKey: 'nav_audit_logs', icon: 'Shield', perm: 'settings:system:view' },
    { id: 'settings', labelKey: 'nav_settings', icon: 'Settings', perm: 'settings:system:view' },
  ]},
];

const ROLE_PERMISSIONS = {
  'Super Admin': '*',
  'Director': ['students:view','groups:view','attendance:view','reports:attendance:view','reports:dashboard:view','gate:logs:view','settings:system:view','contracts:view','finance:transactions:view'],
  'Accountant': ['students:view','reports:dashboard:view','contracts:view','finance:transactions:view'],
  'Admin': ['students:view','students:edit','groups:view','groups:edit','attendance:view','gate:logs:view','reports:dashboard:view','contracts:view','contracts:edit','finance:transactions:view','users:manage','roles:manage','settings:system:view'],
  'Head Coach': ['students:view','groups:view','groups:edit','attendance:view','attendance:coach:mark','sessions:create','sessions:manage','reports:dashboard:view'],
  'Coach': ['students:view','groups:view','attendance:view','attendance:coach:mark'],
};

export function normalizeRoleName(name) {
  if (!name) return null;
  if (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, name)) return name;
  const cleaned = String(name).toLowerCase().replace(/[-_]/g, ' ').trim();
  const match = Object.keys(ROLE_PERMISSIONS).find(k => k.toLowerCase() === cleaned);
  return match || null;
}

function hasPerm(role, perm) {
  const normalized = normalizeRoleName(role) || role;
  const p = ROLE_PERMISSIONS[normalized];
  if (p === '*') return true;
  if (!p) return false;
  return p.includes(perm);
}

function getInitials(name) {
  return String(name || 'AY')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('') || 'AY';
}

export function Sidebar({ active, onNav, role, collapsed, onToggle, user }) {
  const I = Icon;
  const { t } = useT();
  const fullName = user?.full_name || user?.name || user?.email || 'Alpha User';
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {!collapsed ? <AlphaWordmark height={30}/> : <AlphaShield size={30}/>}
        <button className="icon-btn" style={{ marginLeft: 'auto', width: 32, height: 32, border: 'none', background: 'transparent' }}
          onClick={onToggle}>
          <I.Menu size={16}/>
        </button>
      </div>
      <nav className="nav">
        {(() => {
          const seen = new Set();
          return NAV_ITEMS.map(section => {
            const visible = section.items.filter(it => {
              if (!hasPerm(role, it.perm)) return false;
              if (seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
            if (!visible.length) return null;
            return (
              <React.Fragment key={section.sectionKey}>
                {!collapsed && <div className="nav-section">{t(section.sectionKey)}</div>}
                {visible.map(it => {
                  const Ic = I[it.icon];
                  const label = t(it.labelKey);
                  return (
                    <div key={it.id}
                      className={'nav-item' + (active === it.id ? ' active' : '')}
                      onClick={() => onNav(it.id)}
                      title={collapsed ? label : ''}>
                      <Ic size={17}/>
                      {!collapsed && <>
                        <span>{label}</span>
                        {it.badge && <span className="nav-badge">{it.badge}</span>}
                      </>}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          });
        })()}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar" style={{ background: '#0F1F4D' }}>
          {getInitials(fullName)}
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{role}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export function Topbar({ crumbs, role, onRoleSwitch, canSwitchRole, theme, onTheme, onSignOut, user, onNavigate }) {
  const I = Icon;
  const { t, lang, setLang } = useT();
  const [open, setOpen] = React.useState(false);
  const [searchQ, setSearchQ] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef(null);
  const fullName = user?.full_name || user?.name || user?.email || 'Alpha User';
  const initials = getInitials(fullName);

  React.useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiSearchStudents(searchQ);
        const list = res?.data || (Array.isArray(res) ? res : []);
        setSearchResults(Array.isArray(list) ? list.slice(0, 8) : []);
        setSearchOpen(true);
      } catch { setSearchResults([]); } finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQ]);

  React.useEffect(() => {
    function close(e) { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <I.ChevronRight size={14}/>}
            <span className={i === crumbs.length - 1 ? 'current' : ''}>{t(c) || c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="search" ref={searchRef} style={{ position: 'relative' }}>
        <span className="icon-l"><I.Search size={16}/></span>
        <input
          placeholder={t('topbar_search')}
          value={searchQ}
          onChange={e => { setSearchQ(e.target.value); if (!e.target.value) setSearchOpen(false); }}
          onFocus={() => { if (searchQ.trim() && searchResults.length > 0) setSearchOpen(true); }}
          onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); } }}
        />
        <kbd>⌘K</kbd>
        {searchOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden' }}>
            {searchLoading && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--muted)' }}>{t('topbar_searching')}</div>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>{t('topbar_no_results')}</div>
            )}
            {searchResults.map(s => {
              const studentId = s.id ?? s.student_id;
              return (
                <div key={studentId}
                  onClick={() => { if (studentId) onNavigate?.('student', studentId); setSearchQ(''); setSearchOpen(false); }}
                  style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--selected)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0F1F4D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {(s.first_name || '?')[0]}{(s.last_name || '?')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.phone || s.pnfl || `#${String(studentId).padStart(4, '0')}`}</div>
                  </div>
                  <I.ChevronRight size={13} color="var(--muted)"/>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setLang(lang === 'ru' ? 'uz' : 'ru')}
          style={{ height: 32, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}
          title={lang === 'ru' ? "O'zbek tiliga o'tish" : 'Переключить на русский'}
        >
          {lang === 'ru' ? t('lang_uz') : t('lang_ru')}
        </button>
        <button className="icon-btn" onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')} title={lang === 'ru' ? 'Тема' : 'Tema'}>
          {theme === 'dark' ? <I.Sun size={16}/> : <I.Moon size={16}/>}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="user-chip" onClick={() => setOpen(!open)}>
            <div className="avatar">{initials}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{fullName}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{role}</span>
            </div>
            <I.ChevronDown size={14}/>
          </button>
          {open && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', width: 240,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: 6,
            }} onMouseLeave={() => setOpen(false)}>
              {canSwitchRole && <>
                <div style={{ padding: '10px 12px 6px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('topbar_switch_role')}</div>
                {Object.keys(ROLE_PERMISSIONS).map(r => (
                  <div key={r}
                    onClick={() => { onRoleSwitch(r); setOpen(false); }}
                    style={{
                      padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: r === role ? 'var(--selected)' : 'transparent',
                      fontWeight: r === role ? 600 : 500,
                    }}>
                    <Icon.User size={14} color="var(--muted)"/>
                    {r}
                    {r === role && <Icon.Check size={14} color="var(--brand-red)" style={{ marginLeft: 'auto' }}/>}
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }}></div>
              </>}
              <div onClick={onSignOut} style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brand-red)' }}>
                <Icon.Logout size={14}/> {t('topbar_logout')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { hasPerm, NAV_ITEMS, ROLE_PERMISSIONS };
