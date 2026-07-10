// Create Guild screen
const { Button: GButton, EyebrowLabel: GEyebrow } = window.EmberglowDesignSystem_28f42d;

const GUILD_ICONS = ['axe', 'hammer', 'flame', 'beer', 'shield', 'feather', 'gem', 'crown', 'trees', 'swords'];

const GUILD_FRIENDS = [
  { name: 'Greg the Destroyer', cls: 'Knight', img: null },
  { name: 'jimmers', cls: 'Wizard', img: '../../assets/characters/wizard-profile.jpg' },
  { name: 'Mr weird', cls: 'Alchemist', img: '../../assets/characters/alchemist-profile.jpg' },
];

function CreateGuildScreen({ onBack, onCreated }) {
  const [name, setName] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [icon, setIcon] = React.useState(null);
  const [picked, setPicked] = React.useState([]);
  const togglePick = (n) => setPicked((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const ready = name.trim().length > 0 && icon;
  return (
    <div className="tab-scroll" data-screen-label="Create Guild" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Create a guild" subtitle="A banner for your companions to gather under." onBack={onBack} />

      {/* Name + tagline */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '20px 18px 22px', marginTop: 12, boxShadow: 'var(--shadow-raised)' }}>
        <GEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 8 }}>Guild name</GEyebrow>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="The Dawn Riders"
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ember-sandy)', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid var(--border-strong)', padding: '0 2px 6px', caretColor: 'var(--ember-sandy)' }}
        />
        <GEyebrow tone="muted" style={{ fontSize: 11, margin: '20px 0 8px' }}>Tagline · optional</GEyebrow>
        <input
          value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short motto for your guild"
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid var(--border-subtle)', padding: '0 2px 6px', caretColor: 'var(--ember-sandy)' }}
        />
      </div>

      {/* Icon picker */}
      <GEyebrow tone="warm" style={{ margin: '20px 0 10px' }}>Choose a banner</GEyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {GUILD_ICONS.map((ic) => {
          const sel = icon === ic;
          return (
            <div key={ic} onClick={() => setIcon(ic)} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              background: sel ? 'rgba(217,73,40,0.14)' : 'var(--surface-raised)',
              border: '1px solid ' + (sel ? 'rgba(217,73,40,0.55)' : 'var(--border-hairline)'),
              boxShadow: sel ? 'var(--glow-ember)' : 'none',
              color: sel ? 'var(--ember-cinnabar-80)' : 'var(--text-secondary)',
              transition: 'all var(--duration-base) var(--ease-out)',
            }}>
              <Icon name={ic} size={24} />
            </div>
          );
        })}
      </div>

      {/* Founding members */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '20px 0 10px' }}>
        <GEyebrow tone="warm">Invite founding members</GEyebrow>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Optional</span>
      </div>
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {GUILD_FRIENDS.map((f, i) => {
          const sel = picked.includes(f.name);
          return (
            <div key={f.name} onClick={() => togglePick(f.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none', background: sel ? 'rgba(247,164,75,0.07)' : 'transparent' }}>
              <CoopAvatar img={f.img} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{f.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{f.cls}</div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'), background: sel ? 'var(--ember-sandy)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a2410', transition: 'all var(--duration-fast) var(--ease-out)' }}>
                {sel && <Icon name="check" size={13} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview */}
      {(name.trim() || icon) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, padding: '12px 14px', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'rgba(247,164,75,0.10)', border: '1px solid rgba(247,164,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-accent)' }}>
            {icon ? <Icon name={icon} size={19} /> : <Icon name="flag" size={19} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-primary)' }}>{name.trim() || 'Your guild'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{tagline.trim() ? `${tagline.trim()} · ` : ''}{picked.length > 0 ? `1 member · ${picked.length} invited` : '1 member'}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview</span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 20 }}></div>
      <GButton variant="primary" size="lg" fullWidth disabled={!ready} onClick={() => onCreated({
        name: name.trim(), motto: tagline.trim() || null, members: 1, invited: picked.length, icon,
      })} style={{ marginTop: 16 }}>
        {!ready ? (!name.trim() ? 'Name your guild to continue' : 'Choose a banner icon') : picked.length > 0 ? `Raise the banner · invite ${picked.length}` : 'Raise the banner'}
      </GButton>
    </div>
  );
}

Object.assign(window, { CreateGuildScreen });
