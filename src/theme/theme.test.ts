import {
  colors,
  durations,
  easing,
  fontFamily,
  radii,
  shadows,
  spacing,
  text,
} from './index';

describe('emberglow theme', () => {
  describe('typography', () => {
    it('uses Erstoria for display variants and Source Sans 3 for body variants', () => {
      expect(text.hero.fontFamily).toBe('Erstoria-Regular');
      expect(text.h1.fontFamily).toBe('Erstoria-Regular');
      expect(text.h2.fontFamily).toBe('Erstoria-Regular');
      expect(text.h3.fontFamily).toBe('SourceSans3_600SemiBold');
      expect(text.body.fontFamily).toBe('SourceSans3_400Regular');
      expect(text.eyebrow.fontFamily).toBe('SourceSans3_600SemiBold');
    });

    it('applies the display line-height rule (size × 1.12)', () => {
      expect(text.hero.lineHeight).toBeCloseTo(44 * 1.12);
      expect(text.h1.lineHeight).toBeCloseTo(34 * 1.12);
      expect(text.h2.lineHeight).toBeCloseTo(26 * 1.12);
    });

    it('applies the body line-height rule (size × 1.5)', () => {
      expect(text.bodyLg.lineHeight).toBeCloseTo(18 * 1.5);
      expect(text.body.lineHeight).toBeCloseTo(16 * 1.5);
      expect(text.small.lineHeight).toBeCloseTo(14 * 1.5);
      expect(text.caption.lineHeight).toBeCloseTo(12 * 1.5);
    });

    it('converts eyebrow tracking from 0.22em to RN points at its font size', () => {
      expect(text.eyebrow.letterSpacing).toBeCloseTo(
        text.eyebrow.fontSize * 0.22
      );
      expect(text.eyebrow.textTransform).toBe('uppercase');
    });

    it('never emboldens Erstoria (display variants carry no fontWeight)', () => {
      expect(text.hero).not.toHaveProperty('fontWeight');
      expect(text.h1).not.toHaveProperty('fontWeight');
      expect(text.h2).not.toHaveProperty('fontWeight');
    });

    it('exposes every Source Sans 3 weight loaded in the root layout', () => {
      expect(fontFamily.light).toBe('SourceSans3_300Light');
      expect(fontFamily.regular).toBe('SourceSans3_400Regular');
      expect(fontFamily.medium).toBe('SourceSans3_500Medium');
      expect(fontFamily.semibold).toBe('SourceSans3_600SemiBold');
      expect(fontFamily.bold).toBe('SourceSans3_700Bold');
    });
  });

  describe('colors', () => {
    it('resolves semantic aliases to the base palette', () => {
      expect(colors.surface.app).toBe(colors.palette.richBlack);
      expect(colors.surface.raised).toBe(colors.palette.midnight);
      expect(colors.text.primary).toBe(colors.palette.bone);
      expect(colors.accent.primary).toBe(colors.palette.cinnabar);
      expect(colors.accent.glow).toBe(colors.palette.sandy);
      expect(colors.border.strong).toBe(colors.palette.aegean);
    });

    it('derives alpha helpers from the correct base color', () => {
      expect(colors.text.secondary).toBe('rgba(232, 220, 199, 0.7)');
      expect(colors.border.hairline).toBe('rgba(232, 220, 199, 0.12)');
      expect(colors.surface.card).toBe('rgba(22, 32, 52, 0.72)');
    });

    it('exposes translucent bone fills for hover/pressed surfaces and tiles', () => {
      expect(colors.fill.faint).toBe('rgba(232, 220, 199, 0.06)');
      expect(colors.fill.subtle).toBe('rgba(232, 220, 199, 0.12)');
    });

    it('reuses the border alpha values for fill tokens under a different semantic', () => {
      expect(colors.fill.faint).toBe(colors.border.faint);
      expect(colors.fill.subtle).toBe(colors.border.hairline);
    });

    it('exposes a recessed track color for switches and XP bars', () => {
      expect(colors.track).toBe('rgba(44, 69, 107, 0.35)');
    });

    it('exposes a modal backdrop scrim', () => {
      expect(colors.scrim).toBe('rgba(0, 18, 27, 0.6)');
    });

    it('exposes a literal success text color for badge text', () => {
      expect(colors.status.successText).toBe('#9dc39b');
    });
  });

  describe('spacing and radii', () => {
    it('follows the 4-pt spacing scale', () => {
      expect(Object.values(spacing)).toEqual([
        4, 8, 12, 16, 20, 24, 32, 40, 48, 64,
      ]);
    });

    it('uses pill radius for fully rounded shapes', () => {
      expect(radii.pill).toBe(999);
      expect(radii.lg).toBe(16);
      expect(radii.xl).toBe(24);
    });
  });

  describe('effects and motion', () => {
    it('colors glows with the brand accents, not black', () => {
      expect(shadows.glowEmber.shadowColor).toBe(colors.palette.cinnabar);
      expect(shadows.glowWarm.shadowColor).toBe(colors.palette.sandy);
      expect(shadows.card.shadowColor).toBe(colors.palette.richBlack);
    });

    it('exposes the ember easing curve and duration steps', () => {
      expect(easing.emberOut).toEqual([0.22, 1, 0.36, 1]);
      expect(durations).toEqual({ fast: 150, base: 260, slow: 600 });
    });
  });
});
