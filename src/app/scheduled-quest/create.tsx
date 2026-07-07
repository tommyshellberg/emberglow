import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform } from 'react-native';

import { useCreateScheduledQuest } from '@/api/scheduled-quests';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import {
  Button,
  FocusAwareStatusBar,
  ScreenContainer,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import { validateEventForm } from '@/features/scheduled-quests/lib/validate-event-form';
import { scheduledQuestErrorMessage } from '@/lib/services/scheduled-quest-service';

const XP_PER_MINUTE = 3; // display only - the server sets the authoritative reward

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
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      <ScrollView className="flex-1 px-4">
        <Text className="py-3 text-xl font-bold">Schedule an event</Text>

        <CombinedQuestInput
          initialDuration={durationMinutes}
          onQuestNameChange={setTitle}
          onDurationChange={setDurationMinutes}
        />
        <CategorySlider
          control={control}
          questCategory={watch('questCategory')}
        />

        <Text className="mt-4 font-semibold">Starts at</Text>
        <View className="mt-1 flex-row">
          <TouchableOpacity
            onPress={() => setShowPicker('date')}
            className="mr-2 rounded-lg bg-neutral-800 px-3 py-2"
          >
            <Text>{startsAt.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowPicker('time')}
            className="rounded-lg bg-neutral-800 px-3 py-2"
          >
            <Text>
              {startsAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>
        {showPicker ? (
          <DateTimePicker
            value={startsAt}
            mode={showPicker}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_event, date) => {
              setShowPicker(null);
              if (date) setStartsAt(date);
            }}
          />
        ) : null}

        <Text className="mt-4 font-semibold">Visibility</Text>
        <View className="mt-1 flex-row">
          {(['public', 'friends'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVisibility(v)}
              className={`mr-2 rounded-full px-4 py-2 ${visibility === v ? 'bg-primary-400' : 'bg-neutral-800'}`}
            >
              <Text
                className={
                  visibility === v
                    ? 'font-semibold text-white'
                    : 'text-neutral-300'
                }
              >
                {v === 'public' ? 'Public' : 'Friends only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mt-4 font-semibold">
          Max participants: {maxParticipants}
        </Text>
        <View className="mt-1 flex-row">
          {[5, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setMaxParticipants(n)}
              className={`mr-2 rounded-full px-4 py-2 ${maxParticipants === n ? 'bg-primary-400' : 'bg-neutral-800'}`}
            >
              <Text
                className={
                  maxParticipants === n
                    ? 'font-semibold text-white'
                    : 'text-neutral-300'
                }
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mt-4 text-sm text-neutral-400">
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
      </ScrollView>
    </ScreenContainer>
  );
}
