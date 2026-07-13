import React from 'react';

export function Switch({ checked = false, onChange, label, disabled = false, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, fontFamily: 'var(--font-body)', ...style }}>
      <span
        role="switch" aria-checked={checked} tabIndex={0}
        onClick={() => !disabled && onChange && onChange(!checked)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !disabled) { e.preventDefault(); onChange && onChange(!checked); } }}
        style={{
          width: 48, height: 28, borderRadius: 'var(--radius-pill)', position: 'relative', flexShrink: 0,
          background: checked ? 'var(--accent-primary)' : 'var(--ember-aegean-a35)',
          border: '1px solid ' + (checked ? 'transparent' : 'var(--border-subtle)'),
          boxShadow: checked ? 'var(--glow-ember)' : 'none',
          transition: 'background var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3, width: 22, height: 22,
          borderRadius: '50%', background: 'var(--ember-bone)',
          transition: 'left var(--duration-base) var(--ease-out)',
        }}></span>
      </span>
      {label && <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
