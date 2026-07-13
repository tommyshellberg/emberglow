// Achievements screen + Invite Friends bottom sheet
const { Badge: ABadge, Button: AButton, EyebrowLabel: AEyebrow, BottomSheet: ASheet } = window.EmberglowDesignSystem_28f42d;

/* ————— Achievements ————— */
const ACHIEVEMENT_GROUPS = [
  { group: 'Daily streak', icon: 'flame', items: [
    { name: 'First Steps', desc: 'Complete quests 2 days in a row', progress: [1, 2] },
    { name: 'Keeper of the Flame', desc: 'A 7-day streak', progress: [1, 7] },
    { name: 'Eternal Fire', desc: 'A 30-day streak', progress: [1, 30] },
  ]},
  { group: 'Quest completion', icon: 'map', items: [
    { name: 'Quest Beginner', desc: 'Complete 3 quests', done: true },
    { name: 'Seasoned Adventurer', desc: 'Complete 25 quests', done: true },
    { name: 'Legend of the Road', desc: 'Complete 100 quests', progress: [35, 100] },
  ]},
  { group: 'Time reclaimed', icon: 'hourglass', items: [
    { name: 'An Hour Regained', desc: '60 minutes offline', done: true },
    { name: 'A Day Returned', desc: '24 hours offline in total', progress: [139, 1440] },
    { name: 'A Week of Wonders', desc: '7 days offline in total', progress: [139, 10080] },
  ]},
];

function AchievementCard({ a }) {
  const done = !!a.done;
  const pct = a.progress ? Math.min(1, a.progress[0] / a.progress[1]) : 1;
  return (
    <div style={{
      background: done ? 'rgba(247,164,75,0.10)' : 'var(--surface-raised)',
      border: '1px solid ' + (done ? 'rgba(247,164,75,0.45)' : 'var(--border-hairline)'),
      boxShadow: done ? 'var(--glow-warm)' : 'none',
      borderRadius: 'var(--radius-lg)', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(247,164,75,0.18)' : 'var(--ember-bone-a06)', border: '1px solid ' + (done ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? 'var(--ember-sandy)' : 'var(--text-secondary)' }}>
        <Icon name={done ? 'award' : 'lock'} size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</span>
          {done && <ABadge tone="warm">Unlocked</ABadge>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{a.desc}</div>
        {!done && a.progress && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 5, borderRadius: 'var(--radius-pill)', background: 'var(--ember-aegean-a35)' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, minWidth: pct > 0 ? 4 : 0, borderRadius: 'var(--radius-pill)', background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))' }}></div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{a.progress[0].toLocaleString()} / {a.progress[1].toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementsScreen({ onBack }) {
  const total = ACHIEVEMENT_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const done = ACHIEVEMENT_GROUPS.reduce((n, g) => n + g.items.filter((a) => a.done).length, 0);
  return (
    <div className="tab-scroll" data-screen-label="Achievements">
      <SubHeader title="Achievements" subtitle={`${done} of ${total} unlocked. The road remembers.`} onBack={onBack} />
      {ACHIEVEMENT_GROUPS.map((g) => (
        <div key={g.group} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name={g.icon} size={16} color="var(--text-accent)" />
            <AEyebrow tone="warm">{g.group}</AEyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.items.map((a) => <AchievementCard key={a.name} a={a} />)}
          </div>
        </div>
      ))}
      <div style={{ height: 20 }}></div>
    </div>
  );
}

/* ————— Invite Friends sheet (contacts from device) ————— */
const CONTACTS = [
  { name: 'Anna Haro', email: 'anna-haro@mac.com' },
  { name: 'Daniel Higgins Jr.', email: 'd-higgins@mac.com' },
  { name: 'Hank M. Zakroff', email: 'hank-zakroff@mac.com' },
  { name: 'John Appleseed', email: 'John-Appleseed@mac.com' },
  { name: 'Kate Bell', email: 'kate-bell@mac.com' },
];

function InviteFriendsSheet({ open, onClose }) {
  const [query, setQuery] = React.useState('');
  const [picked, setPicked] = React.useState([]);
  const [sent, setSent] = React.useState(false);
  const list = CONTACTS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = (email) => setPicked((p) => p.includes(email) ? p.filter((e) => e !== email) : [...p, email]);
  const close = () => { setSent(false); setPicked([]); setQuery(''); onClose(); };
  return (
    <ASheet open={open} onClose={close} title="Invite friends">
      {sent ? (
        <div style={{ textAlign: 'center', padding: '18px 0 8px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(247,164,75,0.12)', border: '1px solid rgba(247,164,75,0.4)', boxShadow: 'var(--glow-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={28} color="var(--ember-sandy)" />
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-primary)', margin: '0 0 4px' }}>Invitations sent</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 20px' }}>The fire is warmer with company.</p>
          <AButton variant="secondary" fullWidth onClick={close}>Done</AButton>
        </div>
      ) : (
        <React.Fragment>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 12px', textAlign: 'center' }}>From your contacts. Quest together, keep each other honest.</p>
          <SInputSearch query={query} setQuery={setQuery} />
          <div style={{ margin: '12px 0', maxHeight: 280, overflowY: 'auto', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            {list.map((c, i) => {
              const sel = picked.includes(c.email);
              return (
                <div key={c.email} onClick={() => toggle(c.email)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.email}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'), background: sel ? 'var(--ember-sandy)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a2410', transition: 'all var(--duration-fast) var(--ease-out)' }}>
                    {sel && <Icon name="check" size={13} />}
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <div style={{ padding: 18, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>No one by that name here.</div>}
          </div>
          <AButton variant="primary" size="lg" fullWidth disabled={picked.length === 0} onClick={() => setSent(true)}>
            {picked.length === 0 ? 'Select contacts' : `Invite ${picked.length} ${picked.length === 1 ? 'friend' : 'friends'}`}
          </AButton>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14 }}>Add by email instead</a>
          </div>
        </React.Fragment>
      )}
    </ASheet>
  );
}

function SInputSearch({ query, setQuery }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'inline-flex' }}><Icon name="search" size={17} /></span>
      <input
        value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts"
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 15.5, color: 'var(--text-primary)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px 12px 42px', outline: 'none' }}
      />
    </div>
  );
}

Object.assign(window, { AchievementsScreen, InviteFriendsSheet });
