# Emberglow App UI Kit

Mobile app (390×844) recreated from the provided focus-timer screenshot + brand assets.

Sourced from 11 real simulator screenshots (in `uploads/`). Bottom nav layout + items are fixed per the founder: Journal, Map, Play (raised orb), Profile, Settings.

Tabs (`tabs.jsx`): **Journal** (filter chips + quest history), **Profile** (hero card, stats, guilds, friends), **Play** (adventure carousel: story / custom / co-op), **Settings** (recreated from screenshot), **Map** (deliberate placeholder — no reference).

Quest flow (`quest-flow.jsx`): **Start Quest** (pending, full-bleed art) → **Active Quest timer** (ember ring) → **Quest Complete** (narrative excerpt + audio playback) or **Quest Failed** (Guide voice, gentle retry).

`index.html` is the interactive shell: tab between screens, start a quest from Play, abandon → Failed, let the timer finish → Complete. Layouts are redesigns in the new design system, not 1:1 recreations, per the founder's brief.
