// Shared chrome: Icon (lucide), BottomNav, TabHeader
const DS = window.EmberglowDesignSystem_28f42d;

function Icon({ name, size = 22, color, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      lucide.createIcons({ nameAttr: 'data-lucide' });
    }
  }, [name]);
  return <span ref={ref} className="lucide-slot" style={{ display: 'inline-flex', width: size, height: size, color, flexShrink: 0, ...style }}></span>;
}

/* Bottom navigation — layout and items fixed: Journal, Map, Play (center orb), Profile, Settings */
function BottomNav({ active, onNavigate }) {
  const left = [
    { id: 'journal', icon: 'book', label: 'Journal' },
    { id: 'map', icon: 'map', label: 'Map' },
  ];
  const right = [
    { id: 'profile', icon: 'user', label: 'Profile' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ];
  const Tab = ({ t }) => (
    <div onClick={() => onNavigate(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 58, minHeight: 44, justifyContent: 'center', cursor: 'pointer', color: t.id === active ? 'var(--ember-bone)' : 'var(--text-muted)' }}>
      <Icon name={t.icon} size={22} />
      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>{t.label}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 6px 22px', background: 'rgba(0,18,27,0.88)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border-hairline)' }}>
      {left.map((t) => <Tab key={t.id} t={t} />)}
      <div onClick={() => onNavigate('play')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 58, cursor: 'pointer', marginTop: -34 }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: active === 'play' ? 'var(--accent-primary-hover)' : 'var(--accent-primary)',
          boxShadow: 'var(--glow-ember), 0 6px 18px rgba(0,18,27,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-accent)',
          border: '2px solid rgba(232,220,199,0.18)',
        }}>
          <Icon name="compass" size={26} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: active === 'play' ? 'var(--ember-bone)' : 'var(--text-muted)' }}>Play</span>
      </div>
      {right.map((t) => <Tab key={t.id} t={t} />)}
    </div>
  );
}

/* Standard tab header: Erstoria title + one quiet line */
function TabHeader({ title, subtitle }) {
  return (
    <div style={{ padding: '18px 0 6px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 34, margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
      {subtitle && <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

/* Filter chip */
function Chip({ selected, tone = 'neutral', children, onClick }) {
  const sel = tone === 'ember'
    ? { background: 'var(--accent-primary)', color: 'var(--text-on-accent)', border: '1px solid transparent' }
    : { background: 'rgba(247,164,75,0.15)', color: 'var(--text-accent)', border: '1px solid rgba(247,164,75,0.4)' };
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, padding: '7px 14px',
      borderRadius: 'var(--radius-pill)', cursor: 'pointer',
      transition: 'background var(--duration-fast) var(--ease-out)',
      ...(selected ? sel : { background: 'var(--ember-bone-a06)', color: 'var(--text-secondary)', border: '1px solid var(--border-hairline)' }),
    }}>{children}</button>
  );
}

/* Quest categories — shared by Custom Quest and Schedule Event forms */
const CATEGORIES = [
  { id: 'fitness', label: 'Fitness', icon: 'heart-pulse' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'self-care', label: 'Self-care', icon: 'sparkles' },
  { id: 'learning', label: 'Learning', icon: 'book-open' },
  { id: 'creative', label: 'Creative', icon: 'feather' },
  { id: 'household', label: 'Household', icon: 'home' },
  { id: 'outdoors', label: 'Outdoors', icon: 'trees' },
  { id: 'other', label: 'Other', icon: 'compass' },
];

/* Horizontally scrollable category rail */
function CategoryPicker({ value, onChange }) {
  return (
    <div className="cat-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', alignSelf: 'stretch', minWidth: 0, flexShrink: 0, margin: '0 -20px', padding: '4px 20px 10px' }}>
      {CATEGORIES.map((c) => {
        const sel = value === c.id;
        return (
          <div key={c.id} onClick={() => onChange(c.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            flexShrink: 0, minWidth: 92,
            padding: '16px 12px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
            background: sel ? 'rgba(217,73,40,0.14)' : 'var(--surface-raised)',
            border: '1px solid ' + (sel ? 'rgba(217,73,40,0.55)' : 'var(--border-hairline)'),
            boxShadow: sel ? 'var(--glow-ember)' : 'none',
            transition: 'all var(--duration-base) var(--ease-out)',
          }}>
            <Icon name={c.icon} size={22} color={sel ? 'var(--ember-cinnabar-80)' : 'var(--text-secondary)'} />
            <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', color: sel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Icon, BottomNav, TabHeader, Chip, CATEGORIES, CategoryPicker });
