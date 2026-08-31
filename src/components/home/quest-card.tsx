import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, EyebrowLabel } from '@/components/emberglow';
import { Image } from '@/components/ui';
import { CARD_HEIGHT } from '@/features/home/constants/home-constants';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

export type HomeQuestMode = 'story' | 'custom' | 'cooperative' | 'holdout';

export interface QuestCardProps {
  mode: HomeQuestMode;
  title: string;
  subtitle: string;
  duration: number;
  xp: number;
  description: string;
  progress: number;
  showProgress?: boolean;
  requiresPremium?: boolean;
  isCompleted?: boolean;
  onRestart?: () => void;
  testID?: string;
}

const imageMap: Record<HomeQuestMode, ImageSourcePropType> = {
  story: require('@/../assets/images/background/card-background-alt.jpg'),
  custom: require('@/../assets/images/background/custom-quest-background-alt.jpg'),
  cooperative: require('@/../assets/images/background/coop-quest-background-alt.jpg'),
  // Reuses the custom background — no new asset in v1; a dedicated image
  // can land later.
  holdout: require('@/../assets/images/background/custom-quest-background-alt.jpg'),
};

const COMPLETION_MESSAGE =
  "Congratulations! You've completed the entire Vaedros storyline. Your quest history is preserved - start a new adventure to experience different story branches!";

// Bottom -> top scrim (play-screen handoff): richBlack 0.95 at 8%, 0.45 at
// 45%, 0.25 at the top.
const SCRIM_COLORS = [
  withAlpha(palette.richBlack, 0.95),
  withAlpha(palette.richBlack, 0.45),
  withAlpha(palette.richBlack, 0.25),
] as const;
const SCRIM_LOCATIONS = [0.08, 0.45, 1] as const;

const TITLE_FONT_SIZE = 27;
const META_FONT_SIZE = 13;
const META_TRACKING = 0.06;
const DESCRIPTION_FONT_SIZE = 14.5;
const PROGRESS_TRACK_HEIGHT = 6;

/**
 * Home deck "mode card" — the full-bleed art card behind the Play screen's
 * card deck (story / custom / cooperative), per the play-screen handoff.
 * Self-contained (not a wrapper around Emberglow's shared `QuestCard`):
 * fixed height, full-opacity art under its own scrim (the shared QuestCard
 * dims art to 0.55, which reads as murky over a deliberately painted hero
 * image), a mode-storyline eyebrow, and a linear story-progress bar.
 */
export default function QuestCard({
  mode,
  title,
  subtitle,
  duration,
  xp,
  description,
  progress = 0,
  showProgress = false,
  requiresPremium = false,
  isCompleted = false,
  onRestart,
  testID,
}: QuestCardProps) {
  const cardTitle = isCompleted ? 'Quest complete' : title;
  const cardDescription = isCompleted ? COMPLETION_MESSAGE : description;
  const progressPercent = Math.min(100, Math.round(progress * 100));
  const showRestart = mode === 'story' && Boolean(onRestart) && progress > 0;

  return (
    // Two layers: iOS drops a View's shadow once it clips with
    // `overflow: hidden`, so the shadow lives on the outer, unclipped
    // wrapper and the border/art-clipping on the inner view (same split as
    // emberglow/quest/quest-card.tsx).
    <View style={styles.cardShadow} testID={testID}>
      <View style={styles.card} testID={testID ? `${testID}-inner` : undefined}>
        <Image
          source={imageMap[mode]}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
          testID={testID ? `${testID}-art` : undefined}
        />
        <LinearGradient
          colors={SCRIM_COLORS}
          locations={SCRIM_LOCATIONS}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />

        {requiresPremium && (
          <View style={styles.premiumBadge}>
            <Badge tone="warm">Premium</Badge>
          </View>
        )}

        {showRestart && (
          <Pressable
            onPress={onRestart}
            style={styles.restartButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={testID ? `${testID}-restart` : undefined}
          >
            <RotateCcw size={20} color={colors.text.primary} />
          </Pressable>
        )}

        <View style={styles.content}>
          <EyebrowLabel>{subtitle}</EyebrowLabel>
          <Text style={styles.title}>{cardTitle}</Text>
          {mode !== 'holdout' && (
            <Text style={styles.meta}>{`${duration} min · ${xp} XP`}</Text>
          )}
          {mode === 'holdout' && (
            <Text style={styles.meta}>{'3 XP/min'}</Text>
          )}
          <Text style={styles.description} numberOfLines={3}>
            {cardDescription}
          </Text>

          {showProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Story progress</Text>
                <Text
                  style={styles.progressLabel}
                >{`${progressPercent}%`}</Text>
              </View>
              <View style={styles.progressTrack}>
                {progressPercent > 0 && (
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  >
                    <LinearGradient
                      colors={[palette.cinnabar, palette.sandy]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.progressGradient}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...shadows.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  restartButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    height: 40,
    width: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill.subtle,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fontFamily.semibold,
    fontSize: META_FONT_SIZE,
    letterSpacing: META_FONT_SIZE * META_TRACKING,
    textTransform: 'uppercase',
    color: palette.sandy,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: DESCRIPTION_FONT_SIZE,
    lineHeight: DESCRIPTION_FONT_SIZE * 1.5,
    color: colors.text.secondary,
    marginTop: 6,
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.text.secondary,
  },
  progressTrack: {
    height: PROGRESS_TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(palette.bone, 0.18),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  progressGradient: {
    flex: 1,
    borderRadius: radii.pill,
  },
});
