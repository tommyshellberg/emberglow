// Sub-screens: Skill Tree, Leaderboard, Achievements + Invite Friends sheet
const { Button: SButton, Badge: SBadge, EyebrowLabel: SEyebrow, ListItem: SListItem, Input: SInput, BottomSheet: SSheet } = window.EmberglowDesignSystem_28f42d;
const SA = '../../assets';

/* Back header for sub-screens */
function SubHeader({ title, subtitle, onBack }) {
  return (
    <div style={{ padding: '18px 0 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={onBack} style={{ width: 40, height: 40, marginLeft: -8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Icon name="arrow-left" size={22} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 30, margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
      </div>
      {subtitle && <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

/* ————— Skill Tree ————— */
const PERK_TIERS = [
  { tier: 'Tier I', note: 'Available now', perks: [
    { name: "Warrior's Might", effect: '+10% XP from fitness quests', icon: 'sword' },
    { name: 'Quick Break', effect: '+10% XP for quests 15–30 min', icon: 'hourglass' },
    { name: 'Morning Ritual', effect: '+15% XP before 9 AM', icon: 'sunrise' },
    { name: 'Kindling', effect: 'Streak survives one missed day', icon: 'flame-kindling' },
  ]},
  { tier: 'Tier II', note: 'Unlock 3 perks in Tier I', locked: true, perks: [
    { name: 'Deep Focus', effect: '+20% XP for quests over 45 min', icon: 'moon-star' },
    { name: 'Storyteller', effect: 'Reflections grant +10 XP', icon: 'feather' },
    { name: 'Torchbearer', effect: 'Co-op quests grant +15% XP for all', icon: 'users' },
    { name: 'Night Watch', effect: '+15% XP after sunset', icon: 'moon' },
  ]},
  { tier: 'Tier III', note: 'Unlock 3 perks in Tier II', locked: true, perks: [
    { name: 'Second Wind', effect: 'One retry keeps quest XP intact', icon: 'wind' },
    { name: 'Pathfinder', effect: 'Reveal one story branch early', icon: 'signpost' },
    { name: 'Emberheart', effect: '+25% XP on 7-day streaks', icon: 'heart-pulse' },
    { name: 'Oathkeeper', effect: 'Custom quests count as story XP', icon: 'scroll' },
  ]},
];

function PerkCard({ perk, state, onUnlock }) {
  // state: 'unlocked' | 'available' | 'locked'
  const unlocked = state === 'unlocked';
  const locked = state === 'locked';
  return (
    <div style={{
      position: 'relative',
      background: unlocked ? 'rgba(247,164,75,0.10)' : 'var(--surface-raised)',
      border: '1px solid ' + (unlocked ? 'rgba(247,164,75,0.45)' : 'var(--border-hairline)'),
      boxShadow: unlocked ? 'var(--glow-warm)' : 'none',
      borderRadius: 'var(--radius-lg)', padding: '14px 14px 12px',
      opacity: locked ? 0.45 : 1,
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'all var(--duration-base) var(--ease-out)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: unlocked ? 'rgba(247,164,75,0.18)' : 'var(--ember-bone-a06)', border: '1px solid ' + (unlocked ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: unlocked ? 'var(--ember-sandy)' : 'var(--text-secondary)' }}>
          <Icon name={locked ? 'lock' : perk.icon} size={18} />
        </div>
        {unlocked && <Icon name="check" size={16} color="var(--ember-sandy)" />}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{perk.name}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-muted)', marginTop: 3 }}>{perk.effect}</div>
      </div>
      {state === 'available' && (
        <SButton variant="secondary" size="sm" fullWidth onClick={onUnlock} style={{ marginTop: 'auto' }}>Unlock · 1 pt</SButton>
      )}
    </div>
  );
}

function SkillTreeScreen({ onBack }) {
  const [unlocked, setUnlocked] = React.useState([]);
  const [announce, setAnnounce] = React.useState(() => !localStorage.getItem('emberglow-kit-skilltree-seen'));
  const dismiss = () => { localStorage.setItem('emberglow-kit-skilltree-seen', '1'); setAnnounce(false); };
  const points = 3 - unlocked.length;
  const total = PERK_TIERS.reduce((n, t) => n + t.perks.length, 0);
  return (
    <div className="tab-scroll" data-screen-label="Skill Tree">
      <SubHeader title="Skill Tree" subtitle="Choose the path your hero grows along." onBack={onBack} />
      {/* Class + progress */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', margin: '10px 0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SEyebrow tone="warm">Knight · Level 7</SEyebrow>
          <SBadge tone={points > 0 ? 'warm' : 'neutral'}>{points} {points === 1 ? 'point' : 'points'}</SBadge>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
          <span style={{ whiteSpace: 'nowrap' }}>{unlocked.length} of {total} unlocked</span>
          <span onClick={() => setUnlocked([])} style={{ color: 'var(--ember-cinnabar-80)', cursor: 'pointer' }}>Reset</span>
        </div>
        <div style={{ height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--ember-aegean-a35)' }}>
          <div style={{ height: '100%', width: `${(unlocked.length / total) * 100}%`, borderRadius: 'var(--radius-pill)', background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))', transition: 'width var(--duration-slow) var(--ease-out)' }}></div>
        </div>
      </div>
      {/* Tiers */}
      {PERK_TIERS.map((tier, ti) => {
        const tierUnlockedCount = tier.perks.filter((p) => unlocked.includes(p.name)).length;
        const prevTier = PERK_TIERS[ti - 1];
        const tierOpen = ti === 0 || (prevTier && prevTier.perks.filter((p) => unlocked.includes(p.name)).length >= 3);
        return (
          <div key={tier.tier} style={{ position: 'relative', paddingLeft: 22, marginTop: 20 }}>
            {/* Connector spine */}
            <div style={{ position: 'absolute', left: 6, top: 26, bottom: ti === PERK_TIERS.length - 1 ? 'auto' : -20, height: ti === PERK_TIERS.length - 1 ? 'calc(100% - 26px)' : 'auto', width: 1, background: tierOpen ? 'rgba(247,164,75,0.35)' : 'var(--border-subtle)' }}></div>
            <div style={{ position: 'absolute', left: 1, top: 12, width: 11, height: 11, borderRadius: '50%', background: tierOpen ? 'var(--ember-sandy)' : 'var(--ember-aegean)', boxShadow: tierOpen ? '0 0 10px rgba(247,164,75,0.6)' : 'none' }}></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: tierOpen ? 'var(--text-primary)' : 'var(--text-muted)' }}>{tier.tier}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tierOpen ? `${tierUnlockedCount} of ${tier.perks.length}` : tier.note}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {tier.perks.map((p) => {
                const state = unlocked.includes(p.name) ? 'unlocked' : (tierOpen && points > 0 ? 'available' : 'locked');
                return <PerkCard key={p.name} perk={p} state={state} onUnlock={() => setUnlocked([...unlocked, p.name])} />;
              })}
            </div>
          </div>
        );
      })}
      {/* New-feature announcement */}
      <SSheet open={announce} onClose={dismiss} title="Skill trees have arrived">
        <SEyebrow tone="warm" style={{ textAlign: 'center', marginBottom: 10 }}>New</SEyebrow>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)', margin: '0 auto 18px', textAlign: 'center', maxWidth: '34ch' }}>
          You've grown strong enough to choose a path. Spend points on perks that boost your XP and shape your story.
        </p>
        <SButton variant="primary" size="lg" fullWidth onClick={dismiss}>Choose your first perk</SButton>
        <SButton variant="ghost" fullWidth onClick={dismiss} style={{ marginTop: 6 }}>Maybe later</SButton>
      </SSheet>
    </div>
  );
}

/* ————— Leaderboard ————— */
const BOARDS = {
  friends: [
    { name: 'Greg the Destroyer', cls: 'Knight', img: null, quests: 47, minutes: 812, streak: 9 },
    { name: 'Tommy', cls: 'Knight', you: true, img: null, quests: 36, minutes: 139, streak: 0 },
    { name: 'jimmers', cls: 'Wizard', img: `${SA}/characters/wizard-profile.jpg`, quests: 20, minutes: 340, streak: 4 },
    { name: 'Mr weird', cls: 'Alchemist', img: `${SA}/characters/alchemist-profile.jpg`, quests: 12, minutes: 95, streak: 2 },
  ],
  global: [
    { name: 'Dusk Evening', cls: 'Ranger', img: `${SA}/characters/alchemist-profile.jpg`, quests: 214, minutes: 5120, streak: 61 },
    { name: 'Opal Gem', cls: 'Knight', img: null, quests: 198, minutes: 4308, streak: 44 },
    { name: 'Phoenix Flame', cls: 'Wizard', img: `${SA}/characters/wizard-profile.jpg`, quests: 187, minutes: 3990, streak: 38 },
    { name: 'Greg the Destroyer', cls: 'Knight', img: null, quests: 47, minutes: 812, streak: 9 },
    { name: 'Tommy', cls: 'Knight', you: true, img: null, quests: 36, minutes: 139, streak: 0 },
  ],
};
const METRICS = [
  { id: 'quests', label: 'Quests', icon: 'check-circle', unit: 'quests' },
  { id: 'minutes', label: 'Minutes', icon: 'clock', unit: 'min offline' },
  { id: 'streak', label: 'Streaks', icon: 'flame', unit: 'day streak' },
];

function LeaderboardScreen({ onBack }) {
  const [scope, setScope] = React.useState('friends');
  const [metric, setMetric] = React.useState('quests');
  const m = METRICS.find((x) => x.id === metric);
  const rows = [...BOARDS[scope]].sort((a, b) => b[metric] - a[metric]);
  const top = rows[0];
  return (
    <div className="tab-scroll" data-screen-label="Leaderboard">
      <SubHeader title="Leaderboard" subtitle="The fire draws many travelers." onBack={onBack} />
      {/* Scope toggle */}
      <div style={{ display: 'flex', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: 3, margin: '10px 0 12px' }}>
        {['friends', 'global'].map((s) => (
          <button key={s} onClick={() => setScope(s)} style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, textTransform: 'capitalize',
            background: scope === s ? 'var(--accent-primary)' : 'transparent',
            color: scope === s ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            transition: 'background var(--duration-fast) var(--ease-out)',
          }}>{s}</button>
        ))}
      </div>
      {/* Metric chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {METRICS.map((x) => <Chip key={x.id} tone="ember" selected={metric === x.id} onClick={() => setMetric(x.id)}>{x.label}</Chip>)}
      </div>
      {/* Champion */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface-raised)', border: '1px solid rgba(247,164,75,0.3)', borderRadius: 'var(--radius-lg)', padding: '20px 16px 18px', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
        <SEyebrow tone="warm">First flame</SEyebrow>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '12px auto 10px', overflow: 'hidden', border: '2px solid var(--ember-sandy)', boxShadow: 'var(--glow-warm)', background: 'var(--ember-bone-a06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-accent)' }}>
          {top.img ? <img src={top.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="user" size={30} />}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, color: 'var(--text-primary)' }}>{top.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{top.cls}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--ember-sandy)', marginTop: 8 }}>{top[metric].toLocaleString()}</div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.unit}</div>
      </div>
      {/* Rows */}
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden', margin: '12px 0 20px' }}>
        {rows.slice(1).map((r, i) => (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none',
            background: r.you ? 'rgba(247,164,75,0.08)' : 'transparent',
          }}>
            <span style={{ width: 20, fontFamily: 'var(--font-display)', fontSize: 17, color: r.you ? 'var(--ember-sandy)' : 'var(--text-muted)' }}>{i + 2}</span>
            <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'var(--ember-bone-a06)', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
              {r.img ? <img src={r.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="user" size={17} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: r.you ? 700 : 500, color: 'var(--text-primary)' }}>{r.name}</span>
              {r.you && <span style={{ fontSize: 12.5, color: 'var(--text-accent)', marginLeft: 6 }}>You</span>}
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r[metric].toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SubHeader, SkillTreeScreen, LeaderboardScreen });
