// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { AlphaShield } from '@/shared/ui/logo';
import { apiLogin, apiGetDashboard, apiGetGroups, apiGetSessions } from '@/shared/api';
import { useT } from '@/shared/i18n/lang';

export function LoginScreen({ onLogin }) {
  const I = Icon;
  const { t } = useT();
  const [showPw, setShowPw] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiLogin(phone.trim(), pw);
      onLogin();
    } catch (err) {
      setError(err.message || t('login_error_default'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg)',
    }}>
      <div className="login-hero" style={{
        color: 'white',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 380, height: 380, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 18%, transparent)', filter: 'blur(10px)' }}></div>
        <div style={{ position: 'absolute', bottom: -100, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(245,185,33,0.10)', filter: 'blur(10px)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <AlphaShield size={48}/>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.05em' }}>ALPHA FC</div>
            <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: '0.18em' }}>CLUB INFORMATION MANAGEMENT</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16, textWrap: 'pretty' }}>
            {t('login_hero')}
          </div>
          <div style={{ fontSize: 15, opacity: 0.78, maxWidth: 460, lineHeight: 1.55 }}>
            {t('login_hero_sub')}
          </div>
          <div style={{ marginTop: 36, display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            {[
              { v: '320+', lk: 'login_stat_students' },
              { v: '24', lk: 'login_stat_groups' },
              { v: '99.2%', lk: 'login_stat_accuracy' },
            ].map(s => (
              <div key={s.lk}>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{s.v}</div>
                <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(s.lk)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.5, position: 'relative' }}>v2.4.1 · © 2026 Alpha Football Club</div>
      </div>

      <div className="login-form-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>{t('login_title')}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 30px' }}>{t('login_subtitle')}</p>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t('login_phone_label')}</label>
            <div style={{ position: 'relative' }}>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" style={{ width: '100%', paddingLeft: 38 }}/>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><I.Phone size={15}/></span>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t('login_password_label')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ width: '100%', paddingLeft: 38, paddingRight: 38 }}/>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><I.Lock size={15}/></span>
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--muted)', padding: 6 }}>
                {showPw ? <I.EyeOff size={15}/> : <I.Eye size={15}/>}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 22px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
              <input type="checkbox" defaultChecked/> {t('login_remember')}
            </label>
            <a href="#" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{t('login_forgot')}</a>
          </div>
          {error && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>
              {error}
            </div>
          )}
          <button className="btn primary" type="submit" style={{ width: '100%', height: 44, justifyContent: 'center' }} disabled={loading}>
            {loading ? t('login_checking') : t('login_btn')} {!loading && <I.ArrowRight size={16}/>}
          </button>
        </form>
      </div>
    </div>
  );
}

