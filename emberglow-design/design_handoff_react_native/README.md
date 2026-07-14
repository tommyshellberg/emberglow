# Handoff: Emberglow Design System → React Native

## Overview
This package is the Emberglow design system (dark, moody, campfire-at-dawn fantasy RPG for a digital-detox app) plus a fully clickable HTML prototype of the mobile app. The goal in the target codebase: **first build pixel-perfect base components from the tokens, then recompose the screens** using those components.

## About the Design Files
Everything here is a **design reference built in HTML/React-for-web** — not production code. Recreate it in the existing React Native project using its established patterns (navigation, state, lists). Do not port the HTML/JSX directly; lift the exact values and structure.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly at 390pt design width. The one exception: UI icons are Lucide stand-ins (see Assets) pending official brand SVGs.

## Implementation order (recommended)
1. **Theme module** — port `tokens/*.css` into a typed `theme.ts` (colors, spacing, radii, type scale, durations). Values below.
2. **Fonts** — bundle `assets/fonts/Erstoria-Regular.ttf` (display, single weight — never bold or all-caps) and Source Sans 3 (Google Fonts; weights 300–700).
3. **Base components, pixel-perfect** — match `components/*/` one-to-one:
   - `core/`: Button (pill; primary/secondary/ghost/outline; sm 36 / md 48 / lg 54pt heights), IconButton (44pt round), Input (inset dark, Sandy focus glow), Badge (uppercase pill; ember/warm/neutral/success), Switch (ember glow when on), EyebrowLabel (12–13pt, 600, 0.22em tracking, uppercase)
   - `quest/`: QuestCard (art + bottom scrim), ProgressRing (SVG arc, Cinnabar, glow, round cap, starts at 12 o'clock), XPBar (Cinnabar→Sandy gradient), ListItem
   - `overlay/`: BottomSheet (86% max height, grabber, scrim, 24pt top radius)
   Each component has a `.d.ts` (props contract) and `.prompt.md` (usage) beside its `.jsx` — treat the `.jsx` as the visual spec, the `.d.ts` as the API.
4. **Screens** — recreate from `ui_kits/app/` (see Screens). Bottom nav is fixed: Journal · Map · Play (raised 58pt Cinnabar orb, -34pt overlap) · Profile · Settings.

## Design Tokens (exact values)
Colors — base:
- Rich Black `#00121b` (app background) · Midnight Blue `#162034` (raised surfaces) · Aegean Blue `#2c456b` (borders/muted) · Cinnabar `#d94928` (primary accent) · Sandy Brown `#f7a44b` (glow/XP/values) · Bone `#e8dcc7` (text)
- Tints (80/60/40/20 toward white) and alpha helpers: see `tokens/colors.css` — port every `--*` custom property as a theme key, including semantic aliases (`surface-card` = rgba(22,32,52,0.72), `text-secondary` = Bone @70%, `border-hairline` = Bone @12%, etc).

Typography:
- Display: Erstoria, regular only. Hero 44 / H1 34 / H2 26, line-height 1.12.
- Body/UI: Source Sans 3. H3 20 semibold, body 16–18, small 14, caption 12; line-height 1.5 (brand rule: size × 1.5).
- Eyebrow: Source Sans 3 semibold 12–13, letter-spacing 0.22em, uppercase.

Spacing: 4-pt scale — 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
Radii: 8 / 12 / 16 / 24 / pill(999). Cards 16, buttons pill, sheets 24 top.
Shadows/glows: card `0 8 28 rgba(0,18,27,0.55)`; ember glow `0 0 24 rgba(217,73,40,0.35)`; warm glow `0 0 32 rgba(247,164,75,0.30)`.
Motion: ease `cubic-bezier(0.22,1,0.36,1)`; 150 / 260 / 600ms. Fades and gentle rises only; no bounces; press = darken + scale 0.98.
Scrims over art: Rich Black gradients (top 85%→0, bottom 92%→0) — never flat overlays.

## React Native translation notes
- CSS variables → a `theme` object; no runtime var() needed (single dark theme).
- Web `box-shadow` glows → iOS `shadowColor/shadowRadius/shadowOpacity`; Android has no colored shadows — approximate glows with a blurred radial gradient view or `react-native-shadow-2`; `elevation` for plain elevation.
- `backdrop-filter: blur` (bottom nav, sheets) → `expo-blur` BlurView, or fall back to rgba(0,18,27,0.88).
- ProgressRing → `react-native-svg` Circle with strokeDasharray/offset (same math as `components/quest/ProgressRing.jsx`).
- Gradients (XP bar, scrims) → `expo-linear-gradient`.
- Duration slider → `@react-native-community/slider` styled to match `.ember-slider` (6pt track, 26pt Bone thumb with Cinnabar ring + glow), or a custom gesture track for pixel parity.
- BottomSheet → `@gorhom/bottom-sheet` skinned to spec (grabber 42×4, radius 24, Midnight surface).
- Hit targets ≥ 44pt everywhere (already respected in the prototype).

## Screens (all in `ui_kits/app/`, one file per concern)
- `tabs.jsx` — Journal (filter chips, history list), Profile (art hero card + XP bar, stats trio, links, guilds, friends), Play (adventure carousel + dot pager), Settings, Map (intentional placeholder — no reference yet).
- `quest-flow.jsx` — Start Quest (pending, full-bleed art), Active Quest timer (ember ring, 83% seed), Quest Failed (Guide voice, gentle), Quest Complete / Quest Details (art header, stats badges, story card with drop cap, seekable audio player). Journal entries open Quest Complete in details mode.
- `custom-quest.jsx` — sentence form ("I want to ___ for N minutes"), 5–180 min slider, live From/To clocks, shared CategoryPicker rail.
- `coop.jsx` / `events.jsx` — co-op hub (zero-friends variant hides Create/Join, shows Add friends), co-op create (Friends/Guild segmented invite), invitations, public events (Discover/My events), Schedule Event (calendar limited to +3 months).
- `guild.jsx` — Create Guild (name, tagline, banner grid, optional founding-member invites).
- `shared.jsx` — BottomNav, TabHeader, Chip, CategoryPicker (all reusable chrome).
- `achievements.jsx`, `social.jsx` — Achievements, Skill Tree (3 tiers on connector spine; Tier II/III gate on 3 unlocks below), Leaderboard (Friends/Global + metric chips), Invite Friends sheet.

## Interactions & copy rules
- Two voices: system UI is warm and shame-free ("The quest slipped away. That happens."); narrative is grim and atmospheric. Sentence case everywhere except eyebrows. No emoji, no exclamation hype.
- Failure is never punished visually — Quest Failed uses a dimmed ember, not red alarm.
- One Cinnabar primary action per screen; destructive-ish actions (Abandon) are outline, not red fills.

## Assets
- `assets/logo-1024.png` — flame mark (min 25px).
- `assets/fonts/Erstoria-Regular.ttf`.
- `assets/backgrounds/` + `assets/characters/` — hand-painted art (cold blue shadow, warm orange rim light). Reuse in RN via require().
- Icons: **Lucide stand-ins** (`lucide-react-native` is the direct RN equivalent, 1.75 stroke). Swap for official brand SVGs when exported.

## Files
- `readme.md` — brand context, voice, visual foundations (read first).
- `styles.css` + `tokens/` — token source of truth.
- `components/` — base component specs. `ui_kits/app/` — screens (open `index.html` to click through).
- `SKILL.md` — makes this folder usable as a Claude Code Agent Skill.
