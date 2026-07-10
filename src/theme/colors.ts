/**
 * Emberglow brand colors, ported from the design handoff
 * (.claude/skills/emberglow-design/tokens/colors.css).
 */

/** Convert a #rrggbb hex color to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Base palette — the six brand colors. */
export const palette = {
  richBlack: '#00121b', // app canvas, night sky
  midnight: '#162034', // raised surfaces
  aegean: '#2c456b', // borders, muted UI, moonlit blue
  cinnabar: '#d94928', // primary accent, the ember
  sandy: '#f7a44b', // glow, highlights, XP
  bone: '#e8dcc7', // primary text, parchment
} as const;

/** Tints — brand guide: base + white at 80/60/40/20. */
export const tints = {
  cinnabar80: '#e16d53',
  cinnabar60: '#e8927e',
  cinnabar40: '#f0b6a9',
  cinnabar20: '#f7dbd4',
  sandy80: '#f9b66f',
  sandy60: '#fac893',
  sandy40: '#fcdbb7',
  sandy20: '#fdeddb',
  aegean80: '#566a89',
  aegean60: '#808fa6',
  aegean40: '#abb5c4',
  aegean20: '#d5dae1',
  bone40: '#f6f1e9',
} as const;

export const colors = {
  palette,
  tints,

  surface: {
    app: palette.richBlack,
    raised: palette.midnight,
    card: withAlpha(palette.midnight, 0.72), // slightly translucent over art
    overlay: withAlpha(palette.richBlack, 0.85),
    inset: withAlpha(palette.richBlack, 0.45),
  },

  text: {
    primary: palette.bone,
    secondary: withAlpha(palette.bone, 0.7),
    muted: withAlpha(palette.bone, 0.45),
    onAccent: '#fdf6ea',
    accent: palette.sandy,
  },

  accent: {
    primary: palette.cinnabar,
    primaryHover: '#e2542f',
    primaryPress: '#c23f20',
    glow: palette.sandy,
  },

  border: {
    subtle: withAlpha(palette.aegean, 0.45),
    strong: palette.aegean,
    hairline: withAlpha(palette.bone, 0.12),
    faint: withAlpha(palette.bone, 0.06),
  },

  status: {
    success: '#7da87b', // mossy green — quest complete
    danger: palette.cinnabar,
  },

  focusRing: withAlpha(palette.sandy, 0.55),
} as const;
