import React from 'react';

import { Text, View } from '@/components/ui';

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
          fontSize: 44,
          fontWeight: '800',
          color: '#ffd9a8',
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatCountdown(remainingMs)}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 9,
          fontWeight: '500',
          letterSpacing: 3,
          color: '#9c8fa8',
          textTransform: 'uppercase',
        }}
      >
        Remaining
      </Text>
    </View>
  );
}
