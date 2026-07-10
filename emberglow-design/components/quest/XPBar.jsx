import React from 'react';

export function XPBar({ level = 1, xp = 0, xpNext = 100, style }) {
  const pct = Math.max(0, Math.min(1, xp / xpNext));
  return (
    <div style={{ fontFamily: 'var(--font-body)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Level {level}</span>
        <span style={{ fontSize: 13, color: 'var(--text-accent)', fontWeight: 600 }}>{xp} / {xpNext} XP</span>
      </div>
      <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--ember-aegean-a35)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`, borderRadius: 'var(--radius-pill)',
          background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))',
          boxShadow: '0 0 12px rgba(247,164,75,0.5)',
          transition: 'width var(--duration-slow) var(--ease-out)',
        }}></div>
      </div>
    </div>
  );
}
