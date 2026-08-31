import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/emberglow';
import {
  ANALYTICS_EVENTS,
  DEFAULT_CATEGORY,
  RATE_EXPLAINER,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  START_BUTTON_LABEL,
  useHoldoutQuestCreation,
} from '@/components/holdout-quest';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import { colors, fontFamily, radii, spacing, withAlpha } from '@/theme';

const SCROLL_VIEW_BOTTOM_PADDING = 80;

type HoldoutQuestFormData = {
  questCategory: string;
};

/**
 * Holdout Quest Screen — lets users start an open-ended quest with no fixed
 * duration. Unlike Custom Quest, there's no name or duration input: the
 * only choice is a category, and the reward grows the longer the phone
 * stays locked (see RATE_EXPLAINER).
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

      <ScreenContainer>
        <ScreenHeader
          testID="holdout-quest-screen"
          title={SCREEN_TITLE}
          subtitle={SCREEN_SUBTITLE}
          showBackButton
        />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SCROLL_VIEW_BOTTOM_PADDING }}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Holdout quest creation form"
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.rateExplainer}>{RATE_EXPLAINER}</Text>

          <CategorySlider control={control} />

          <Button
            testID="start-holdout-quest-button"
            label={START_BUTTON_LABEL}
            variant="primary"
            size="lg"
            fullWidth
            busy={isCreating}
            onPress={onSubmit}
          />
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  rateExplainer: {
    marginBottom: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 14,
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
