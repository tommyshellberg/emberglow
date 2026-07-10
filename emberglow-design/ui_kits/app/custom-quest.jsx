// Custom Quest creation screen
const { Button: CButton, Badge: CBadge, EyebrowLabel: CEyebrow } = window.EmberglowDesignSystem_28f42d;

function fmtClock(d) {
  let h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
function fmtDuration(min) {
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h} h ${m} min`;
}

function CustomQuestScreen({ onBack, onStart }) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [category, setCategory] = React.useState('fitness');
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(now.getTime() + minutes * 60000);
  const xp = minutes * 3;
  const pct = ((minutes - 5) / (180 - 5)) * 100;
  const ready = title.trim().length > 0;

  return (
    <div className="tab-scroll" data-screen-label="Custom Quest" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Custom Quest" subtitle="An adventure of your own design." onBack={onBack} />

      {/* Sentence form */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '20px 18px 22px', marginTop: 12, boxShadow: 'var(--shadow-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>I want to</span>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="go for a run"
            style={{
              flex: 1, minWidth: 140, fontFamily: 'var(--font-display)', fontSize: 24,
              color: 'var(--ember-sandy)', background: 'transparent', border: 'none', outline: 'none',
              borderBottom: '1px solid var(--border-strong)', padding: '0 2px 4px', caretColor: 'var(--ember-sandy)',
            }}
          />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginTop: 14 }}>
          for <span style={{ color: 'var(--ember-sandy)' }}>{fmtDuration(minutes)}</span>
        </div>

        {/* Slider */}
        <div style={{ marginTop: 18 }}>
          <input
            type="range" min="5" max="180" step="5" value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
            className="ember-slider"
            style={{ background: `linear-gradient(90deg, var(--ember-cinnabar) 0%, var(--ember-sandy) ${pct}%, rgba(44,69,107,0.45) ${pct}%)` }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 6 }}>
            <span>5 MIN</span><span>3 HOURS</span>
          </div>
        </div>

        {/* From / To */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginTop: 18, padding: '14px 8px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ textAlign: 'center' }}>
            <CEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 4 }}>From</CEyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(now)}</div>
          </div>
          <Icon name="arrow-right" size={18} color="var(--text-accent)" />
          <div style={{ textAlign: 'center' }}>
            <CEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 4 }}>To</CEyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ember-sandy)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(end)}</div>
          </div>
        </div>
      </div>

      {/* Category */}
      <CEyebrow tone="warm" style={{ margin: '20px 0 10px' }}>What kind of quest?</CEyebrow>
      <CategoryPicker value={category} onChange={setCategory} />

      <div style={{ flex: 1, minHeight: 20 }}></div>

      {/* Reward + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <CBadge tone="warm">+{xp} XP</CBadge>
        <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>for staying offline</span>
      </div>
      <CButton variant="primary" size="lg" fullWidth disabled={!ready} onClick={() => onStart({
        kind: 'Custom quest',
        title: title.trim() ? title.trim().charAt(0).toUpperCase() + title.trim().slice(1) : 'Custom quest',
        minutes, xp,
        line: 'A quest of your own design. The world can wait.',
      })}>
        {ready ? 'Start quest' : 'Name your quest to begin'}
      </CButton>
    </div>
  );
}

Object.assign(window, { CustomQuestScreen, fmtClock, fmtDuration });
