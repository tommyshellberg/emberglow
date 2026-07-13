import React from 'react';

export function BottomSheet({ open = false, onClose, title, children, style }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: open ? 'auto' : 'none' }} aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--ember-black-a60)',
          backdropFilter: open ? 'blur(3px)' : 'none',
          opacity: open ? 1 : 0,
          transition: 'opacity var(--duration-base) var(--ease-out)',
        }}
      ></div>
      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        maxHeight: '86%',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-raised)',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        border: '1px solid var(--border-hairline)', borderBottom: 'none',
        boxShadow: '0 -12px 48px rgba(0,18,27,0.7)',
        transform: open ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform var(--duration-slow) var(--ease-out)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}>
        {/* Grabber */}
        <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center', flexShrink: 0 }} onClick={onClose}>
          <div style={{ width: 42, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--ember-bone-a12)' }}></div>
        </div>
        {title && (
          <div style={{ padding: '10px 22px 4px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>{title}</div>
          </div>
        )}
        <div style={{ padding: '12px 22px calc(24px + env(safe-area-inset-bottom, 0px))', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
