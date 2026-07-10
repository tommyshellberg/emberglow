import React from 'react';

export function IconButton({ label, size = 44, active = false, disabled = false, children, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      aria-label={label}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        width: size, height: size,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + (active ? 'rgba(247,164,75,0.5)' : 'var(--border-hairline)'),
        background: active ? 'rgba(247,164,75,0.12)' : hover ? 'var(--ember-bone-a06)' : 'transparent',
        color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--duration-fast) var(--ease-out)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
