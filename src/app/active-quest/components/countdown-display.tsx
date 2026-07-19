import React from 'react';

import { colors, Text, View } from '@/components/ui';

interface CountdownDisplayProps {
  remainingMs: number;
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
 * Large countdown readout for the active-quest screen. Purely presentational
 * — it displays `remainingMs` from `useQuestPresence()` and computes no
 * pass/fail decision of its own.
 */
export function CountdownDisplay({ remainingMs }: CountdownDisplayProps) {
  return (
    <View className="items-center">
      <Text
        style={{
          fontSize: 66,
          // Explicit lineHeight (~1.2×) gives the heavy glyphs a tall enough
          // line box; without it RN sizes the box to the font's own metrics
          // and clips the digits' ascenders (the bug this screen shipped with).
          lineHeight: 80,
          fontWeight: '800',
          color: colors.lightBrown[300],
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
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 4,
          color: colors.neutral[200],
          textTransform: 'uppercase',
        }}
      >
        Remaining
      </Text>
    </View>
  );
}
