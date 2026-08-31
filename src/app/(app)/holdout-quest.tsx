import { LinearGradient } from 'expo-linear-gradient';
import { LockOpen } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { Button, EyebrowLabel } from '@/components/emberglow';
import {
  ANALYTICS_EVENTS,
  DEFAULT_CATEGORY,
  HoldoutRateMeter,
  SCREEN_EYEBROW,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  START_BUTTON_LABEL,
  UNLOCK_RULE,
  UNLOCK_STAKE,
  useHoldoutQuestCreation,
} from '@/components/holdout-quest';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import {
  FocusAwareStatusBar,
  Image,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

const SCROLL_VIEW_BOTTOM_PADDING = 80;

// Same sunset-mountain painting as the Hold Out card on the Play deck, so
// tapping the card lands somewhere that visibly belongs to it.
const HERO_ART = require('@/../assets/images/background/pending-quest-bg-alt-4.jpg');
const HERO_HEIGHT = 360;
// Melt the art into the canvas: readable header at the top, solid richBlack
// by the time the meter and form begin.
const HERO_SCRIM_COLORS = [
  withAlpha(palette.richBlack, 0.3),
  withAlpha(palette.richBlack, 0.78),
  palette.richBlack,
] as const;
const HERO_SCRIM_LOCATIONS = [0, 0.58, 1] as const;

type HoldoutQuestFormData = {
  questCategory: string;
};

/**
 * Holdout Quest Screen — lets users start an open-ended quest with no fixed
 * duration. Unlike Custom Quest, there's no name or duration input: the
 * only choice is a category. The hero art, rate meter, and unlock note
 * carry the pitch: hold out as long as you can, earn by the minute
 * (see HoldoutRateMeter), collect once past the minimum.
 */
export default function HoldoutQuestScreen() {
  const posthog = usePostHog();

  const { control, getValues } = useForm<HoldoutQuestFormData>({
    defaultValues: { questCategory: DEFAULT_CATEGORY },
  });

  const { createQuest, isCreating, error } = useHoldoutQuestCreation();

  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.OPEN_SCREEN);
  }, [posthog]);

  const onSubmit = async () => {
    await createQuest(getValues('questCategory'));
  };

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <View style={styles.hero} pointerEvents="none">
        <Image
          source={HERO_ART}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={HERO_SCRIM_COLORS}
          locations={HERO_SCRIM_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <ScreenContainer transparent>
        <ScreenHeader
          testID="holdout-quest-screen"
          title={SCREEN_TITLE}
          showBackButton
        />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SCROLL_VIEW_BOTTOM_PADDING }}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Holdout quest creation form"
        >
          <View style={styles.intro}>
            <EyebrowLabel tone="warm">{SCREEN_EYEBROW}</EyebrowLabel>
            <Text style={styles.subtitle}>{SCREEN_SUBTITLE}</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.meterWrap}>
            <HoldoutRateMeter />
          </View>

          <View style={styles.unlockRow}>
            <LockOpen
              size={14}
              color={colors.text.secondary}
              style={styles.unlockIcon}
            />
            <View style={styles.unlockLines}>
              <Text style={styles.unlockText}>{UNLOCK_RULE}</Text>
              <Text style={styles.unlockStakeText}>{UNLOCK_STAKE}</Text>
            </View>
          </View>

          <CategorySlider control={control} />

          <View style={styles.startButtonWrap}>
            <Button
              testID="start-holdout-quest-button"
              label={START_BUTTON_LABEL}
              variant="primary"
              size="lg"
              fullWidth
              busy={isCreating}
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.richBlack,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  scroll: {
    flex: 1,
  },
  meterWrap: {
    marginBottom: spacing[2],
  },
  startButtonWrap: {
    marginTop: spacing[4],
  },
  intro: {
    marginBottom: spacing[8],
    gap: spacing[2],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15.5,
    lineHeight: 15.5 * 1.5,
    color: colors.text.primary,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[8],
    paddingHorizontal: spacing[1],
  },
  unlockIcon: {
    marginTop: 3,
  },
  unlockLines: {
    flex: 1,
    gap: spacing[1],
  },
  unlockText: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.text.secondary,
  },
  unlockStakeText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.text.muted,
  },
  errorBanner: {
    marginBottom: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.status.danger,
    backgroundColor: withAlpha(colors.status.danger, 0.15),
    padding: spacing[4],
  },
  errorText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
  },
});
