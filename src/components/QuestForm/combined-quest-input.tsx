import { Env } from '@env';
import Slider from '@react-native-community/slider';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/emberglow';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

// Simplified props without react-hook-form dependency
type CombinedQuestInputProps = {
  initialQuestName?: string;
  initialDuration?: number;
  /** When provided (e.g. a scheduled event's chosen start time), the FROM/TO
   * preview is derived from it instead of the current time. */
  startsAt?: Date;
  onQuestNameChange?: (value: string) => void;
  onDurationChange?: (value: number) => void;
};

export const CombinedQuestInput = ({
  initialQuestName = '',
  initialDuration = 30,
  startsAt,
  onQuestNameChange,
  onDurationChange,
}: CombinedQuestInputProps) => {
  // Local state
  const [questName, setQuestName] = useState(initialQuestName);

  // Two separate states for the slider:
  // - sliderValue: updates continuously during sliding (visual only)
  // - duration: only updates when sliding is complete (committed value)
  const [sliderValue, setSliderValue] = useState(initialDuration);
  const [duration, setDuration] = useState(initialDuration);

  // Update local states when parent values change
  useEffect(() => {
    setQuestName(initialQuestName);
    setSliderValue(initialDuration);
    setDuration(initialDuration);
  }, [initialQuestName, initialDuration]);

  // Calculate start and end times based on visual slider value for real-time feedback
  const now = startsAt ?? new Date();
  const endTime = new Date(now.getTime() + sliderValue * 60000);

  // Handle quest name change - update both local state and parent
  const handleQuestNameChange = (text: string) => {
    setQuestName(text);
    if (onQuestNameChange) {
      onQuestNameChange(text);
    }
  };

  // Handle continuous slider movement - only update local state for visual feedback
  const handleSliderValueChange = (value: number) => {
    setSliderValue(Math.round(value));
  };

  // Handle slider completion - update committed duration and notify parent
  const handleSlidingComplete = (value: number) => {
    const roundedValue = Math.round(value);
    setDuration(roundedValue);
    if (onDurationChange) {
      onDurationChange(roundedValue);
    }
  };

  return (
    <View style={styles.card}>
      <Input
        label="I want to"
        value={questName}
        onChangeText={handleQuestNameChange}
        placeholder="go for a run"
        autoCapitalize="none"
        autoComplete="off"
        autoFocus={true}
      />

      <Text style={styles.durationText}>for {sliderValue} minutes</Text>

      {/* Slider with separate handlers for value change and sliding complete */}
      <View style={styles.sliderSection}>
        <Slider
          testID="duration-slider"
          style={styles.slider}
          minimumValue={Env.APP_ENV === 'development' ? 1 : 5}
          maximumValue={240}
          step={Env.APP_ENV === 'development' ? 1 : 5}
          value={duration}
          onValueChange={handleSliderValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.accent.primary}
          maximumTrackTintColor={colors.track}
          thumbTintColor={colors.text.accent}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeChip}>
            <Text style={styles.timeLabel}>FROM</Text>
            <Text style={styles.timeValue}>{format(now, 'h:mm a')}</Text>
          </View>
          <View style={styles.timeChip}>
            <Text style={styles.timeLabel}>TO</Text>
            <Text testID="end-time" style={styles.timeValueAccent}>
              {format(endTime, 'h:mm a')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    padding: spacing[5],
    ...shadows.raised,
  },
  durationText: {
    marginTop: spacing[3],
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.text.primary,
  },
  sliderSection: {
    marginTop: spacing[5],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeChip: {
    width: '48%',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface.inset,
    padding: spacing[3],
  },
  timeLabel: {
    marginBottom: spacing[1],
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.text.muted,
  },
  timeValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.text.primary,
  },
  timeValueAccent: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.text.accent,
  },
});
