# Emberglow Design System

**emberglow turns phone breaks into epic adventures.** Your hero quests while you're offline, the story grows with every step — and you become the kind of person who chooses life over scrolling. It is the world's first *Narrative Focus Game*: a fantasy RPG where your hero levels up only when you put your phone down.

**Positioning by audience**
- High-pain users (screen addiction / digital detox): the first detox app that *rewards* instead of punishes.
- Curious gamers / productivity explorers: a fantasy RPG where the hero levels up only offline.
- Investors / homepage: a new kind of digital detox app — quests instead of timers or blockers.

**Archetype mix:** 70% Explorer · 20% Everyman · 10% Wizard.
**Core feeling:** the minutes before dawn at a campfire — trade the blue light of the screen for the orange glow of a fire with friends.

## Sources
- `uploads/Emberglow Premium Brand Guide.pdf` — official 2025 brand guide (logo rules, colors + tints, typography, brand icon list). Text extracted; vector pages could not be rasterized.
- `uploads/Screenshot 2026-07-09 at 21.28.04.png` — real app screen: "Collecting Firewood" focus-timer (Quest in Progress).
- Provided assets: app logo (`logo-1024.png`), Erstoria font, onboarding background, quest card background, wizard + alchemist character portraits.
- Voice & tone notes supplied by the founder (see CONTENT FUNDAMENTALS).

## CONTENT FUNDAMENTALS

Two voices, strictly separated by context:

**The Guide** (system UI, emails, prompts, reflection) — warm, human, non-judgmental mentor/friend.
- Short, encouraging, shame-free. Retry & learning over failure.
- First-person and transparent in founder emails: "Last year, I realized my phone was robbing me of moments that mattered…"
- Failure copy: "The quest slipped away. That happens. Try again when you're ready."
- Success copy: "Quest complete. You grew stronger today."
- Camaraderie, not hype: "Glad you're here."

**The Quest Master** (narrative/story) — atmospheric, serious, stripped-down; a weathered storyteller at a campfire.
- Consequences are real: death, loss, endings. Failure is part of the story, never a reflection of the player.
- "The priest's blade finds you, and darkness closes in. This path ends here. But not all stories end the same. Another awaits."

**Mechanics**
- Sentence case everywhere except eyebrow labels, which are ALL-CAPS letterspaced ("QUEST IN PROGRESS", "06 · ACTIVE QUEST").
- Second person ("you") in UI and narrative; first person ("I") only in founder emails.
- No emoji. No exclamation-mark hype. Short declarative sentences.
- Numbers are concrete and diegetic: "Keep your phone locked to earn 72 XP", "12:34 of 15:00".
- System failure = gentle ("It's okay, try again"); narrative failure = consequential but intriguing ("You died — but another path awaits").

## VISUAL FOUNDATIONS

**Mood:** minutes before dawn at a campfire. Deep blue night pierced by warm ember light. Dark, moody, outdoors/forest.

- **Color:** Rich Black `#00121b` canvas → Midnight Blue `#162034` surfaces → Aegean Blue `#2c456b` borders/muted. Warmth is scarce and precious: Cinnabar `#d94928` for the primary accent/actions, Sandy Brown `#f7a44b` for glow/XP/highlights, Bone `#e8dcc7` for text. Tints (80/60/40/20 toward white) per the brand guide. Cool blues dominate ~90% of any screen; orange is the ember — small, bright, meaningful.
- **Type:** Erstoria (display serif, regular only) for screen titles, quest names, headings 1–3. Source Sans 3 for everything else; body 16–18px, line-height 1.5 (guide: size × 1.5). Eyebrow labels: Source Sans 3 semibold, 12–13px, 0.22em tracking, uppercase, Cinnabar or Sandy.
- **Backgrounds:** full-bleed hand-painted fantasy art (dusky blues + one orange light source) behind key screens, protected by scrims — `--scrim-top` / `--scrim-bottom` gradients from Rich Black. Plain screens use Rich Black with subtle Midnight cards. Never white backgrounds in-app (email is the exception: clean, minimal, white/green founder voice).
- **Imagery color vibe:** muted fantasy tones, hand-painted, dusky, rugged. Always the same duotone logic — cold blue shadow, warm orange rim-light.
- **Cards:** Midnight Blue at ~72% opacity over art (or solid on plain screens), 16px radius, 1px hairline border `rgba(232,220,199,0.12)`, soft deep shadow. No colored left-border accents.
- **Borders:** 1px, subtle — either bone hairline (on dark) or Aegean at 45%.
- **Shadows/glow:** deep soft black shadows for elevation; warm glows (`--glow-ember`, `--glow-warm`) reserved for active/accented elements (timer ring, primary button, XP moments).
- **Corner radii:** 8 / 12 / 16 / 24 / pill. Buttons: pill or 12px. Cards 16px.
- **Transparency & blur:** translucent midnight surfaces over artwork; `backdrop-filter: blur(8–12px)` acceptable on overlays and sticky bars.
- **Hover:** slight lightening (accent-primary-hover) or bone-alpha wash `rgba(232,220,199,0.06)`; **press:** darken + scale(0.98). No bounces.
- **Motion:** slow and ember-like — fades and gentle rises, `cubic-bezier(0.22,1,0.36,1)`, 260–600ms. Flicker/glow pulses only on the fire-related accents. No spinners; use the ember ring.
- **Layout:** mobile-first 390px frames; generous vertical rhythm; primary action pinned to bottom; eyebrow → Erstoria title → supporting body as the standard header stack.

## ICONOGRAPHY

- The brand guide defines a **colored brand icon set**: Daily Quests, User, Timer/Hourglass, Quill, Achievement, Scroll, Orb, Settings, Rewards, Tutorial, In Progress, Customer Support. These are vector art inside the PDF and **could not be extracted** — ask the founder for SVG exports.
- **Substitution (flagged):** UI icons use [Lucide](https://lucide.dev) from CDN — thin 1.5–2px stroke, no fill — colored Bone or Sandy. Closest match to the guide's line-drawn fantasy glyphs. Suggested mappings: scroll→`scroll`, timer→`hourglass`, quill→`feather`, achievement→`award`, orb→`sparkles`, quests→`map`, rewards→`gift`, settings→`settings`, user→`user`.
- Logo: flame-swirl "e" mark (`assets/logo-1024.png`), orange gradient on transparent. Min size 25px digital. No unofficial recolors.
- No emoji, ever. Unicode glyphs only for the `·` separator in labels.

## Index

- `styles.css` — global entry; imports `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`.
- `assets/` — logo, fonts (Erstoria), backgrounds (onboarding, quest card), character portraits (wizard, alchemist).
- `guidelines/` — foundation specimen cards (colors, tints, type, spacing, effects, voice).
- `components/core/` — Button, IconButton, Input, Badge, Switch, EyebrowLabel.
- `components/quest/` — QuestCard, ProgressRing, XPBar, ListItem.
- `components/overlay/` — BottomSheet (announcements, invites, pickers).
- `ui_kits/app/` — Emberglow mobile app: tabs (Journal, Map placeholder, Play, Profile, Settings), sub-screens (Skill Tree, Leaderboard, Achievements), quest flow (Start → Timer → Complete/Failed), Invite Friends sheet.
- `SKILL.md` — agent skill entry point.

**Intentional additions** (no component inventory existed in sources; set derived from the app screenshot + brand needs): ProgressRing (focus timer ring), XPBar (leveling), QuestCard (core content unit), EyebrowLabel (signature label style).
