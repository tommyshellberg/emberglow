import React from 'react';

const tones = {
  ember: { background: 'rgba(217,73,40,0.18)', color: 'var(--ember-cinnabar-80)', border: '1px solid rgba(217,73,40,0.35)' },
  warm: { background: 'rgba(247,164,75,0.15)', color: 'var(--text-accent)', border: '1px solid rgba(247,164,75,0.35)' },
  neutral: { background: 'var(--ember-bone-a06)', color: 'var(--text-secondary)', border: '1px solid var(--border-hairline)' },
  success: { background: 'rgba(125,168,123,0.15)', color: '#9dc39b', border: '1px solid rgba(125,168,123,0.35)' },
};

export function Badge({ tone = 'neutral', children, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '5px 12px', borderRadius: 'var(--radius-pill)',
      ...tones[tone], ...style,
    }}>
      {children}
    </span>
  );
}
