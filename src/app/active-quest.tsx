import { useKeepAwake } from 'expo-keep-awake';
import React from 'react';

import { View } from '@/components/ui';
import { useQuestPresence } from '@/lib/hooks/use-quest-presence';
import { useQuestStore } from '@/store/quest-store';

import { AmbientMusicPill } from './active-quest/components/ambient-music-pill';
import { CampfireAmbience } from './active-quest/components/campfire-ambience';
import { CountdownDisplay } from './active-quest/components/countdown-display';
import { JourneyProgressBar } from './active-quest/components/journey-progress-bar';
import { PresenceFooter } from './active-quest/components/presence-footer';
import { PresenceInfoStrip } from './active-quest/components/presence-info-strip';

const BACKGROUND_COLOR = '#0a0712';

/**
 * The active-quest screen: renders `useQuestPresence()` (read-only, Task 10)
 * and holds the screen awake for the duration of a solo PRESENCE run. It
 * computes NO pass/fail decision of its own — every value shown here is
 * machine-derived view state from the presence runtime (Task 9).
 *
 * Spec: docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md
 */
export default function ActiveQuestScreen() {
  useKeepAwake();

  const {
    state,
    remainingMs,
    liveMultiplier,
    forecast,
    isMuted,
    questTitle,
    mode,
  } = useQuestPresence();
  const durationMinutes = useQuestStore((s) => s.activeQuest?.durationMinutes);

  if (state === null) {
    // No active presence run — nothing for this screen to show. The
    // navigation resolver (Task 12) is responsible for routing away from
    // here; this is just a safe, non-crashing fallback.
    return (
      <View
        testID="active-quest-empty"
        style={{ flex: 1, backgroundColor: BACKGROUND_COLOR }}
      />
    );
  }

  // The hook exposes remaining time but not the run's total duration, so we
  // read it from the active quest's display data (not a pass/fail input) to
  // compute the journey bar's fill. When it's unavailable (e.g. this test
  // doesn't seed the quest store), fall back to remainingMs so the bar still
  // renders sensibly instead of dividing by an unknown total.
  const totalMs =
    durationMinutes != null ? durationMinutes * 60_000 : remainingMs;
  const travelledMs = Math.max(0, totalMs - remainingMs);
  const fill = totalMs > 0 ? travelledMs / totalMs : 0;

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND_COLOR }}>
      <CampfireAmbience />

      <View style={{ paddingTop: 22, paddingHorizontal: 18 }}>
        <PresenceInfoStrip
          mode={mode}
          questTitle={questTitle}
          forecast={forecast}
        />
      </View>

      <View style={{ marginTop: 60 }}>
        <CountdownDisplay remainingMs={remainingMs} />
      </View>

      <JourneyProgressBar
        fill={fill}
        travelledMs={travelledMs}
        liveMultiplier={liveMultiplier}
      />

      <View style={{ marginTop: 24 }}>
        <AmbientMusicPill isMuted={isMuted} />
      </View>

      <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0 }}>
        <PresenceFooter />
      </View>
    </View>
  );
}
