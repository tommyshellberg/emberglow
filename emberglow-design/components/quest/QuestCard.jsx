import React from 'react';
import { Badge } from '../core/Badge.jsx';

export function QuestCard({ title, description, xp, duration, status, image, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  const statusTone = status === 'In progress' ? 'ember' : status === 'Complete' ? 'success' : 'neutral';
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid ' + (hover ? 'rgba(247,164,75,0.35)' : 'var(--border-hairline)'),
        boxShadow: hover ? 'var(--shadow-card), var(--glow-warm)' : 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--surface-raised)',
        transition: 'border-color var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {image && (
        <div style={{ position: 'absolute', inset: 0, background: `url(${image}) center / cover`, opacity: 0.55 }}></div>
      )}
      {image && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,18,27,0.92) 20%, rgba(0,18,27,0.35))' }}></div>
      )}
      <div style={{ position: 'relative', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: image ? 120 : undefined, justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <Badge tone={statusTone}>{status}</Badge>}
          {xp != null && <Badge tone="warm">+{xp} XP</Badge>}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', lineHeight: 1.15 }}>{title}</div>
        {description && <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{description}</div>}
        {duration && <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{duration}</div>}
      </div>
    </div>
  );
}
