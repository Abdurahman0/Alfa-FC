// @ts-nocheck
import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { useT } from '@/shared/i18n/lang';

/*
 * Dropdown panels render through a portal with fixed positioning so they
 * can never be clipped by overflow containers (.table-wrap, modals) and
 * auto-flip upward when there is not enough room below the trigger.
 */
function useDropdownPosition(open, triggerRef, preferred = 'down') {
  const [pos, setPos] = React.useState(null);

  const measure = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const wanted = 280; // ideal panel height
    let dir = preferred;
    if (preferred === 'down' && spaceBelow < 200 && spaceAbove > spaceBelow) dir = 'up';
    if (preferred === 'up' && spaceAbove < 200 && spaceBelow > spaceAbove) dir = 'down';
    const maxHeight = Math.max(140, Math.min(wanted, dir === 'down' ? spaceBelow : spaceAbove));
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - 308)),
      width: r.width,
      maxHeight,
      ...(dir === 'down' ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }),
    });
  }, [triggerRef, preferred]);

  React.useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    measure();
    window.addEventListener('resize', measure);
    // capture: also fires for scrolls inside nested containers (tables, modal bodies)
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  return pos;
}

function DropdownPanel({ open, triggerRef, panelRef, direction, children }) {
  const pos = useDropdownPosition(open, triggerRef, direction);
  if (!open || !pos) return null;
  return createPortal(
    <div ref={panelRef} className="menu" style={{
      position: 'fixed',
      left: pos.left,
      ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
      minWidth: pos.width,
      width: 'max-content',
      maxWidth: 'min(300px, calc(100vw - 16px))',
      padding: 0,
      zIndex: 5500, // above modals (5000), below toasts (6000)
      display: 'flex',
      flexDirection: 'column',
      maxHeight: pos.maxHeight,
      overflow: 'hidden',
    }}>
      {children}
    </div>,
    document.body
  );
}

function useOutsideClose(open, setOpen, triggerRef, panelRef, onClose) {
  React.useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
      onClose?.();
    }
    function onKey(e) { if (e.key === 'Escape') { setOpen(false); onClose?.(); } }
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, triggerRef, panelRef, onClose]);
}

function SelectShell({ value, selectedLabel, placeholder, onSelect, options, showSearch, direction, style, minWidth }) {
  const I = Icon;
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const triggerRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const clearQ = React.useCallback(() => setQ(''), []);
  useOutsideClose(open, setOpen, triggerRef, panelRef, clearQ);

  const filtered = showSearch && q
    ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div className="searchable-select" style={{ position: 'relative', ...style }}>
      <button ref={triggerRef} type="button" onClick={() => setOpen(o => !o)} style={{
        height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        minWidth, width: '100%', justifyContent: 'space-between', whiteSpace: 'nowrap',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedLabel ?? placeholder}</span>
        <I.ChevronDown size={14} style={{ flexShrink: 0 }} />
      </button>
      <DropdownPanel open={open} triggerRef={triggerRef} panelRef={panelRef} direction={direction}>
        {showSearch && (
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', borderRadius: 6, padding: '4px 8px' }}>
              <I.Search size={13} color="var(--muted)" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder={t('search_placeholder')}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, flex: 1, color: 'var(--text)' }} />
            </div>
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 4 }}>
          {filtered.map(o => {
            const isSelected = o.isAll
              ? (!value || value === 'all' || value === '')
              : String(o.value) === String(value);
            return (
              <div key={String(o.value)}
                className={'menu-item' + (isSelected ? ' selected' : '')}
                onClick={() => { onSelect(o); setOpen(false); setQ(''); }}
                style={{ gap: 8, fontSize: 13 }}>
                {isSelected ? <I.Check size={13} color="var(--accent)" style={{ flexShrink: 0 }} /> : <span style={{ width: 13, flexShrink: 0, display: 'inline-block' }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)' }}>{t('not_found')}</div>}
        </div>
      </DropdownPanel>
    </div>
  );
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Tanlang', style, direction = 'down' }) {
  const selectedOpt = options.find(o => String(o.value) === String(value));
  return (
    <SelectShell
      value={value}
      selectedLabel={selectedOpt ? selectedOpt.label : null}
      placeholder={placeholder}
      options={options}
      showSearch={options.length > 5}
      direction={direction}
      style={style}
      minWidth={140}
      onSelect={o => onChange(String(o.value))}
    />
  );
}

export function SearchableGroupSelect({ value, onChange, groups, placeholder, style, direction = 'down' }) {
  const { t } = useT();
  const ph = placeholder ?? t('students_all_groups');
  const selectedGroup = groups.find(g => String(g.id) === String(value));
  const options = [
    { value: 'all', label: ph, isAll: true },
    ...groups.map(g => ({ value: String(g.id), label: g.name })),
  ];
  return (
    <SelectShell
      value={value}
      selectedLabel={selectedGroup ? selectedGroup.name : null}
      placeholder={ph}
      options={options}
      showSearch
      direction={direction}
      style={style}
      minWidth={180}
      onSelect={o => onChange(o.isAll ? '' : String(o.value))}
    />
  );
}
