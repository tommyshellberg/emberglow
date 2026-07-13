import React from 'react';

export function Input({ label, placeholder, value, onChange, type = 'text', hint, multiline = false, style }) {
  const [focus, setFocus] = React.useState(false);
  const field = {
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)',
    background: 'var(--surface-inset)',
    border: '1px solid ' + (focus ? 'rgba(247,164,75,0.55)' : 'var(--border-subtle)'),
    boxShadow: focus ? '0 0 0 3px rgba(247,164,75,0.15)' : 'none',
    borderRadius: 'var(--radius-md)',
    padding: '13px 16px', outline: 'none',
    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
    resize: 'vertical',
  };
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-body)', ...style }}>
      {label && (
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</span>
      )}
      {multiline ? (
        <textarea rows={3} placeholder={placeholder} value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field}></textarea>
      ) : (
        <input type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field} />
      )}
      {hint && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{hint}</span>}
    </label>
  );
}
