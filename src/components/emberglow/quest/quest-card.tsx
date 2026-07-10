import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Image } from '@/components/ui';
import {
  colors,
  fontFamily,
  palette,
  pressedScale,
  radii,
  shadows,
  spacing,
  tracking,
  withAlpha,
} from '@/theme';

import { Badge, type BadgeTone } from '../core/badge';

export type QuestCardStatus = 'Available' | 'In progress' | 'Complete';

/** Web spec's `image` opacity over which the bottom scrim reads text. */
const IMAGE_OPACITY = 0.55;

const statusTone: Record<QuestCardStatus, BadgeTone> = {
  'In progress': 'ember',
  Complete: 'success',
  Available: 'neutral',
};

export type QuestCardProps = {
  title: string;
  description?: string;
  xp?: number;
  /** Preformatted, e.g. "45 min". */
  duration?: string;
  status?: QuestCardStatus;
  /** Hand-painted art. */
  image?: ImageSourcePropType;
  /**
   * Resting warm glow + warm border — the mobile translation of the web
   * hover state. Screens decide when to set this; the component never
   * auto-glows by status.
   * @default false
   */
  glow?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The core content unit — a quest with title, story hook, XP and duration,
 * optionally over hand-painted art protected by a bottom scrim.
 *
 * Uses two shadow-carrying layers because iOS composes only one shadow per
 * layer and drops shadows entirely once a view clips with `overflow:
 * hidden`: an outer wrapper for the optional warm glow, an outer `Pressable`
 * for the resting card shadow, and an inner clipped `View` for the border,
 * art, and scrim.
 */
export function QuestCard({
  title,
  description,
  xp,
  duration,
  status,
  image,
  glow = false,
  onPress,
  style,
  testID,
}: QuestCardProps) {
  return (
    <View style={glow ? [styles.glowWrapper, shadows.glowWarm] : undefined}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        testID={testID}
        style={({ pressed }) => [
          styles.outer,
          pressed ? styles.pressed : null,
          style,
        ]}
      >
        {({ pressed }) => (
          <View
            testID={testID ? `${testID}-inner` : undefined}
            style={[
              styles.inner,
              {
                borderColor:
                  glow || pressed
                    ? withAlpha(palette.sandy, 0.35)
                    : colors.border.hairline,
              },
            ]}
          >
            {image ? (
              <>
                <Image
                  source={image}
                  contentFit="cover"
                  style={[
                    StyleSheet.absoluteFillObject,
                    { opacity: IMAGE_OPACITY },
                  ]}
                />
                <LinearGradient
                  testID={testID ? `${testID}-scrim` : undefined}
                  colors={[
                    withAlpha(palette.richBlack, 0.92),
                    withAlpha(palette.richBlack, 0.35),
                  ]}
                  locations={[0.2, 1]}
                  start={{ x: 0.5, y: 1 }}
                  end={{ x: 0.5, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </>
            ) : null}
            <View
              style={[styles.content, { minHeight: image ? 120 : undefined }]}
            >
              {status || xp != null ? (
                <View style={styles.badgeRow}>
                  {status ? (
                    <Badge tone={statusTone[status]}>{status}</Badge>
                  ) : null}
                  {xp != null ? <Badge tone="warm">{`+${xp} XP`}</Badge> : null}
                </View>
              ) : null}
              <Text style={styles.title}>{title}</Text>
              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}
              {duration ? (
                <Text style={styles.duration}>{duration}</Text>
              ) : null}
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const DURATION_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 22;

const styles = StyleSheet.create({
  glowWrapper: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  outer: {
    ...shadows.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  pressed: {
    transform: [{ scale: pressedScale }],
  },
  inner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.secondary,
  },
  duration: {
    fontFamily: fontFamily.regular,
    fontSize: DURATION_FONT_SIZE,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: DURATION_FONT_SIZE * tracking.wide,
  },
});
