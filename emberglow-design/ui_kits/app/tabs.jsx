// Tab screens: Journal, Profile, Play, Map (placeholder), Settings
const { Button, Badge, EyebrowLabel, XPBar, ListItem, Switch } = window.EmberglowDesignSystem_28f42d;
const A = '../../assets';

/* ————— Journal ————— */
const JOURNAL_ENTRIES = [
  { title: "The Watcher's Gate", type: 'Story', status: 'Completed', xp: 120, date: 'Jul 9', minutes: 25 },
  { title: 'go play', type: 'Co-op', status: 'Completed', xp: 90, date: 'Jul 9', minutes: 30 },
  { title: 'run', type: 'Co-op', status: 'Completed', xp: 15, date: 'Jul 7', minutes: 5 },
  { title: '5 am run club', type: 'Co-op', status: 'Completed', xp: 126, date: 'Jul 7', minutes: 30 },
  { title: 'run', type: 'Co-op', status: 'Completed', xp: 15, date: 'Jul 7', minutes: 5 },
  { title: "Stone Library & King's Method", type: 'Story', status: 'Failed', date: 'Jul 5', minutes: 1 },
  { title: "Stone Library & King's Method", type: 'Story', status: 'Failed', date: 'Jul 5', minutes: 2 },
];

function JournalScreen({ onNavigate, onOpenEntry = () => {} }) {
  const [type, setType] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const entries = JOURNAL_ENTRIES.filter((e) => (type === 'All' || e.type === type) && (status === 'All' || e.status === status));
  const typeIcon = { Story: 'scroll', 'Co-op': 'users', Custom: 'feather' };
  return (
    <div className="tab-scroll" data-screen-label="Journal">
      <TabHeader title="Journal" subtitle="Every quest leaves a mark." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 6px' }}>
        {['All', 'Story', 'Custom', 'Co-op'].map((t) => <Chip key={t} tone="ember" selected={type === t} onClick={() => setType(t)}>{t}</Chip>)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', 'Completed', 'Failed'].map((s) => <Chip key={s} selected={status === s} onClick={() => setStatus(s)}>{s === 'All' ? 'All status' : s}</Chip>)}
      </div>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
        {entries.map((e, i) => (
          <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none' }}>
            <ListItem
              leading={<Icon name={typeIcon[e.type] || 'scroll'} size={19} color={e.status === 'Failed' ? 'var(--ember-cinnabar-80)' : 'var(--text-accent)'} />}
              title={e.title}
              subtitle={`${e.date} · ${e.minutes} min · ${e.type}`}
              onClick={() => onOpenEntry(e)}
              trailing={e.status === 'Failed'
                ? <Badge tone="ember">Failed</Badge>
                : <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>+{e.xp} XP</span>}
            />
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 14.5, color: 'var(--text-muted)' }}>
            No quests here yet. The road is still open.
          </div>
        )}
      </div>
    </div>
  );
}

/* ————— Profile ————— */
function ProfileScreen({ onOpen = () => {}, onInvite = () => {}, extraGuilds = [] }) {
  return (
    <div className="tab-scroll" data-screen-label="Profile">
      <TabHeader title="Profile" />
      {/* Hero card */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', marginTop: 10 }}>
        <div style={{ height: 300, background: `url(${A}/backgrounds/card-background-alt.jpg) center 12% / cover` }}></div>
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '65%', background: 'var(--scrim-bottom)' }}></div>
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)' }}>Tommy</span>
            <Icon name="pencil" size={15} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-accent)', marginTop: 4 }}>Level 6 · Knight</div>
          <XPBar level={6} xp={741} xpNext={759} style={{ marginTop: 12 }} />
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
        {[['35', 'Quests'], ['139', 'Minutes saved'], ['0', 'Day streak']].map(([n, l]) => (
          <div key={l} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ember-bone)' }}>{n}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      {/* Links */}
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', marginTop: 12, overflow: 'hidden' }}>
        <ListItem leading={<Icon name="sparkles" size={19} />} title="Skills & Perks" subtitle="Unlock your first perk" trailing={<Icon name="chevron-right" size={17} />} onClick={() => onOpen('skills')} />
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="trending-up" size={19} />} title="Leaderboard" subtitle="See how others are doing" trailing={<Icon name="chevron-right" size={17} />} onClick={() => onOpen('leaderboard')} />
        </div>
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="award" size={19} />} title="Achievements" subtitle="Track your progress" trailing={<Icon name="chevron-right" size={17} />} onClick={() => onOpen('achievements')} />
        </div>
      </div>
      {/* Guilds */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 8px' }}>
        <EyebrowLabel tone="warm">Guilds · {2 + extraGuilds.length} of 3</EyebrowLabel>
        <Button variant="ghost" size="sm" onClick={() => onOpen('createguild')} disabled={2 + extraGuilds.length >= 3}>+ Create</Button>
      </div>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
        <ListItem leading={<Icon name="flag" size={19} />} title="Runner's Highness" subtitle="Carry the torches · 2 members" trailing={<Badge tone="neutral">Owner</Badge>} onClick={() => {}} />
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="beer" size={19} />} title="workfriends" subtitle="1 member" trailing={<Badge tone="neutral">Owner</Badge>} onClick={() => {}} />
        </div>
        {extraGuilds.map((g) => (
          <div key={g.name} style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <ListItem leading={<Icon name={g.icon} size={19} />} title={g.name} subtitle={`${g.motto ? g.motto + ' · ' : ''}${g.members} member${g.members === 1 ? '' : 's'}`} trailing={<Badge tone="neutral">Owner</Badge>} onClick={() => {}} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14 }}>Join with a code</a>
      </div>
      {/* Friends */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 8px' }}>
        <EyebrowLabel tone="warm">Friends · 3</EyebrowLabel>
        <Button variant="ghost" size="sm" onClick={onInvite}>+ Invite</Button>
      </div>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden', marginBottom: 20 }}>
        {[
          ['jimmers', 'Wizard', `${A}/characters/wizard-profile.jpg`],
          ['Mr weird', 'Alchemist', `${A}/characters/alchemist-profile.jpg`],
          ['Greg the Destroyer', 'Knight', null],
        ].map(([name, cls, img], i) => (
          <div key={name} style={{ borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none' }}>
            <ListItem
              leading={img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="user" size={19} />}
              title={name} subtitle={cls}
              trailing={<span style={{ fontSize: 13.5 }}>Remove</span>}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ————— Play ————— */
const ADVENTURES = [
  {
    kind: 'Story quest', title: "Stone Library & King's Method", meta: '2 min · 90 XP',
    body: 'After escaping into the forest, Rowan and I confronted uncomfortable truths about Vaedros\u2019 fall.',
    image: `${A}/backgrounds/card-background-alt.jpg`, progress: 0.48, cta: 'Enter the library',
  },
  {
    kind: 'Free play', title: 'Start Custom Quest', meta: '5 min · 15 XP',
    body: 'An adventure of your own design. Name it, set the time, put the phone down.',
    image: `${A}/backgrounds/onboarding-bg.jpg`, cta: 'Create custom quest',
  },
  {
    kind: 'Co-op', title: 'Quest With Friends', meta: 'Everyone keeps their phone locked',
    body: 'If anyone unlocks early, everyone fails together. Carry the torches.',
    image: null, cta: 'Gather your party',
  },
];

function PlayScreen({ onStartQuest }) {
  const [idx, setIdx] = React.useState(0);
  const av = ADVENTURES[idx];
  return (
    <div className="tab-scroll" data-screen-label="Play" style={{ display: 'flex', flexDirection: 'column' }}>
      <TabHeader title="Choose your adventure" subtitle="Continue the story, craft your own quest, or ride with friends." />
      {/* Card */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', marginTop: 12, flexShrink: 0 }}>
        <div style={{ height: 380, background: av.image ? `url(${av.image}) center 25% / cover` : 'var(--surface-raised)' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,18,27,0.95) 8%, rgba(0,18,27,0.45) 45%, rgba(0,18,27,0.15))' }}></div>
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>
          <EyebrowLabel>{av.kind}</EyebrowLabel>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, lineHeight: 1.12, color: 'var(--text-primary)', margin: '8px 0 4px' }}>{av.title}</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 8 }}>{av.meta}</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>{av.body}</p>
          {av.progress != null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                <span>Story progress</span><span>{Math.round(av.progress * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 'var(--radius-pill)', background: 'rgba(232,220,199,0.18)' }}>
                <div style={{ height: '100%', width: `${av.progress * 100}%`, borderRadius: 'var(--radius-pill)', background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '14px 0' }}>
        {ADVENTURES.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 'var(--radius-pill)', cursor: 'pointer', background: i === idx ? 'var(--ember-sandy)' : 'var(--ember-bone-a12)', transition: 'all var(--duration-base) var(--ease-out)' }}></div>
        ))}
      </div>
      <Button variant="primary" size="lg" fullWidth onClick={() => onStartQuest(av)} style={{ flexShrink: 0 }}>{av.cta}</Button>
    </div>
  );
}

/* ————— Map (placeholder — no source reference provided) ————— */
function MapScreen() {
  return (
    <div className="tab-scroll" data-screen-label="Map" style={{ display: 'flex', flexDirection: 'column' }}>
      <TabHeader title="Map" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', margin: '12px 0 20px', padding: 24 }}>
        <Icon name="map" size={30} color="var(--text-muted)" />
        <div style={{ fontSize: 14.5, color: 'var(--text-muted)', maxWidth: '26ch', lineHeight: 1.5 }}>Left blank on purpose — no Map reference was provided for this kit.</div>
      </div>
    </div>
  );
}

/* ————— Settings ————— */
function SettingsScreen() {
  const [notif, setNotif] = React.useState(true);
  const [daily, setDaily] = React.useState(false);
  const [streak, setStreak] = React.useState(true);
  return (
    <div className="tab-scroll" data-screen-label="Settings">
      <TabHeader title="Settings" />
      <EyebrowLabel tone="muted" style={{ margin: '14px 0 8px' }}>Account</EyebrowLabel>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
        <ListItem leading={<Icon name="user" size={19} />} title="thomas@shellberg.com" subtitle="Signed in" trailing={<span style={{ fontSize: 13.5 }}>Log out</span>} />
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="crown" size={19} />} title="emberglow Premium" subtitle="Manage subscription" trailing={<Icon name="chevron-right" size={17} />} onClick={() => {}} />
        </div>
      </div>
      <EyebrowLabel tone="muted" style={{ margin: '20px 0 8px' }}>Preferences</EyebrowLabel>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden', marginBottom: 20 }}>
        <ListItem leading={<Icon name="globe" size={19} />} title="Timezone" subtitle="Berlin" trailing={<Icon name="chevron-right" size={17} />} onClick={() => {}} />
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="bell" size={19} />} title="Notifications" trailing={<Switch checked={notif} onChange={setNotif} />} />
        </div>
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="clock" size={19} />} title="Daily reminder" trailing={<Switch checked={daily} onChange={setDaily} />} />
        </div>
        <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <ListItem leading={<Icon name="flame" size={19} />} title="Streak warning" subtitle="Reminder at 8:00 PM" trailing={<Switch checked={streak} onChange={setStreak} />} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { JournalScreen, ProfileScreen, PlayScreen, MapScreen, SettingsScreen });
