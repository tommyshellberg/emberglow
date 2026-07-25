// Cooperative quests: hub, create, join (invitations), public events, schedule event
const { Button: KButton, Badge: KBadge, EyebrowLabel: KEyebrow, ListItem: KListItem } = window.EmberglowDesignSystem_28f42d;
const KA = '../../assets';

const COOP_FRIENDS = [
  { name: 'Greg the Destroyer', cls: 'Knight', img: null },
  { name: 'jimmers', cls: 'Wizard', img: `${KA}/characters/wizard-profile.jpg` },
  { name: 'Mr weird', cls: 'Alchemist', img: `${KA}/characters/alchemist-profile.jpg` },
];
const GUILDS = [
  { name: "Runner's Highness", motto: 'Carry the torches', members: 2, icon: 'flag' },
  { name: 'workfriends', motto: null, members: 1, icon: 'beer' },
];

function Avatar({ img, size = 38 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--ember-bone-a06)', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
      {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="user" size={size * 0.45} />}
    </div>
  );
}

/* ————— Hub ————— */
function CoopHubScreen({ hasFriends, onGo, onBack, onToggleEmpty }) {
  const options = hasFriends ? [
    { id: 'create', icon: 'plus-circle', title: 'Create a quest', sub: 'Start a cooperative quest with friends or your guild' },
    { id: 'join', icon: 'mail-open', title: 'Join a quest', sub: 'Answer quest invitations from friends' },
    { id: 'events', icon: 'calendar-clock', title: 'Public events', sub: 'Scheduled quests anyone in the world can join' },
  ] : [
    { id: 'events', icon: 'calendar-clock', title: 'Public events', sub: 'Scheduled quests anyone in the world can join' },
    { id: 'addfriends', icon: 'user-plus', title: 'Add friends', sub: 'Gather companions to quest together' },
  ];
  return (
    <div className="tab-scroll" data-screen-label="Cooperative Quests" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Cooperative Quests" subtitle="One fire, many travelers. Everyone keeps their phone locked — or everyone fails together." onBack={onBack} />
      {!hasFriends && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginTop: 12 }}>
          <Icon name="flame-kindling" size={19} color="var(--text-accent)" style={{ marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>Your fire is still small. Add a friend or join a public event to quest with company.</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {options.map((o) => (
          <div key={o.id} onClick={() => onGo(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 18px', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', boxShadow: 'var(--shadow-raised)' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'rgba(247,164,75,0.10)', border: '1px solid rgba(247,164,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-accent)' }}>
              <Icon name={o.icon} size={21} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text-primary)' }}>{o.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-muted)', marginTop: 2 }}>{o.sub}</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--text-muted)" />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 24 }}></div>
      <div onClick={onToggleEmpty} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 0' }}>
        Prototype: preview {hasFriends ? 'zero-friends' : 'with-friends'} state
      </div>
    </div>
  );
}

/* ————— Create cooperative quest ————— */
function CoopCreateScreen({ onBack, onStart }) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [mode, setMode] = React.useState('friends');
  const [picked, setPicked] = React.useState([]);
  const [guild, setGuild] = React.useState(null);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const end = new Date(now.getTime() + minutes * 60000);
  const pct = ((minutes - 5) / (180 - 5)) * 100;
  const xp = minutes * 3;
  const invited = mode === 'friends' ? picked.length : (guild ? 1 : 0);
  const ready = title.trim().length > 0 && invited > 0;
  const toggle = (n) => setPicked((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  return (
    <div className="tab-scroll" data-screen-label="Create Co-op Quest" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Create a quest" subtitle="If anyone unlocks early, everyone fails together." onBack={onBack} />
      {/* Sentence form */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '20px 18px 22px', marginTop: 12, boxShadow: 'var(--shadow-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>We want to</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="run at dawn"
            style={{ flex: 1, minWidth: 130, fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ember-sandy)', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid var(--border-strong)', padding: '0 2px 4px', caretColor: 'var(--ember-sandy)' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginTop: 14 }}>
          for <span style={{ color: 'var(--ember-sandy)' }}>{fmtDuration(minutes)}</span>
        </div>
        <div style={{ marginTop: 18 }}>
          <input type="range" min="5" max="180" step="5" value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value, 10))} className="ember-slider"
            style={{ background: `linear-gradient(90deg, var(--ember-cinnabar) 0%, var(--ember-sandy) ${pct}%, rgba(44,69,107,0.45) ${pct}%)` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 6 }}>
            <span>5 MIN</span><span>3 HOURS</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginTop: 18, padding: '14px 8px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ textAlign: 'center' }}>
            <KEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 4 }}>From</KEyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(now)}</div>
          </div>
          <Icon name="arrow-right" size={18} color="var(--text-accent)" />
          <div style={{ textAlign: 'center' }}>
            <KEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 4 }}>To</KEyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ember-sandy)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(end)}</div>
          </div>
        </div>
      </div>
      {/* Participants */}
      <KEyebrow tone="warm" style={{ margin: '20px 0 10px' }}>Who rides with you?</KEyebrow>
      <div style={{ display: 'flex', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: 3, marginBottom: 12 }}>
        {['friends', 'guild'].map((s) => (
          <button key={s} onClick={() => setMode(s)} style={{ flex: 1, padding: '9px 0', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, textTransform: 'capitalize', background: mode === s ? 'var(--accent-primary)' : 'transparent', color: mode === s ? 'var(--text-on-accent)' : 'var(--text-secondary)', transition: 'background var(--duration-fast) var(--ease-out)' }}>{s}</button>
        ))}
      </div>
      {mode === 'friends' ? (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {COOP_FRIENDS.map((f, i) => {
            const sel = picked.includes(f.name);
            return (
              <div key={f.name} onClick={() => toggle(f.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none', background: sel ? 'rgba(247,164,75,0.07)' : 'transparent' }}>
                <Avatar img={f.img} />
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
      ) : (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {GUILDS.map((g, i) => {
            const sel = guild === g.name;
            return (
              <div key={g.name} onClick={() => setGuild(sel ? null : g.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none', background: sel ? 'rgba(247,164,75,0.07)' : 'transparent' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'rgba(247,164,75,0.10)', border: '1px solid rgba(247,164,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-accent)' }}><Icon name={g.icon} size={17} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{g.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{g.motto ? `${g.motto} · ` : ''}{g.members} {g.members === 1 ? 'member' : 'members'}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'), background: sel ? 'var(--ember-sandy)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a2410' }}>
                  {sel && <Icon name="check" size={13} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 20 }}></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '16px 0 12px' }}>
        <KBadge tone="warm">+{xp} XP each</KBadge>
        <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{invited > 0 ? `${invited} invited` : 'no one invited yet'}</span>
      </div>
      <KButton variant="primary" size="lg" fullWidth disabled={!ready} onClick={() => onStart({
        kind: 'Co-op quest',
        title: title.trim().charAt(0).toUpperCase() + title.trim().slice(1),
        minutes, xp,
        line: 'One fire, many travelers. Keep every phone dark.',
      })}>
        {ready ? 'Send invitations & begin' : title.trim() ? 'Invite at least one companion' : 'Name your quest to begin'}
      </KButton>
    </div>
  );
}

/* ————— Join a quest (invitations) ————— */
function CoopJoinScreen({ onBack, onGoEvents, onStart }) {
  const [invites, setInvites] = React.useState([
    { id: 1, from: 'jimmers', img: `${KA}/characters/wizard-profile.jpg`, title: '5 am run club', minutes: 30, xp: 90, when: 'Starts when everyone accepts' },
  ]);
  const decline = (id) => setInvites((v) => v.filter((i) => i.id !== id));
  return (
    <div className="tab-scroll" data-screen-label="Join a Quest" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Join a quest" subtitle="Invitations from your companions." onBack={onBack} />
      {invites.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {invites.map((inv) => (
            <div key={inv.id} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '16px 16px 14px', boxShadow: 'var(--shadow-raised)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar img={inv.img} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{inv.from} invites you</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginTop: 1 }}>{inv.title}</div>
                </div>
                <KBadge tone="warm">+{inv.xp} XP</KBadge>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '10px 0 12px' }}>{inv.minutes} minutes · {inv.when}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <KButton variant="primary" fullWidth onClick={() => onStart({ kind: 'Co-op quest', title: inv.title, minutes: 2, xp: inv.xp, line: 'One fire, many travelers. Keep every phone dark.' })}>Accept</KButton>
                <KButton variant="outline" fullWidth onClick={() => decline(inv.id)}>Decline</KButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, padding: '40px 20px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail-open" size={30} color="var(--ember-aegean-60)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>No invitations yet</div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-muted)', maxWidth: '28ch' }}>The road is quiet. Join a public event and meet fellow travelers.</p>
          <KButton variant="secondary" onClick={onGoEvents} style={{ marginTop: 8 }}>Browse public events</KButton>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { CoopHubScreen, CoopCreateScreen, CoopJoinScreen, CoopAvatar: Avatar });
