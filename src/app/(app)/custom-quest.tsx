import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';

import {
  A11Y_FORM_LABEL,
  A11Y_START_BUTTON_DISABLED,
  A11Y_START_BUTTON_ENABLED,
  A11Y_START_BUTTON_HINT,
  ANALYTICS_EVENTS,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  SCROLL_VIEW_BOTTOM_PADDING,
  START_BUTTON_LABEL,
  useCustomQuestForm,
  useQuestCreation,
} from '@/components/custom-quest';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import {
  Button,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';

/**
 * Custom Quest Screen
 *
 * Allows users to create personalized quests with custom names and durations.
 * Refactored to senior developer standards with:
 * - Extracted hooks for form state and quest creation
 * - Proper error handling with Sentry logging
 * - Full accessibility support
 * - Emberglow branding
 * - No magic numbers or debug code
 */
export default function CustomQuestScreen() {
  const posthog = usePostHog();

  // Form state management hook
  const {
    questName,
    questDuration,
    questCategory,
    canContinue,
    control,
    handleSubmit,
    handleQuestNameChange,
    handleDurationChange,
    getFormData,
  } = useCustomQuestForm();

  // Quest creation hook with error handling
  const { createQuest, isCreating, error } = useQuestCreation();

  // Track screen open
  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.OPEN_SCREEN);
  }, [posthog]);

  // Submit handler
  const onSubmit = async () => {
    const formData = getFormData();
    await createQuest(formData);
  };

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />

      <ScreenContainer>
        <ScreenHeader
          title={SCREEN_TITLE}
          subtitle={SCREEN_SUBTITLE}
          showBackButton
        />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SCROLL_VIEW_BOTTOM_PADDING }}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel={A11Y_FORM_LABEL}
        >
          {/* Error Message */}
          {error && (
            <View className="mb-4 rounded-lg border border-red-500 bg-red-500/20 p-4">
              <Text className="text-center text-red-100">{error}</Text>
            </View>
          )}

          {/* Quest Input */}
          <CombinedQuestInput
            initialQuestName={questName}
            initialDuration={questDuration}
            onQuestNameChange={handleQuestNameChange}
            onDurationChange={handleDurationChange}
          />

          {/* Category Slider */}
          <CategorySlider control={control} questCategory={questCategory} />

          {/* Start Quest Button */}
          <Button
            testID="start-custom-quest-button"
            label={START_BUTTON_LABEL}
            variant="default"
            size="lg"
            disabled={!canContinue || isCreating}
            onPress={handleSubmit(onSubmit)}
            accessibilityLabel={
              canContinue
                ? A11Y_START_BUTTON_ENABLED
                : A11Y_START_BUTTON_DISABLED
            }
            accessibilityRole="button"
            accessibilityHint={A11Y_START_BUTTON_HINT}
            accessibilityState={{ disabled: !canContinue || isCreating }}
            className={`rounded-md bg-primary-400 py-3 ${
              canContinue && !isCreating ? 'opacity-100' : 'opacity-50'
            }`}
            textClassName="text-lg font-semibold text-white"
          />
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
