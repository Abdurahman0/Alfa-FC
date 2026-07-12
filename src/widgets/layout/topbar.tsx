// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { useT } from '@/shared/i18n/lang';
import { ROLE_PERMISSIONS } from '@/shared/lib/rbac';
import { getInitials } from '@/shared/lib/avatar';
import { revealFrom } from '@/shared/lib/view-transition';
import { ACCENTS, DEFAULT_APPEARANCE, loadAppearance, saveAppearance, applyAppearance, isDefaultAppearance } from '@/shared/lib/appearance';

export function Topbar({ crumbs, role, onRoleSwitch, canSwitchRole, theme, onTheme, onSignOut, user, onNavigate, onMenu }) {
  const I = Icon;
  const { t, lang, setLang } = useT();
  const [open, setOpen] = React.useState(false);
  const fullName = user?.full_name || user?.name || user?.email || 'Alpha User';
  const initials = getInitials(fullName);

  return (
    <div className="topbar">
      <button className="icon-btn mobile-menu-button" onClick={onMenu} aria-label="Open navigation">
        <I.Menu size={18}/>
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <I.ChevronRight size={14}/>}
            <span className={i === crumbs.length - 1 ? 'current' : ''}>{t(c) || c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ActionDropdown
          value={lang}
          title={lang === 'ru' ? 'Язык' : 'Til'}
          triggerClass="language-button"
          triggerStyle={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}
          trigger={<>{lang === 'ru' ? 'RU' : 'UZ'} <I.ChevronDown size={13}/></>}
          items={[
            { value: 'uz', label: "O'zbekcha" },
            { value: 'ru', label: 'Русский' },
          ]}
          onSelect={(v, e) => revealFrom(e, () => setLang(v))}
        />
        <AppearancePanel t={t}/>
        <button className="icon-btn" title={lang === 'ru' ? 'Тема' : 'Tema'}
          onClick={(e) => revealFrom(e, () => onTheme(theme === 'dark' ? 'light' : 'dark'))}>
          {theme === 'dark' ? <I.Sun size={16}/> : <I.Moon size={16}/>}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="user-chip" onClick={() => setOpen(!open)}>
            <div className="avatar">{initials}</div>
            <div className="user-chip-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{fullName}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{role}</span>
            </div>
            <span className="user-chip-chevron"><I.ChevronDown size={14}/></span>
          </button>
          {open && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', width: 240,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: 6,
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
                    {r === role && <Icon.Check size={14} color="var(--accent)" style={{ marginLeft: 'auto' }}/>}
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }}></div>
              </>}
              <div className="menu-item danger" onClick={onSignOut}>
                <Icon.Logout size={14}/> {t('topbar_logout')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionDropdown({ trigger, items, value, onSelect, title, triggerClass = 'icon-btn', triggerStyle, width = 168 }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className={triggerClass} style={triggerStyle} title={title} onClick={() => setOpen(o => !o)}>
        {trigger}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: width, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 60, padding: 6 }}>
          {items.map(it => {
            const selected = it.value === value;
            return (
              <div key={it.value}
                onClick={(e) => { setOpen(false); if (!selected) onSelect(it.value, e); }}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, background: selected ? 'var(--selected)' : 'transparent', fontWeight: selected ? 600 : 500 }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                {it.icon}
                <span style={{ flex: 1 }}>{it.label}</span>
                {selected && <Icon.Check size={14} color="var(--accent)"/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppearancePanel({ t }) {
  const I = Icon;
  const [open, setOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState(() => loadAppearance());
  const ref = React.useRef(null);

  React.useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function update(next, e, animate = true) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveAppearance(merged);
    if (animate) revealFrom(e, () => applyAppearance(merged));
    else applyAppearance(merged);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" title={t('appearance_title')} onClick={() => setOpen(o => !o)}>
        <I.Palette size={16}/>
        {!isDefaultAppearance(prefs) && <span className="dot" style={{ background: prefs.accent }}/>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 264, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 60, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{t('appearance_accent')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {ACCENTS.map(c => {
              const active = prefs.accent.toLowerCase() === c.toLowerCase();
              return (
                <button key={c} type="button" onClick={(e) => update({ accent: c }, e)} title={c}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    outline: active ? '2px solid var(--text)' : '2px solid transparent', outlineOffset: 2,
                    transition: 'transform 120ms ease', transform: active ? 'scale(1.08)' : 'scale(1)' }}>
                  {active && <I.Check size={13} color="#fff"/>}
                </button>
              );
            })}
          </div>
          {!isDefaultAppearance(prefs) && (
            <button type="button" className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
              onClick={(e) => update({ ...DEFAULT_APPEARANCE }, e)}>
              {t('appearance_reset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
