import Slider from '@react-native-community/slider';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';

// Import UI components
import { Text, View } from '@/components/ui';
import { Env } from '@env';

// Simplified props without react-hook-form dependency
type CombinedQuestInputProps = {
  initialQuestName?: string;
  initialDuration?: number;
  onQuestNameChange?: (value: string) => void;
  onDurationChange?: (value: number) => void;
};

export const CombinedQuestInput = ({
  initialQuestName = '',
  initialDuration = 30,
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
  const now = new Date();
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
    <View className="mb-4 rounded-xl bg-cardBackground p-5">
      <View className="mb-2.5">
        <View className="flex-row items-center">
          <Text className="text-2xl font-medium text-white">I want to</Text>
          <TextInput
            value={questName}
            onChangeText={handleQuestNameChange}
            placeholder="go for a run"
            placeholderTextColor="#5C7380"
            autoCapitalize="none"
            autoComplete="off"
            autoFocus={true}
            style={{
              flex: 1,
              marginLeft: 8,
              height: 40,
              borderBottomWidth: 1,
              borderBottomColor: '#36B6D3', // secondary-200 (Emberglow teal)
              backgroundColor: 'transparent',
              paddingHorizontal: 8,
              paddingVertical: 0,
              fontSize: 24,
              color: '#e8dcc7', // white/cream
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          />
        </View>
      </View>

      <View className="mb-2.5 flex-row items-center">
        <Text className="text-2xl font-medium text-white">
          for {sliderValue} minutes
        </Text>
      </View>

      {/* Slider with separate handlers for value change and sliding complete */}
      <View className="mt-5">
        <View style={{ height: 40 }}>
          <Slider
            testID="duration-slider"
            style={{ width: '100%', height: 40 }}
            minimumValue={Env.APP_ENV === 'development' ? 1 : 5}
            maximumValue={240}
            step={Env.APP_ENV === 'development' ? 1 : 5}
            value={duration}
            onValueChange={handleSliderValueChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor="#36B6D3" // secondary-200 (Emberglow teal)
            maximumTrackTintColor="#5C7380" // neutral-300 (muted gray)
            thumbTintColor="#36B6D3" // secondary-200 (Emberglow teal)
          />
        </View>

        <View className="mt-4 flex-row justify-between">
          <View className="w-[48%] items-center rounded-lg bg-lightBlue-500 p-3">
            <Text className="mb-1 text-sm text-neutral-200">FROM</Text>
            <Text className="text-2xl font-semibold text-white">
              {format(now, 'h:mm a')}
            </Text>
          </View>
          <View className="w-[48%] items-center rounded-lg bg-lightBlue-500 p-3">
            <Text className="mb-1 text-sm text-neutral-200">TO</Text>
            <Text
              testID="end-time"
              className="text-2xl font-semibold text-white"
            >
              {format(endTime, 'h:mm a')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
