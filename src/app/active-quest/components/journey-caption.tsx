import React from 'react';

import { Text } from '@/components/ui';
import { colors as ember, palette } from '@/theme';

interface JourneyCaptionProps {
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

/**
 * One quiet caption row under the ember ring, carrying what the old journey
 * bar showed: distance travelled and the live XP multiplier. The ring's arc
 * itself now draws the journey, so this is the only textual trace of it.
 */
export function JourneyCaption({
  travelledMs,
  liveMultiplier,
}: JourneyCaptionProps) {
  return (
    <Text
      testID="journey-caption"
      style={{ fontSize: 13, textAlign: 'center' }}
    >
      <Text style={{ fontSize: 13, color: ember.text.secondary }}>
        {formatTravelled(travelledMs)} travelled
      </Text>
      <Text style={{ fontSize: 13, color: ember.text.muted }}>{'  ·  '}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.sandy }}>
        {liveMultiplier.toFixed(2)}× XP
      </Text>
    </Text>
  );
}
