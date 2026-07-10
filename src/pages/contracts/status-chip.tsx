// @ts-nocheck
import React from 'react';

export function statusChip(status, t = (k) => k) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return <span className="chip success"><span className="chip-dot"></span>{t('status_active')}</span>;
  if (s === 'TERMINATED') return <span className="chip danger"><span className="chip-dot"></span>{t('status_terminated')}</span>;
  if (s === 'EXPIRED') return <span className="chip warning"><span className="chip-dot"></span>{t('status_cancelled')}</span>;
  if (s === 'ARCHIVED') return <span className="chip"><span className="chip-dot"></span>{t('status_archived')}</span>;
  return <span className="chip">{status || '—'}</span>;
}
