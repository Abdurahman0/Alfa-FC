// @ts-nocheck
import React from 'react';

export function AlphaShield({ size = 28, mono = false }) {
  const navy = mono ? 'currentColor' : '#101D42';
  const red = mono ? 'currentColor' : '#C8202C';
  const gold = mono ? 'currentColor' : '#F5B921';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4 L58 12 L58 30 C58 46 47 56 32 60 C17 56 6 46 6 30 L6 12 Z"
        fill={red} stroke={navy} strokeWidth="3" strokeLinejoin="round"/>
      <path d="M10 22 L54 22 L52 30 L12 30 Z" fill={navy}/>
      <text x="32" y="19" textAnchor="middle" fontSize="9" fontWeight="900" fill={gold} fontFamily="system-ui">ALPHA</text>
      <polygon points="20,42 22,48 28,48 23,52 25,58 20,54 15,58 17,52 12,48 18,48"
        fill={gold} transform="scale(0.6) translate(13 12)"/>
      <circle cx="38" cy="44" r="8" fill="#F5F1E6" stroke={navy} strokeWidth="1.5"/>
      <path d="M38 36 L41 39 L40 43 L36 43 L35 39 Z M30 44 L34 42 L38 44 L36 48 L32 48 Z M46 44 L42 42 L38 44 L40 48 L44 48 Z"
        fill={navy}/>
    </svg>
  );
}

export function AlphaWordmark({ height = 32 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <AlphaShield size={height}/>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontWeight: 800, fontSize: height * 0.42, letterSpacing: '0.06em', color: 'var(--text)' }}>ALPHA</span>
        <span style={{ fontWeight: 500, fontSize: height * 0.28, letterSpacing: '0.18em', color: 'var(--muted)', marginTop: 2 }}>CIMS</span>
      </div>
    </div>
  );
}
