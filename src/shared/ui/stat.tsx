// @ts-nocheck
import React from 'react';

export function Stat({ label, value, sub, tone = 'default', icon: Ic }) {
  const tones = {
    default: { iconBg: 'var(--surface-2)', iconColor: 'var(--text-2)', val: 'var(--text)' },
    success: { iconBg: 'var(--success-soft)', iconColor: 'var(--success)', val: 'var(--success)' },
    warning: { iconBg: 'var(--warning-soft)', iconColor: 'var(--warning)', val: 'var(--warning)' },
    danger: { iconBg: 'var(--accent-soft)', iconColor: 'var(--brand-red)', val: 'var(--brand-red)' },
    navy: { iconBg: 'var(--navy-soft)', iconColor: 'var(--navy-ink)', val: 'var(--text)' },
  };
  const t = tones[tone] || tones.default;

  return (
    <div className="stat">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="stat-label">{label}</div>
        {Ic && (
          <div style={{ width: 34, height: 34, borderRadius: 10, background: t.iconBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ic size={16} color={t.iconColor} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color: t.val }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
