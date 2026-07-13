import React from 'react';

const eyebrowTones = {
  ember: 'var(--ember-cinnabar-80)',
  warm: 'var(--text-accent)',
  muted: 'var(--text-muted)',
};

export function EyebrowLabel({ tone = 'ember', children, style }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
      letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
      color: eyebrowTones[tone] || eyebrowTones.ember,
      ...style,
    }}>
      {children}
    </div>
  );
}
