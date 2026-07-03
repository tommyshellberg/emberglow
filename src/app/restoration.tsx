import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';

import { useCreateRestoration } from '@/api/restoration';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScrollView,
  Text,
  Title,
  TouchableOpacity,
  View,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import colors from '@/components/ui/colors';
import { useSpirit } from '@/hooks/use-spirit';

type ChallengeId =
  | 'too_busy'
  | 'too_busy_work'
  | 'forgot'
  | 'too_tired'
  | 'overwhelmed';

const CHALLENGES: { id: ChallengeId; label: string }[] = [
  { id: 'too_busy', label: 'Too busy' },
  { id: 'forgot', label: 'Forgot' },
  { id: 'too_tired', label: 'Too tired' },
  { id: 'overwhelmed', label: 'Felt overwhelmed' },
];

const DEEPER_CHALLENGES: { id: ChallengeId; label: string }[] = [
  ...CHALLENGES,
  { id: 'too_busy_work', label: 'Work kept pulling me back' },
];

const DEFAULT_COMMITMENT_HOUR = 20;
const DEFAULT_COMMITMENT_MINUTE = 0;

const wrapHour = (h: number) => ((h % 24) + 24) % 24;
const wrapMinute = (m: number) => ((m % 60) + 60) % 60;

export default function RestorationScreen() {
  const router = useRouter();
  const { restorationCount } = useSpirit();
  const isDeep = restorationCount >= 2;
  const isSecond = restorationCount >= 1;

  const createRestoration = useCreateRestoration();

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedChallenges, setSelectedChallenges] = useState<ChallengeId[]>(
    []
  );
  const [challengeText, setChallengeText] = useState('');
  const [journalText, setJournalText] = useState('');
  const [commitmentHour, setCommitmentHour] = useState(DEFAULT_COMMITMENT_HOUR);
  const [commitmentMinute, setCommitmentMinute] = useState(
    DEFAULT_COMMITMENT_MINUTE
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleChallenge = (id: ChallengeId) => {
    setSelectedChallenges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await createRestoration.mutateAsync({
        challenges: selectedChallenges,
        challengeText: challengeText.trim() || undefined,
        journalText: journalText.trim() || undefined,
        commitmentHour,
        commitmentMinute,
      });
      router.replace('/(app)');
    } catch (err) {
      console.error('Failed to submit restoration', err);
      setSubmitError(
        "Couldn't reach Vaedros. Tap Return to Vaedros to try again."
      );
    }
  };

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScreenContainer fullScreen className="flex-1">
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-4 py-6">
              {stepIndex === 0 && (
                <View>
                  <Title variant="centered" className="mb-2">
                    Restoration
                  </Title>
                  <Text className="mb-6 text-base text-neutral-200">
                    {isSecond
                      ? "We've all been here before. What made this stretch hard?"
                      : "No judgment. What's been making it hard to start a quest?"}
                  </Text>
                  <Text className="mb-3 text-lg font-semibold text-white">
                    Pick anything that fits
                  </Text>
                  <View className="mb-6 flex-row flex-wrap">
                    {(isSecond ? DEEPER_CHALLENGES : CHALLENGES).map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => toggleChallenge(c.id)}
                        className={`mb-2 mr-2 rounded-full px-4 py-2 ${
                          selectedChallenges.includes(c.id)
                            ? 'bg-primary-300'
                            : 'bg-neutral-400'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selectedChallenges.includes(c.id)
                              ? 'font-semibold text-white'
                              : 'text-neutral-200'
                          }`}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text className="mb-2 text-lg font-semibold text-white">
                    Something else? (optional)
                  </Text>
                  <TextInput
                    testID="challenge-text-input"
                    value={challengeText}
                    onChangeText={setChallengeText}
                    placeholder="Tell us in your own words"
                    placeholderTextColor={colors.neutral[300]}
                    style={{
                      minHeight: 60,
                      textAlignVertical: 'top',
                      color: colors.white,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                    }}
                  />
                </View>
              )}

              {stepIndex === 1 && (
                <View>
                  <Title variant="centered" className="mb-2">
                    A moment of reflection
                  </Title>
                  <Text className="mb-3 text-base text-neutral-200">
                    {isDeep
                      ? 'Take a deeper look: what drained you most, and what pulled you back toward the screen?'
                      : 'A short journal note for yourself. What drained you most?'}
                  </Text>
                  <TextInput
                    testID="journal-input"
                    multiline
                    numberOfLines={5}
                    value={journalText}
                    onChangeText={setJournalText}
                    placeholder="Write whatever comes to mind"
                    placeholderTextColor={colors.neutral[300]}
                    style={{
                      minHeight: 140,
                      textAlignVertical: 'top',
                      color: colors.white,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                    }}
                  />
                </View>
              )}

              {stepIndex === 2 && (
                <View>
                  <Title variant="centered" className="mb-2">
                    Pick a return time
                  </Title>
                  <Text className="mb-6 text-base text-neutral-200">
                    When tomorrow, at a time you can stick to, will you step
                    back in?
                  </Text>
                  <View className="mb-6 flex-row items-center justify-center">
                    <View className="items-center">
                      <Text className="mb-2 text-sm text-neutral-200">
                        Hour
                      </Text>
                      <View
                        className="flex-row items-center rounded-xl bg-neutral-400 px-4 py-2"
                        testID="commitment-hour"
                      >
                        <TouchableOpacity
                          testID="commitment-hour-decrement"
                          onPress={() =>
                            setCommitmentHour((h) => wrapHour(h - 1))
                          }
                          className="px-3"
                        >
                          <Text className="text-2xl text-white">-</Text>
                        </TouchableOpacity>
                        <Text
                          testID="commitment-hour-value"
                          className="mx-3 text-2xl font-semibold text-white"
                        >
                          {String(commitmentHour).padStart(2, '0')}
                        </Text>
                        <TouchableOpacity
                          testID="commitment-hour-increment"
                          onPress={() =>
                            setCommitmentHour((h) => wrapHour(h + 1))
                          }
                          className="px-3"
                        >
                          <Text className="text-2xl text-white">+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="mx-4 text-3xl text-white">:</Text>
                    <View className="items-center">
                      <Text className="mb-2 text-sm text-neutral-200">
                        Minute
                      </Text>
                      <View
                        className="flex-row items-center rounded-xl bg-neutral-400 px-4 py-2"
                        testID="commitment-minute"
                      >
                        <TouchableOpacity
                          testID="commitment-minute-decrement"
                          onPress={() =>
                            setCommitmentMinute((m) => wrapMinute(m - 5))
                          }
                          className="px-3"
                        >
                          <Text className="text-2xl text-white">-</Text>
                        </TouchableOpacity>
                        <Text
                          testID="commitment-minute-value"
                          className="mx-3 text-2xl font-semibold text-white"
                        >
                          {String(commitmentMinute).padStart(2, '0')}
                        </Text>
                        <TouchableOpacity
                          testID="commitment-minute-increment"
                          onPress={() =>
                            setCommitmentMinute((m) => wrapMinute(m + 5))
                          }
                          className="px-3"
                        >
                          <Text className="text-2xl text-white">+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Text className="text-center text-sm text-neutral-200">
                    We'll send a small reminder so you don't lose the thread.
                  </Text>
                </View>
              )}

              {stepIndex === 3 && (
                <View>
                  <Title variant="centered" className="mb-2">
                    See it, then go
                  </Title>
                  <Text className="mb-4 text-base text-neutral-200">
                    Picture yourself tomorrow at {commitmentHour}:
                    {String(commitmentMinute).padStart(2, '0')}, phone down,
                    starting a single quest. The Fading lifts, the streak
                    remembers, and Vaedros is there waiting.
                  </Text>
                  {isDeep && (
                    <Text className="mb-4 text-base text-neutral-200">
                      You've come back from this before. This time, the small
                      step is the only one that matters.
                    </Text>
                  )}
                  {submitError && (
                    <Text
                      testID="submit-error"
                      className="mb-4 text-center text-sm text-red-400"
                    >
                      {submitError}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {stepIndex < 3 ? (
            <Button
              label="Next"
              onPress={() => setStepIndex((i) => Math.min(3, i + 1))}
              className="mb-2 bg-primary-400"
            />
          ) : (
            <Button
              label={
                createRestoration.isPending
                  ? 'Restoring...'
                  : 'Return to Vaedros'
              }
              onPress={handleSubmit}
              disabled={createRestoration.isPending}
              loading={createRestoration.isPending}
              className="mb-2 bg-primary-400"
            />
          )}
        </ScreenContainer>
      </KeyboardAvoidingView>
    </View>
  );
}
