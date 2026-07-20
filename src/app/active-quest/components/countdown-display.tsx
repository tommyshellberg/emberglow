import React from 'react';

import { Text, View } from '@/components/ui';
import { colors as ember, palette } from '@/theme';

interface CountdownDisplayProps {
  remainingMs: number;
  /** The run's total duration, shown as the "Of MM:SS" sublabel. */
  totalMs: number;
}

/**
 * Formats a millisecond duration as `MM:SS`, or `H:MM:SS` once the remaining
 * time crosses an hour (the runtime doesn't schedule presence runs anywhere
 * near that long today, but this keeps the label from overflowing if it
 * ever does). Negative input is clamped to zero rather than shown, since a
 * countdown never displays as negative.
 */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Countdown readout for the center of the active-quest ember ring. Purely
 * presentational — it displays `remainingMs` from `useQuestPresence()` and
 * computes no pass/fail decision of its own. Sized to sit inside the
 * 248px ProgressRing (quest-flow.jsx TimerScreen).
 */
export function CountdownDisplay({
  remainingMs,
  totalMs,
}: CountdownDisplayProps) {
  return (
    <View className="items-center">
      <Text
        style={{
          fontSize: 56,
          // Explicit lineHeight (~1.2×) gives the heavy glyphs a tall enough
          // line box; without it RN sizes the box to the font's own metrics
          // and clips the digits' ascenders (the bug this screen shipped with).
          lineHeight: 68,
          fontWeight: '700',
          color: palette.bone,
          // Tabular figures keep every digit the same width so the readout
          // doesn't shift horizontally as the seconds tick down.
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
        }}
      >
        {formatCountdown(remainingMs)}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 2.5,
          color: ember.text.muted,
          textTransform: 'uppercase',
        }}
      >
        Of {formatCountdown(totalMs)}
      </Text>
    </View>
  );
}
