// Public events: discover / my events + schedule-an-event form
const { Button: EButton, Badge: EBadge, EyebrowLabel: EEyebrow } = window.EmberglowDesignSystem_28f42d;

const SEED_EVENTS = [
  { id: 1, title: 'Sunset trail walk', category: 'Outdoors', minutes: 45, xp: 135, when: 'Today · 7:30 PM', host: 'Dusk Evening', joined: 12 },
  { id: 2, title: 'Deep work sprint', category: 'Work', minutes: 90, xp: 270, when: 'Tomorrow · 9:00 AM', host: 'Opal Gem', joined: 34 },
  { id: 3, title: 'Morning pages', category: 'Creative', minutes: 30, xp: 90, when: 'Sat · 8:00 AM', host: 'Phoenix Flame', joined: 8 },
];

function EventCard({ ev, mine, onJoin }) {
  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid ' + (ev.registered || mine ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'), borderRadius: 'var(--radius-lg)', padding: '15px 16px', boxShadow: 'var(--shadow-raised)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text-primary)' }}>{ev.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{ev.when} · {ev.minutes} min · hosted by {ev.host}</div>
        </div>
        <EBadge tone="warm">+{ev.xp} XP</EBadge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <Icon name="users" size={14} color="var(--text-accent)" /> {ev.joined} registered
        </div>
        {mine ? (
          <EBadge tone="ember">{ev.hosting ? 'Hosting' : 'Registered'}</EBadge>
        ) : ev.registered ? (
          <EBadge tone="success">Registered</EBadge>
        ) : (
          <EButton variant="secondary" size="sm" onClick={onJoin}>Register</EButton>
        )}
      </div>
    </div>
  );
}

function PublicEventsScreen({ onBack, onCreate, myEvents }) {
  const [tab, setTab] = React.useState('discover');
  const [events, setEvents] = React.useState(SEED_EVENTS);
  const register = (id) => setEvents((es) => es.map((e) => e.id === id ? { ...e, registered: true, joined: e.joined + 1 } : e));
  const mine = [...myEvents, ...events.filter((e) => e.registered)];
  return (
    <div className="tab-scroll" data-screen-label="Public Events" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Public events" subtitle="Scheduled quests, open to every traveler." onBack={onBack} />
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 14px' }}>
        <Chip tone="ember" selected={tab === 'discover'} onClick={() => setTab('discover')}>Discover</Chip>
        <Chip tone="ember" selected={tab === 'mine'} onClick={() => setTab('mine')}>My events</Chip>
      </div>
      {tab === 'discover' ? (
        <React.Fragment>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((ev) => <EventCard key={ev.id} ev={ev} onJoin={() => register(ev.id)} />)}
          </div>
          <div style={{ flex: 1, minHeight: 20 }}></div>
          <EButton variant="primary" size="lg" fullWidth onClick={onCreate} style={{ marginTop: 16 }}>Schedule an event</EButton>
        </React.Fragment>
      ) : mine.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mine.map((ev) => <EventCard key={ev.id} ev={ev} mine />)}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, padding: '40px 20px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ticket" size={30} color="var(--ember-aegean-60)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>Nothing on your calendar</div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-muted)', maxWidth: '28ch' }}>Register for a community quest, or host your own.</p>
          <EButton variant="secondary" onClick={() => setTab('discover')} style={{ marginTop: 8 }}>Discover events</EButton>
        </div>
      )}
    </div>
  );
}

/* ————— Schedule an event ————— */
const MS_DAY = 86400000;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtDay(d) {
  const today = new Date();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, new Date(today.getTime() + MS_DAY))) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* Compact month calendar — selectable from today to +3 months */
function CalendarPicker({ value, onChange }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const max = new Date(today); max.setMonth(max.getMonth() + 3);
  const [view, setView] = React.useState(() => new Date((value || today).getFullYear(), (value || today).getMonth(), 1));
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= new Date(max.getFullYear(), max.getMonth(), 1);
  const firstDow = (view.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div onClick={() => canPrev && setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canPrev ? 'pointer' : 'default', color: canPrev ? 'var(--text-secondary)' : 'var(--ember-bone-a12)' }}><Icon name="chevron-left" size={18} /></div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-primary)' }}>{MONTH_NAMES[view.getMonth()]} {view.getFullYear()}</span>
        <div onClick={() => canNext && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canNext ? 'pointer' : 'default', color: canNext ? 'var(--text-secondary)' : 'var(--ember-bone-a12)' }}><Icon name="chevron-right" size={18} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i}></div>;
          const disabled = d < today || d > max;
          const sel = sameDay(d, value);
          const isToday = sameDay(d, today);
          return (
            <div key={i} onClick={() => !disabled && onChange(d)} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', cursor: disabled ? 'default' : 'pointer',
              fontSize: 13.5, fontWeight: sel ? 700 : 500, fontVariantNumeric: 'tabular-nums',
              background: sel ? 'var(--accent-primary)' : 'transparent',
              boxShadow: sel ? 'var(--glow-ember)' : 'none',
              border: isToday && !sel ? '1px solid rgba(247,164,75,0.45)' : '1px solid transparent',
              color: disabled ? 'var(--ember-bone-a12)' : sel ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              transition: 'background var(--duration-fast) var(--ease-out)',
            }}>{d.getDate()}</div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>Events can be scheduled up to 3 months ahead</div>
    </div>
  );
}

function ScheduleEventScreen({ onBack, onCreated }) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [category, setCategory] = React.useState('fitness');
  const [startHour, setStartHour] = React.useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d;
  });
  const [date, setDate] = React.useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + MS_DAY);
  const pct = ((minutes - 5) / (180 - 5)) * 100;
  const xp = minutes * 3;
  const ready = title.trim().length > 0;
  const end = new Date(startHour.getTime() + minutes * 60000);
  const shiftHour = (dir) => setStartHour((d) => new Date(d.getTime() + dir * 30 * 60000));
  return (
    <div className="tab-scroll" data-screen-label="Schedule Event" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubHeader title="Schedule an event" subtitle="A quest with a start time, open to everyone." onBack={onBack} />
      {/* Sentence form */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '20px 18px 22px', marginTop: 12, boxShadow: 'var(--shadow-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>We will</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="walk at sunset"
            style={{ flex: 1, minWidth: 140, fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ember-sandy)', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid var(--border-strong)', padding: '0 2px 4px', caretColor: 'var(--ember-sandy)' }} />
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
      </div>
      {/* Starts at */}
      <EEyebrow tone="warm" style={{ margin: '20px 0 10px' }}>Starts at</EEyebrow>
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Chip tone="ember" selected={!pickerOpen && sameDay(date, today)} onClick={() => { setDate(today); setPickerOpen(false); }}>Today</Chip>
          <Chip tone="ember" selected={!pickerOpen && sameDay(date, tomorrow)} onClick={() => { setDate(tomorrow); setPickerOpen(false); }}>Tomorrow</Chip>
          <Chip tone="ember" selected={pickerOpen || (!sameDay(date, today) && !sameDay(date, tomorrow))} onClick={() => setPickerOpen(!pickerOpen)}>
            {!sameDay(date, today) && !sameDay(date, tomorrow) ? fmtDay(date) : 'Pick a date'}
          </Chip>
        </div>
        {pickerOpen && <CalendarPicker value={date} onChange={(d) => { setDate(d); setPickerOpen(false); }} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: pickerOpen ? 14 : 0 }}>
          <div onClick={() => shiftHour(-1)} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><Icon name="minus" size={18} /></div>
          <div style={{ textAlign: 'center', minWidth: 130 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 2 }}>{fmtDay(date)}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ember-sandy)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(startHour)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ends {fmtClock(end)}</div>
          </div>
          <div onClick={() => shiftHour(1)} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><Icon name="plus" size={18} /></div>
        </div>
      </div>
      {/* Category */}
      <EEyebrow tone="warm" style={{ margin: '20px 0 10px' }}>What kind of quest?</EEyebrow>
      <CategoryPicker value={category} onChange={setCategory} />
      <div style={{ flex: 1, minHeight: 16 }}></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0 12px' }}>
        <EBadge tone="warm">+{xp} XP</EBadge>
        <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>for everyone who finishes</span>
      </div>
      <EButton variant="primary" size="lg" fullWidth disabled={!ready} onClick={() => onCreated({
        id: 'mine-' + Date.now(),
        title: title.trim().charAt(0).toUpperCase() + title.trim().slice(1),
        category, minutes, xp,
        when: fmtDay(date) + ' · ' + fmtClock(startHour),
        host: 'Tommy', joined: 1, hosting: true,
      })}>
        {ready ? 'Create event' : 'Name your event to continue'}
      </EButton>
    </div>
  );
}

Object.assign(window, { PublicEventsScreen, ScheduleEventScreen });
