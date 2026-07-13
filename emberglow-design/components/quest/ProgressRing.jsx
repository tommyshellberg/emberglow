import React from 'react';

export function ProgressRing({ progress = 0.5, size = 240, strokeWidth = 5, children, style }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(44,69,107,0.4)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--accent-primary)" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
          style={{ filter: 'drop-shadow(0 0 10px rgba(217,73,40,0.55))', transition: 'stroke-dashoffset var(--duration-slow) var(--ease-out)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}
