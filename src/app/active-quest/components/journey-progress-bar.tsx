import { Flag, User } from 'lucide-react-native';
import React from 'react';

import { colors, Text, View } from '@/components/ui';

interface JourneyProgressBarProps {
  /** 0..1 fraction of the quest travelled so far; clamped defensively. */
  fill: number;
  travelledMs: number;
  liveMultiplier: number;
}

/** Formats a millisecond duration as `MM:SS` for the "travelled" label. */
function formatTravelled(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const HERO_TOKEN_SIZE = 26;

/**
 * A journey bar: the quest's remaining time rendered as distance travelled.
 * A circular hero token (lucide `User`) rides the fill toward a lucide
 * `Flag` at the goal. Below it: travelled time (left) and the live XP
 * multiplier (right), matching the v3 mockup.
 */
export function JourneyProgressBar({
  fill,
  travelledMs,
  liveMultiplier,
}: JourneyProgressBarProps) {
  const clampedFill = Math.max(0, Math.min(1, fill));

  return (
    <View style={{ marginTop: 30, marginHorizontal: 30 }}>
      <View
        style={{
          height: 6,
          borderRadius: 6,
          // Neutral translucent hairline for the untravelled path; the warm
          // fill below is the ember token that carries the colour.
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${clampedFill * 100}%`,
            borderRadius: 6,
            backgroundColor: colors.brown,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: `${clampedFill * 100}%`,
            top: '50%',
            width: HERO_TOKEN_SIZE,
            height: HERO_TOKEN_SIZE,
            marginLeft: -HERO_TOKEN_SIZE / 2,
            marginTop: -HERO_TOKEN_SIZE / 2,
            borderRadius: HERO_TOKEN_SIZE / 2,
            borderWidth: 2,
            borderColor: colors.brown,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={13} color={colors.lightBrown[300]} />
        </View>
        <View
          style={{
            position: 'absolute',
            right: -6,
            top: '50%',
            marginTop: -9,
            width: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Flag size={13} color={colors.neutral[200]} />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.neutral[200] }}>
          {formatTravelled(travelledMs)} travelled
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brown }}>
          {liveMultiplier.toFixed(2)}× XP
        </Text>
      </View>
    </View>
  );
}
