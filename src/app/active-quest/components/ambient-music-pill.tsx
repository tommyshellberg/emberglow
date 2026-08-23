import React from 'react';

import { colors, Pressable, Text } from '@/components/ui';

interface AmbientMusicPillProps {
  isMuted: boolean;
  /**
   * Task 14 (quest-audio.service.ts) wires this to real ambient-audio
   * mute/unmute; for now the pill only reflects `isMuted` and forwards the
   * tap.
   */
  onToggleMute?: () => void;
}

const TRACK_NAME = 'Emberglow Nights';

/**
 * Pill showing the ambient track name with a mute affordance bound to
 * `isMuted`. Purely a display + tap-forwarding component — no audio engine
 * lives here.
 */
export function AmbientMusicPill({
  isMuted,
  onToggleMute,
}: AmbientMusicPillProps) {
  return (
    <Pressable
      onPress={onToggleMute}
      accessibilityRole="button"
      accessibilityLabel={
        isMuted ? 'Unmute ambient music' : 'Mute ambient music'
      }
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        opacity: isMuted ? 0.55 : 1,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.white }}>
        {isMuted
          ? `Muted — Ambient: ${TRACK_NAME}`
          : `♪ Ambient: ${TRACK_NAME}`}
      </Text>
    </Pressable>
  );
}
