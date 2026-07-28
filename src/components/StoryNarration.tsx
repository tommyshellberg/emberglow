import { Feather } from '@expo/vector-icons';
import {
  type AudioSource,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { audioCacheService } from '@/lib/services/audio-cache.service';
import { useSettingsStore } from '@/store/settings-store';
import { type StoryQuestTemplate } from '@/store/types';
import { colors, fontFamily, palette, radii, shadows, spacing } from '@/theme';
import { getNarrationPaths } from '@/utils/audio-utils';

type Props = {
  quest: StoryQuestTemplate;
};

/**
 * Resolves the quest's audio source, then hands off to <NarrationPlayer/>.
 *
 * The split exists because `useAudioPlayer` needs its source at hook-call time
 * and the source arrives asynchronously (S3 download + cache fallback). Rather
 * than construct a player with no source and guard every read of it, the outer
 * component owns the async lookup plus the loading/error UI, and the inner one
 * only ever runs with a source that already exists.
 */
export function StoryNarration({ quest }: Props) {
  const [source, setSource] = useState<AudioSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const narratorVoice = useSettingsStore((s) => s.narratorVoice);

  React.useEffect(() => {
    let isMounted = true;

    const resolveSource = async () => {
      try {
        // playsInSilentMode: narration is the point of the screen — a muted
        // phone shouldn't silently produce nothing. shouldPlayInBackground is
        // false because quests pause on blur (see NarrationPlayer).
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionModeAndroid: 'duckOthers',
        });

        // customId (from the server) wins over id (local quests).
        const questId = (quest as any).customId || quest.id;
        const { primaryPath, fallbackPath } = getNarrationPaths(questId);
        const resolved = await audioCacheService.getAudioSource(
          primaryPath,
          fallbackPath ?? undefined
        );
        if (!resolved) {
          throw new Error('No audio source found for quest');
        }

        if (isMounted) {
          setSource(resolved);
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
        if (isMounted) {
          setLoadError('Failed to load audio narration');
        }
      }
    };

    resolveSource();

    return () => {
      isMounted = false;
    };
    // narratorVoice: getNarrationPaths reads settings via getState(), which
    // doesn't itself trigger a re-render. Subscribing to narratorVoice above
    // and listing it here is what makes a voice change while mounted
    // re-resolve the source (see StoryNarration.test.tsx).
  }, [quest.id, narratorVoice]);

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!source) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading audio...</Text>
        </View>
      </View>
    );
  }

  // key: a new quest must build a new player, not mutate the running one.
  return <NarrationPlayer key={quest.id} source={source} />;
}

/** How often expo-audio pushes a status update, in ms. Matches the cadence of
 *  the old expo-av polling loop so the progress bar keeps its former smoothness
 *  (expo-audio's own default is 500ms, which reads as visibly steppy against
 *  the 150ms fill easing below). */
const STATUS_INTERVAL_MS = 100;

function NarrationPlayer({ source }: { source: AudioSource }) {
  const player = useAudioPlayer(source, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);
  const appStateRef = useRef(AppState.currentState);

  // expo-audio reports SECONDS (expo-av used milliseconds).
  const position = status.currentTime ?? 0;
  const duration = status.duration ?? 0;
  const isPlaying = status.playing ?? false;

  // Derived state - no useEffect needed (React best practice)
  const progress = duration > 0 ? position / duration : 0;
  const isCompleted = duration > 0 && position >= duration && !isPlaying;

  // Cinnabar->Sandy fill width, animated (XPBar's recipe) rather than driven
  // imperatively — status updates arrive every STATUS_INTERVAL_MS.
  const fillWidthPct = useSharedValue(progress * 100);
  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${fillWidthPct.value}%`,
  }));

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleReplay = () => {
    // Seek explicitly: at the tail, play() alone would be a no-op.
    player.seekTo(0).catch(console.error);
    player.play();
  };

  // expo-av reset the position itself on finish; expo-audio parks the player at
  // the end instead. Without this the bar would stay full and `isCompleted`
  // would latch true, greying out the play button after every chapter.
  React.useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(console.error);
    }
  }, [status.didJustFinish, player]);

  // Handle app state changes
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/) &&
        isPlaying
      ) {
        player.pause();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [isPlaying, player]);

  // Handle navigation focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isPlaying) {
          player.pause();
        }
      };
    }, [isPlaying, player])
  );

  // Animate the fill toward the latest progress fraction whenever it changes.
  React.useEffect(() => {
    fillWidthPct.value = withTiming(progress * 100, {
      duration: 150,
      easing: Easing.linear,
    });
  }, [progress, fillWidthPct]);

  /** seconds -> m:ss */
  const formatTime = (totalSecondsRaw: number) => {
    const totalSeconds = Math.floor(totalSecondsRaw);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const controlsDisabled = !status.isLoaded;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {!isCompleted ? (
          <Pressable
            testID="narration-play-toggle"
            onPress={togglePlayback}
            disabled={controlsDisabled}
            style={[
              styles.playDisc,
              Platform.OS === 'ios' && styles.playDiscGlow,
              controlsDisabled && styles.controlDisabled,
            ]}
          >
            <Feather
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={colors.text.onAccent}
            />
          </Pressable>
        ) : (
          <View
            style={[
              styles.playDisc,
              Platform.OS === 'ios' && styles.playDiscGlow,
              styles.controlDisabled,
            ]}
          >
            <Feather name="play" size={20} color={colors.text.onAccent} />
          </View>
        )}

        <View style={styles.middle}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Listen to this chapter</Text>
            <Text style={[styles.label, styles.timeLabel]}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
          <View style={styles.track}>
            {progress > 0 && (
              <Animated.View style={[styles.fill, animatedFillStyle]}>
                <LinearGradient
                  colors={[palette.cinnabar, palette.sandy]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.fillGradient}
                />
              </Animated.View>
            )}
          </View>
        </View>

        <Pressable
          onPress={handleReplay}
          disabled={controlsDisabled}
          style={[
            styles.replayDisc,
            controlsDisabled && styles.controlDisabled,
          ]}
        >
          <Feather name="rotate-ccw" size={16} color={colors.text.secondary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Mockup spec: 5px track (quest-flow.jsx:162). */
const TRACK_HEIGHT = 5;

const styles = StyleSheet.create({
  // In-card inset treatment (quest-flow.jsx:153): drops the old standalone
  // `mt-4` placement — this now renders as the story card's bottom section,
  // clipped to the card's rounded corners by the parent's `overflow: hidden`.
  container: {
    backgroundColor: colors.surface.inset,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.inset,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  errorContainer: {
    width: '100%',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface.inset,
    padding: spacing[4],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.status.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  playDisc: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Colored shadows only render on iOS; Android would just paint a grey box
  // via `elevation` (ground rule 5) — see button.tsx for the same gate.
  playDiscGlow: {
    shadowColor: shadows.glowEmber.shadowColor,
    shadowOffset: shadows.glowEmber.shadowOffset,
    shadowRadius: shadows.glowEmber.shadowRadius,
    shadowOpacity: shadows.glowEmber.shadowOpacity,
    elevation: 0,
  },
  replayDisc: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: {
    opacity: 0.3,
  },
  middle: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: colors.text.muted,
  },
  timeLabel: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  fillGradient: {
    flex: 1,
    borderRadius: radii.pill,
  },
});
