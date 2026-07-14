import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  A11Y_FORM_LABEL,
  ANALYTICS_EVENTS,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  SCROLL_VIEW_BOTTOM_PADDING,
  START_BUTTON_LABEL,
  useCustomQuestForm,
  useQuestCreation,
} from '@/components/custom-quest';
import { Button } from '@/components/emberglow';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import { colors, fontFamily, radii, spacing, withAlpha } from '@/theme';

/**
 * Custom Quest Screen — lets users create a personalized quest by naming it,
 * setting a duration, and picking a category.
 */
export default function CustomQuestScreen() {
  const posthog = usePostHog();

  const {
    questName,
    questDuration,
    canContinue,
    control,
    handleSubmit,
    handleQuestNameChange,
    handleDurationChange,
    getFormData,
  } = useCustomQuestForm();

  const { createQuest, isCreating, error } = useQuestCreation();

  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.OPEN_SCREEN);
  }, [posthog]);

  const onSubmit = async () => {
    const formData = getFormData();
    await createQuest(formData);
  };

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <ScreenContainer>
        <ScreenHeader
          title={SCREEN_TITLE}
          subtitle={SCREEN_SUBTITLE}
          showBackButton
        />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SCROLL_VIEW_BOTTOM_PADDING }}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel={A11Y_FORM_LABEL}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <CombinedQuestInput
            initialQuestName={questName}
            initialDuration={questDuration}
            onQuestNameChange={handleQuestNameChange}
            onDurationChange={handleDurationChange}
          />

          <CategorySlider control={control} />

          <Button
            label={START_BUTTON_LABEL}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canContinue || isCreating}
            onPress={handleSubmit(onSubmit)}
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
