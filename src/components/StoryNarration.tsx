import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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
import { type StoryQuestTemplate } from '@/store/types';
import { colors, fontFamily, palette, radii, shadows, spacing } from '@/theme';
import { getQuestAudioPath } from '@/utils/audio-utils';

type Props = {
  quest: StoryQuestTemplate;
};

export function StoryNarration({ quest }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Derived state - no useEffect needed (React best practice)
  const progress = duration > 0 ? position / duration : 0;
  const isCompleted = duration > 0 && position >= duration && !isPlaying;

  // Cinnabar->Sandy fill width, animated (XPBar's recipe) rather than driven
  // imperatively — position updates ~10x/sec via the polling interval below.
  const fillWidthPct = useSharedValue(progress * 100);
  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${fillWidthPct.value}%`,
  }));

  // Initialize audio - only runs once when component mounts
  React.useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      try {
        // Set audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Get the audio path dynamically based on quest custom ID
        // Use customId if available (from server), otherwise fall back to id (for local quests)
        const questId = (quest as any).customId || quest.id;
        const audioPath = getQuestAudioPath(questId);
        console.log('quest audio path:', audioPath);

        // Get the audio source from cache service (handles S3 download and fallback)
        const audioSource = await audioCacheService.getAudioSource(audioPath);
        if (!audioSource) {
          throw new Error('No audio source found for quest');
        }

        const { sound, status } = await Audio.Sound.createAsync(
          audioSource,
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;

        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
          setAudioInitialized(true);
        }

        // Add a small delay on Android to ensure the audio system is fully ready
        if (Platform.OS === 'android') {
          setTimeout(() => {
            setIsLoading(false);
          }, 500);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
        if (isMounted) {
          setLoadError('Failed to load audio narration');
          setIsLoading(false);
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
        soundRef.current = null;
      }
      stopProgressTracking();
    };
  }, [quest.id]); // Only depend on quest.id, not the entire audioFile object

  // Status update callback - handles all playback state
  const onPlaybackStatusUpdate = (status: Audio.AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis || 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      stopProgressTracking();
    }
  };

  // Progress tracking functions
  const startProgressTracking = () => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (soundRef.current) {
        soundRef.current.getStatusAsync().catch(() => {
          stopProgressTracking();
        });
      }
    }, 100);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Event handlers
  const togglePlayback = async () => {
    if (!soundRef.current) return;

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        stopProgressTracking();
      } else {
        await soundRef.current.playAsync();
        startProgressTracking();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleReplay = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      await soundRef.current.playFromPositionAsync(0);
      setPosition(0);
      startProgressTracking();
    } catch (error) {
      console.error('Error replaying:', error);
    }
  };

  // Handle app state changes
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/) &&
        soundRef.current &&
        isPlaying
      ) {
        soundRef.current.pauseAsync().catch(console.error);
        stopProgressTracking();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [isPlaying]);

  // Handle navigation focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (soundRef.current && isPlaying) {
          soundRef.current.pauseAsync().catch(console.error);
          stopProgressTracking();
        }
      };
    }, [isPlaying])
  );

  // Animate the fill toward the latest progress fraction whenever it changes.
  React.useEffect(() => {
    fillWidthPct.value = withTiming(progress * 100, {
      duration: 150,
      easing: Easing.linear,
    });
  }, [progress, fillWidthPct]);

  // Format time helper
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Early returns for error and loading states
  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  const controlsDisabled = isLoading || !audioInitialized;

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading audio...</Text>
        </View>
      )}

      <View style={styles.row}>
        {!isCompleted ? (
          <Pressable
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
