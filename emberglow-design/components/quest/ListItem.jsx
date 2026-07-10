import React from 'react';

export function ListItem({ title, subtitle, leading, trailing, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px', borderRadius: 'var(--radius-md)',
        background: hover && onClick ? 'var(--ember-bone-a06)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background var(--duration-fast) var(--ease-out)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {leading && (
        <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ember-bone-a06)', border: '1px solid var(--border-hairline)', color: 'var(--text-accent)' }}>
          {leading}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {trailing && <div style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{trailing}</div>}
    </div>
  );
}
