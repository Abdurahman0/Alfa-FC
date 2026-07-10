// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { AlphaShield, AlphaWordmark } from '@/shared/ui/logo';
import { useT } from '@/shared/i18n/lang';
import { hasPerm } from '@/shared/lib/rbac';
import { getInitials } from '@/shared/lib/avatar';
import { NAV_ITEMS } from './nav-config';

export function Sidebar({ active, onNav, role, collapsed, onToggle, user, mobileOpen }) {
  const I = Icon;
  const { t } = useT();
  const fullName = user?.full_name || user?.name || user?.email || 'Alpha User';
  return (
    <aside className={'sidebar' + (mobileOpen ? ' mobile-open' : '')}>
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
        <div className="avatar" style={{ background: 'var(--brand-red)' }}>
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
