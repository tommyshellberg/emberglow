import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import { Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';

interface ChoiceNodeModalProps {
  perk: Perk;
  onClose: () => void;
  onSelectChoice: (choiceId: string) => void;
}

export function ChoiceNodeModal({
  perk,
  onClose,
  onSelectChoice,
}: ChoiceNodeModalProps) {
  const { ref, present, dismiss } = useModal();

  React.useEffect(() => {
    present();
  }, [present]);

  const handleClose = () => {
    dismiss();
    onClose();
  };

  const handleSelectChoice = (choiceId: string) => {
    dismiss();
    onSelectChoice(choiceId);
  };

  return (
    <Modal
      ref={ref}
      snapPoints={['70%']}
      title={perk.name}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: '#2c456b', // cardBackground
      }}
      handleIndicatorStyle={{
        backgroundColor: '#8FA5B2', // neutral-200
      }}
    >
      <View className="flex-1 px-4 pb-6">
        {/* Perk Description */}
        <Animated.View entering={FadeIn.duration(300)} className="mb-6">
          <Text className="text-center text-base leading-6 text-cream-500/80">
            {perk.description}
          </Text>
        </Animated.View>

        {/* Instruction */}
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          className="mb-4"
        >
          <Text className="text-center text-sm font-semibold text-primary-400">
            Choose Your Path
          </Text>
        </Animated.View>

        {/* Choice Cards */}
        <View className="gap-4">
          {perk.choices?.map((choice, index) => (
            <Animated.View
              key={choice.id}
              entering={FadeInDown.delay(200 + index * 100).duration(400)}
            >
              <Pressable
                testID={`choice-button-${choice.id}`}
                onPress={() => handleSelectChoice(choice.id)}
                className="rounded-lg border-2 border-neutral-400/30 bg-background/50 p-4 active:border-primary-400"
              >
                {/* Choice Header */}
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="flex-1 text-lg font-bold text-cream-500">
                    {choice.name}
                  </Text>
                  <View className="ml-3 rounded-full bg-primary-400/20 p-1.5">
                    <Check size={16} color="#E55838" />
                  </View>
                </View>

                {/* Choice Description */}
                <Text className="text-sm leading-5 text-cream-500/80">
                  {choice.description}
                </Text>

                {/* Visual Indicator */}
                <View className="mt-3 h-1 w-full rounded-full bg-primary-400/20" />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Helper Text */}
        <Animated.View
          entering={FadeIn.delay(600).duration(300)}
          className="mt-6"
        >
          <Text className="text-center text-xs text-cream-500/40">
            This choice is permanent unless you reset your skill tree
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
