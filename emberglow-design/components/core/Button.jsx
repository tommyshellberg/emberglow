import React from 'react';

const sizes = {
  sm: { padding: '8px 16px', fontSize: 14, minHeight: 36 },
  md: { padding: '12px 22px', fontSize: 16, minHeight: 48 },
  lg: { padding: '14px 26px', fontSize: 17, minHeight: 54 },
};

export function Button({ variant = 'primary', size = 'md', fullWidth = false, disabled = false, children, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: press ? 'var(--accent-primary-press)' : hover ? 'var(--accent-primary-hover)' : 'var(--accent-primary)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
      boxShadow: hover && !disabled ? 'var(--glow-ember)' : 'none',
    },
    secondary: {
      background: hover ? 'var(--ember-bone-a12)' : 'var(--ember-bone-a06)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-subtle)',
    },
    ghost: {
      background: hover ? 'var(--ember-bone-a06)' : 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    outline: {
      background: hover ? 'var(--ember-bone-a06)' : 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--weight-semibold)',
        borderRadius: 'var(--radius-pill)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        width: fullWidth ? '100%' : undefined,
        transform: press && !disabled ? 'scale(0.98)' : 'none',
        transition: 'background var(--duration-fast) var(--ease-out), box-shadow var(--duration-base) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...s,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
