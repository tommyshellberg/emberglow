// Quest flow: StartQuest (pending) → Timer → Complete / Failed
const { Button: QButton, Badge: QBadge, EyebrowLabel: QEyebrow, ProgressRing: QRing } = window.EmberglowDesignSystem_28f42d;
const QA = '../../assets';

/* ————— Start Quest (pending) ————— */
function StartQuestScreen({ quest, onBegin, onCancel }) {
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }} data-screen-label="Start Quest">
      <div style={{ position: 'absolute', inset: 0, background: `url(${QA}/backgrounds/onboarding-bg.jpg) center 30% / cover` }}></div>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '35%', background: 'var(--scrim-top)' }}></div>
      <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '55%', background: 'var(--scrim-bottom)' }}></div>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '58px 24px 36px', boxSizing: 'border-box', textAlign: 'center' }}>
        <QEyebrow>{quest.kind || 'Story quest'}</QEyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1.12, margin: '10px 0 0', color: 'var(--ember-bone)' }}>{quest.title}</h1>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-accent)', marginTop: 10 }}>{quest.minutes} min · {quest.xp} XP</div>

        <div style={{ flex: 1 }}></div>

        {/* Hero card */}
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', background: 'var(--surface-card)', backdropFilter: 'blur(10px)' }}>
          <div style={{ height: 190, background: `url(${QA}/backgrounds/card-background-alt.jpg) center 8% / cover` }}></div>
          <div style={{ padding: '14px 18px 18px' }}>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Your hero stands ready. The story continues the moment you step away.</p>
            <QBadge tone="warm">+{quest.xp} XP on return</QBadge>
          </div>
        </div>

        <div style={{ flex: 1 }}></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 15, marginBottom: 14 }}>
          <Icon name="lock" size={17} /> Lock your phone to begin
        </div>
        <QButton variant="primary" size="lg" fullWidth onClick={onBegin}>Begin quest</QButton>
        <QButton variant="ghost" fullWidth onClick={onCancel} style={{ marginTop: 6 }}>Cancel quest</QButton>
      </div>
    </div>
  );
}

/* ————— Active Quest (timer) ————— */
function TimerScreen({ quest, onAbandon, onComplete }) {
  const total = quest.minutes * 60;
  const [remaining, setRemaining] = React.useState(Math.round(total * 0.83));
  React.useEffect(() => {
    const t = setInterval(() => setRemaining((r) => {
      const next = Math.max(0, r - 1);
      if (next === 0) { clearInterval(t); setTimeout(onComplete, 900); }
      return next;
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }} data-screen-label="Active Quest Timer">
      <div style={{ position: 'absolute', inset: 0, background: `url(${QA}/backgrounds/card-background-alt.jpg) center 18% / cover` }}></div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,18,27,0.55)' }}></div>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '38%', background: 'var(--scrim-top)' }}></div>
      <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '42%', background: 'var(--scrim-bottom)' }}></div>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 26px 40px', boxSizing: 'border-box', textAlign: 'center' }}>
        <QEyebrow>Quest in progress</QEyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 38, lineHeight: 1.1, margin: '12px 0 10px', color: 'var(--ember-bone)' }}>{quest.title}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0, maxWidth: '28ch' }}>{quest.line || 'The forest darkens. You gather what you can before night falls.'}</p>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <QRing progress={remaining / total} size={248}>
            <div style={{ fontWeight: 700, fontSize: 56, color: 'var(--ember-bone)', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(remaining)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>Of {quest.minutes}:00</div>
          </QRing>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 14px' }}>Keep your phone locked to earn {quest.xp} XP</p>
        <QButton variant="outline" fullWidth onClick={onAbandon}>Abandon quest</QButton>
      </div>
    </div>
  );
}

/* ————— Quest Failed (Guide voice: gentle) ————— */
function QuestFailedScreen({ quest, onRetry, onBack }) {
  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--surface-app)', display: 'flex', flexDirection: 'column', padding: '58px 26px 36px', boxSizing: 'border-box', textAlign: 'center' }} data-screen-label="Quest Failed">
      <QEyebrow>{quest.kind || 'Story quest'}</QEyebrow>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1.12, margin: '12px 0 8px', color: 'var(--text-primary)' }}>The quest slipped away</h1>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-muted)', margin: 0 }}>{quest.title}</p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        {/* Dimmed ember */}
        <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto', background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="flame-kindling" size={36} color="var(--ember-aegean-60)" />
        </div>
        <div>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--text-primary)', margin: '0 auto 8px', maxWidth: '28ch' }}>That happens. Try again when you're ready.</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 auto', maxWidth: '30ch' }}>The fire is still lit. No XP was lost — the story simply waits.</p>
        </div>
      </div>

      <QButton variant="primary" size="lg" fullWidth onClick={onRetry}>Try again</QButton>
      <QButton variant="ghost" fullWidth onClick={onBack} style={{ marginTop: 6 }}>Back to camp</QButton>
    </div>
  );
}

/* ————— Quest Complete / Quest Details ————— */
const STORY_TEXT = "We tread carefully through the ruins, the weight of old knowledge pressing down with every step. The stone library looms before us, its dome cracked, its entrance flanked by skeletal columns. Inside, shelves lean at unnatural angles, their books rotted, secrets smothered under layers of time. Rowan lights a torch, and the dark gives a little ground.";
const AUDIO_LEN = 121;

function QuestCompleteScreen({ quest, fromJournal = false, onContinue, onReflect }) {
  const isStory = (quest.kind || '').toLowerCase().indexOf('story') !== -1;
  const [playing, setPlaying] = React.useState(false);
  const [pos, setPos] = React.useState(0);
  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => {
      if (p + 1 >= AUDIO_LEN) { setPlaying(false); return AUDIO_LEN; }
      return p + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [playing]);
  const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--surface-app)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto' }} data-screen-label="Quest Complete">
      {/* Art header */}
      <div style={{ position: 'relative', height: 300, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url(../../assets/backgrounds/card-background-alt.jpg) center 10% / cover' }}></div>
        <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '40%', background: 'var(--scrim-top)' }}></div>
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '75%', background: 'linear-gradient(to top, var(--ember-rich-black) 4%, rgba(0,18,27,0.55) 55%, rgba(0,18,27,0))' }}></div>
        <div onClick={onContinue} style={{ position: 'absolute', top: 16, left: 12, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,18,27,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ember-bone)' }}>
          <Icon name="arrow-left" size={20} />
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 16 }}>
          <QEyebrow tone="warm">{quest.kind || 'Story quest'}{fromJournal ? '' : ' · complete'}</QEyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, lineHeight: 1.1, margin: '8px 0 0', color: 'var(--ember-bone)' }}>{quest.title}</h1>
        </div>
      </div>

      <div style={{ padding: '14px 22px 30px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <QBadge tone="warm">+{quest.xp} XP</QBadge>
          <QBadge tone="neutral">{quest.minutes} min offline</QBadge>
          {quest.date && <QBadge tone="neutral">{quest.date}</QBadge>}
          {!fromJournal && <QBadge tone="success">Complete</QBadge>}
        </div>

        {isStory ? (
          <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-raised)' }}>
            <div style={{ padding: '18px 20px 16px' }}>
              <QEyebrow tone="muted" style={{ fontSize: 11, marginBottom: 10 }}>The story so far</QEyebrow>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0, textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, color: 'var(--ember-sandy)', float: 'left', marginRight: 8, marginTop: 4 }}>{(quest.story || STORY_TEXT).charAt(0)}</span>
                {(quest.story || STORY_TEXT).slice(1)}
              </p>
            </div>
            {/* Audio player */}
            <div style={{ padding: '14px 20px 16px', background: 'var(--surface-inset)', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div onClick={() => setPlaying(!playing)} style={{ width: 48, height: 48, flexShrink: 0, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: 'var(--glow-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-on-accent)' }}>
                  <Icon name={playing ? 'pause' : 'play'} size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
                    <span>Listen to this chapter</span><span>{fmtT(pos)} / {fmtT(AUDIO_LEN)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 'var(--radius-pill)', background: 'var(--ember-aegean-a35)', cursor: 'pointer' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos(Math.round(((e.clientX - r.left) / r.width) * AUDIO_LEN)); }}>
                    <div style={{ height: '100%', width: `${(pos / AUDIO_LEN) * 100}%`, borderRadius: 'var(--radius-pill)', background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))', transition: 'width 300ms linear' }}></div>
                  </div>
                </div>
                <div onClick={() => { setPos(0); setPlaying(false); }} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <Icon name="rotate-ccw" size={16} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-raised)' }}>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>You kept the fire and the world waited. Time reclaimed, spent on what matters.</p>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 20 }}></div>
        <QButton variant="primary" size="lg" fullWidth onClick={onReflect} style={{ marginTop: 20 }}>Add reflection</QButton>
        {!fromJournal && <QButton variant="secondary" fullWidth onClick={onContinue} style={{ marginTop: 6 }}>Continue</QButton>}
      </div>
    </div>
  );
}

Object.assign(window, { StartQuestScreen, TimerScreen, QuestFailedScreen, QuestCompleteScreen });
