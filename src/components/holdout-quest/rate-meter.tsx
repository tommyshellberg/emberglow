import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  calculateHoldoutXP,
  HOLDOUT_CAP_MINUTES,
  HOLDOUT_FULL_RATE_MINUTES,
  HOLDOUT_FULL_RATE_XP_PER_MIN,
  HOLDOUT_REDUCED_RATE_XP_PER_MIN,
} from '@/app/utils/quest-utils';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

const MAX_XP = calculateHoldoutXP(HOLDOUT_CAP_MINUTES);
const CAP_HOURS = HOLDOUT_CAP_MINUTES / 60;
// Segment widths are proportional to real time: the bright full-rate first
// hour against the dimmer reduced-rate stretch out to the cap.
const FULL_RATE_FLEX = HOLDOUT_FULL_RATE_MINUTES;
const REDUCED_RATE_FLEX = HOLDOUT_CAP_MINUTES - HOLDOUT_FULL_RATE_MINUTES;

const FULL_RATE_LABEL = `${HOLDOUT_FULL_RATE_XP_PER_MIN} XP/min · first hour`;
const REDUCED_RATE_LABEL = `then ${HOLDOUT_REDUCED_RATE_XP_PER_MIN} XP/min · up to ${CAP_HOURS} h`;

/**
 * The Hold Out screen's reward-curve meter. Draws the XP curve as a bar:
 * an ember-bright segment for the 3 XP/min first hour, then a dimmer
 * segment for the 1 XP/min stretch to the 4-hour cap. All numbers derive
 * from the curve constants in quest-utils, so the meter can never drift
 * from what the server actually pays.
 */
export function HoldoutRateMeter() {
  return (
    <View style={styles.card} testID="holdout-rate-meter">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Flame size={16} color={palette.sandy} />
          <Text style={styles.headerLabel}>Earn as you hold</Text>
        </View>
        <Text style={styles.maxLabel}>{`${MAX_XP} XP max`}</Text>
      </View>

      {/* Decorative rendering of the curve; the legend below carries the
          same information as text for screen readers. */}
      <View
        style={styles.track}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <LinearGradient
          colors={[palette.cinnabar, palette.sandy]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.fullRateSegment, { flex: FULL_RATE_FLEX }]}
        />
        <View
          style={[styles.reducedRateSegment, { flex: REDUCED_RATE_FLEX }]}
        />
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>{FULL_RATE_LABEL}</Text>
        <Text style={styles.legendText}>{REDUCED_RATE_LABEL}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[4],
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  maxLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: palette.sandy,
  },
  track: {
    flexDirection: 'row',
    height: 10,
    gap: 3,
  },
  fullRateSegment: {
    borderRadius: radii.pill,
  },
  reducedRateSegment: {
    borderRadius: radii.pill,
    backgroundColor: withAlpha(palette.sandy, 0.22),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendText: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.text.muted,
  },
});
