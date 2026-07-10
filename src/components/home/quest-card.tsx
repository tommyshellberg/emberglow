import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  EyebrowLabel,
  QuestCard as EmberglowQuestCard,
} from '@/components/emberglow';
import { colors, fontFamily, palette, radii, spacing } from '@/theme';

type HomeQuestMode = 'story' | 'custom' | 'cooperative';

interface QuestCardProps {
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
}

const imageMap: Record<HomeQuestMode, ImageSourcePropType> = {
  story: require('@/../assets/images/background/card-background-alt.jpg'),
  custom: require('@/../assets/images/background/custom-quest-background-alt.jpg'),
  cooperative: require('@/../assets/images/background/coop-quest-background-alt.jpg'),
};

const COMPLETION_MESSAGE =
  "Congratulations! You've completed the entire Vaedros storyline. Your quest history is preserved - start a new adventure to experience different story branches!";

/**
 * Home carousel card.
 *
 * Wraps Emberglow's `QuestCard` (title/description/xp/duration/image) with
 * the pieces it has no slot for — a mode label, a premium-lock badge, a
 * story-restart control, and a linear story-progress bar. None of these
 * exist as shared Emberglow primitives yet (ground rule 4), so they're
 * built here from `Badge`/`EyebrowLabel` plus bare `View`s on theme tokens,
 * matching `XPBar`'s Cinnabar→Sandy track/fill recipe for the progress bar.
 *
 * The mode label and premium badge render as a normal-flow row *above*
 * `QuestCard`, not an absolute overlay on top of it — `QuestCard`'s own
 * content box anchors its badge row/title/description/duration to the
 * bottom of a `min-height` art area (`justifyContent: 'flex-end'`), and that
 * minimum is tuned for a bare title + duration. Any card with a description
 * (the common case) grows past it, so the badge row ends up rendering right
 * under a fixed-top overlay instead of near the art's bottom. Normal flow
 * keeps the label above the card unconditionally, regardless of how tall
 * the card's own content grows.
 *
 * The story-progress block renders as its own row *below* `QuestCard`
 * (normal flow, not an absolute overlay) for the same reason — an overlay
 * pinned to the bottom edge would render on top of that text instead of
 * beside it, particularly for the full completed-storyline paragraph.
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
}: QuestCardProps) {
  const cardTitle = isCompleted ? 'Quest Complete!' : title;
  const cardDescription = isCompleted
    ? COMPLETION_MESSAGE
    : description || undefined;
  // When the progress row is shown, duration is displayed once there
  // instead of a second time on QuestCard's own built-in duration line, to
  // avoid showing "45 MIN" twice in a row.
  const cardDuration = showProgress ? undefined : `${duration} min`;
  const progressPercent = Math.min(100, Math.round(progress * 100));

  return (
    <View>
      {/* Mode label + premium lock — Emberglow QuestCard has no slot for
          either; rendered above it in normal flow (see file header comment
          for why this can't be an overlay on the card). */}
      <View style={styles.headerRow}>
        <EyebrowLabel tone="warm">{subtitle}</EyebrowLabel>
        {requiresPremium && <Badge tone="warm">⭐ Premium</Badge>}
      </View>

      <View style={styles.cardArt}>
        <EmberglowQuestCard
          title={cardTitle}
          description={cardDescription}
          xp={xp}
          duration={cardDuration}
          image={imageMap[mode]}
        />

        {/* Restart control — story mode only, once progress has started */}
        {mode === 'story' && onRestart && progress > 0 && (
          <Pressable
            onPress={onRestart}
            style={styles.restartButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RotateCcw size={20} color={colors.text.primary} />
          </Pressable>
        )}
      </View>

      {/*
        Story progress — rendered as a normal-flow row below QuestCard
        (not an absolute overlay), so it never collides with QuestCard's
        own bottom-anchored title/description/duration text. No plain
        linear 0-100 progress primitive exists (ground rule 4).
      */}
      {showProgress && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Story Progress</Text>
            <Text style={styles.progressLabel}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            {progressPercent > 0 && (
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
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
          <Text style={styles.progressDuration}>{`${duration} min`}</Text>
        </View>
      )}
    </View>
  );
}

const PROGRESS_TRACK_HEIGHT = 6;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  cardArt: {
    position: 'relative',
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
  progressSection: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[1],
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  progressLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.text.primary,
  },
  progressTrack: {
    height: PROGRESS_TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.fill.subtle,
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
  progressDuration: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
    textTransform: 'uppercase',
  },
});
