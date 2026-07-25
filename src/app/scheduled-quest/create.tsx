import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useCreateScheduledQuest } from '@/api/scheduled-quests';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import {
  Button,
  DateTimeField,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
  type SegmentedControlOption,
  Text,
  View,
} from '@/components/ui';
import { validateEventForm } from '@/features/scheduled-quests/lib/validate-event-form';
import { scheduledQuestErrorMessage } from '@/lib/services/scheduled-quest-service';

const XP_PER_MINUTE = 3; // display only - the server sets the authoritative reward

const VISIBILITY_OPTIONS: SegmentedControlOption<'public' | 'friends'>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Friends only', value: 'friends' },
];

const MAX_PARTICIPANT_OPTIONS: SegmentedControlOption<number>[] = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
];

export default function CreateScheduledQuest() {
  const router = useRouter();
  const createMutation = useCreateScheduledQuest();
  const { control, watch } = useForm({
    defaultValues: { questCategory: 'fitness' },
  });
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startsAt, setStartsAt] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear a stale validation error as soon as the user edits a field that
  // `validateEventForm` checks, so the message doesn't linger after it's
  // been fixed.
  useEffect(() => {
    setValidationError(null);
  }, [title, startsAt]);

  const submit = () => {
    const error = validateEventForm({ title, startsAtMs: startsAt.getTime() });
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    createMutation.mutate(
      {
        title: title.trim(),
        category: watch('questCategory'),
        durationMinutes,
        scheduledStartAt: startsAt.toISOString(),
        visibility,
        maxParticipants,
      },
      {
        onSuccess: (run) => router.replace(`/scheduled-quest/${run.id}`),
      }
    );
  };

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <ScreenHeader title="Schedule an event" showBackButton />
      {/* The title input autofocuses, so this scroller must survive an open
          keyboard on Android:
          - KeyboardAwareScrollView: KeyboardProvider runs Android
            edge-to-edge, so a plain ScrollView never resizes for the
            keyboard - the lower fields end up behind it, unreachable.
          - keyboardShouldPersistTaps: with the default ('never') the
            ScrollView swallows every tap while an input is focused, leaving
            the visibility/max-participants controls and the submit button
            unresponsive (Android keeps input focus after the keyboard is
            back-dismissed). */}
      <KeyboardAwareScrollView
        testID="create-event-scroll"
        style={styles.scroll}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <CombinedQuestInput
          initialDuration={durationMinutes}
          startsAt={startsAt}
          onQuestNameChange={setTitle}
          onDurationChange={setDurationMinutes}
        />
        <CategorySlider control={control} />

        <Text className="mt-4 font-semibold">Starts at</Text>
        <View className="mt-1 flex-row">
          <View className="mr-2">
            <DateTimeField
              value={startsAt}
              mode="date"
              minimumDate={new Date()}
              onChange={setStartsAt}
            />
          </View>
          <DateTimeField
            value={startsAt}
            mode="time"
            minimumDate={new Date()}
            onChange={setStartsAt}
          />
        </View>

        <Text className="mt-4 font-semibold">Visibility</Text>
        <SegmentedControl
          className="mt-1"
          accessibilityLabel="Visibility"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={setVisibility}
        />

        <Text className="mt-4 font-semibold">
          Max participants: {maxParticipants}
        </Text>
        <SegmentedControl
          className="mt-1"
          accessibilityLabel="Max participants"
          options={MAX_PARTICIPANT_OPTIONS}
          value={maxParticipants}
          onChange={setMaxParticipants}
        />

        <Text variant="secondary" className="mt-4 text-sm">
          Reward: ~{durationMinutes * XP_PER_MINUTE} XP for finishing
        </Text>

        {validationError ? (
          <Text className="mt-2 text-sm text-red-400">{validationError}</Text>
        ) : null}
        {createMutation.error ? (
          <Text className="mt-2 text-sm text-red-400">
            {scheduledQuestErrorMessage(createMutation.error)}
          </Text>
        ) : null}

        <Button
          label="Create event"
          onPress={submit}
          loading={createMutation.isPending}
          className="my-6"
        />
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

// KeyboardAwareScrollView is not registered with NativeWind's cssInterop, so
// className would be silently dropped - style the scroller directly.
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
