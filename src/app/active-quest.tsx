import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/emberglow';
import {
  BackgroundImage,
  colors,
  FocusAwareStatusBar,
  View,
} from '@/components/ui';
import { useQuestPresence } from '@/lib/hooks/use-quest-presence';
import { questAudio } from '@/lib/services/quest-audio.service';
import { useQuestStore } from '@/store/quest-store';
import { palette, scrims, withAlpha } from '@/theme';

import { AmbientMusicPill } from './active-quest/components/ambient-music-pill';
import { CampfireAmbience } from './active-quest/components/campfire-ambience';
import { CountdownDisplay } from './active-quest/components/countdown-display';
import { JourneyCaption } from './active-quest/components/journey-caption';
import { PresenceFooter } from './active-quest/components/presence-footer';
import { PresenceInfoStrip } from './active-quest/components/presence-info-strip';

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
  const insets = useSafeAreaInsets();

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

  // `useQuestPresence().isMuted` reads storage per-render rather than
  // subscribing to it, so it won't re-render this screen when the pill is
  // tapped. Track an immediate local copy for the pill's visual state and
  // let `questAudio.setMuted` own persistence (Task 14).
  const [localMuted, setLocalMuted] = useState(isMuted);

  useEffect(() => {
    if (state === 'IN_APP') {
      questAudio.playAmbient();
    } else {
      questAudio.fadeOut();
    }
  }, [state]);

  useEffect(() => {
    return () => {
      questAudio.teardown();
    };
  }, []);

  const handleToggleMute = () => {
    const next = !localMuted;
    setLocalMuted(next);
    questAudio.setMuted(next);
  };

  if (state === null) {
    // No active presence run — nothing for this screen to show. The
    // navigation resolver (Task 12) is responsible for routing away from
    // here; this is just a safe, non-crashing fallback.
    return (
      <View
        testID="active-quest-empty"
        style={{ flex: 1, backgroundColor: colors.black }}
      />
    );
  }

  // The hook exposes remaining time but not the run's total duration, so we
  // read it from the active quest's display data (not a pass/fail input) to
  // compute the ring's fill. When it's unavailable (e.g. this test doesn't
  // seed the quest store), fall back to remainingMs so the ring still
  // renders sensibly instead of dividing by an unknown total.
  const totalMs =
    durationMinutes != null ? durationMinutes * 60_000 : remainingMs;
  const travelledMs = Math.max(0, totalMs - remainingMs);
  // The arc fills as the hero travels (journey metaphor, inherited from the
  // old journey bar) rather than draining like a stopwatch.
  const fill = totalMs > 0 ? travelledMs / totalMs : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      {/* Force light status-bar icons: the app is `userInterfaceStyle:
          'automatic'`, and without the (now-removed) native header a
          light-mode device would render dark icons, invisible on this dark
          screen. Matches every other full-bleed dark screen in the app. */}
      <FocusAwareStatusBar />

      {/* Full-bleed painted art under a rich-black wash + scrims
          (quest-flow.jsx TimerScreen:55-58), so the campfire ambience and
          text keep their contrast over the artwork. */}
      <BackgroundImage
        testID="active-quest-art"
        source={require('@/../assets/images/background/card-background-alt.jpg')}
        tintClassName="bg-transparent"
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: withAlpha(palette.richBlack, 0.55) },
          ]}
        />
      </BackgroundImage>
      <LinearGradient
        pointerEvents="none"
        colors={scrims.top.colors}
        start={scrims.top.start}
        end={scrims.top.end}
        style={styles.scrimTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={scrims.bottom.colors}
        start={scrims.bottom.start}
        end={scrims.bottom.end}
        style={styles.scrimBottom}
      />

      <CampfireAmbience />

      {/* Own the safe area ourselves now that the native header is gone, so
          the title clears the notch and the footer clears the home
          indicator. */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 14,
        }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <PresenceInfoStrip
            mode={mode}
            questTitle={questTitle}
            forecast={forecast}
          />
        </View>

        {/* Firelit hero, optically centred between the header and the
            reassurance so the screen reads as one calm column instead of a
            top-loaded list with a void beneath it. */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View testID="quest-progress-ring" style={{ alignItems: 'center' }}>
            <ProgressRing progress={fill} size={248}>
              <CountdownDisplay remainingMs={remainingMs} totalMs={totalMs} />
            </ProgressRing>
          </View>

          <View style={{ marginTop: 18 }}>
            <JourneyCaption
              travelledMs={travelledMs}
              liveMultiplier={liveMultiplier}
            />
          </View>

          <View style={{ marginTop: 24 }}>
            <AmbientMusicPill
              isMuted={localMuted}
              onToggleMute={handleToggleMute}
            />
          </View>
        </View>

        {/* Sits at the base of the column, right where the campfire glow
            rises — so the "you can lock your phone" reassurance meets the
            fire instead of floating in dead space. */}
        <PresenceFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Scrim depths from the design mock's timer screen (38% / 42%).
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
});
