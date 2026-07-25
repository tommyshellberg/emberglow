import { Check } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import {
  BottomSheet,
  ListItem,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import { colors, fontFamily, radii, spacing } from '@/theme';

interface ChoiceNodeModalProps {
  perk: Perk;
  onClose: () => void;
  onSelectChoice: (choiceId: string) => void;
  isLoading?: boolean;
}

export function ChoiceNodeModal({
  perk,
  onClose,
  onSelectChoice,
  isLoading = false,
}: ChoiceNodeModalProps) {
  const { ref, present } = useEmberglowBottomSheet();

  React.useEffect(() => {
    present();
  }, [present]);

  const handleSelectChoice = (choiceId: string) => {
    if (isLoading) return;
    onSelectChoice(choiceId);
  };

  return (
    <BottomSheet ref={ref} title={perk.name} onDismiss={onClose}>
      {/* Perk Description */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={styles.descriptionBlock}
      >
        <Text style={styles.description}>{perk.description}</Text>
      </Animated.View>

      {/* Instruction */}
      <Animated.View
        entering={FadeIn.delay(100).duration(300)}
        style={styles.instructionBlock}
      >
        <Text style={styles.instruction}>Choose Your Path</Text>
      </Animated.View>

      {/* Choice Cards */}
      <View style={styles.choiceList}>
        {perk.choices?.map((choice, index) => (
          <Animated.View
            key={choice.id}
            entering={FadeInDown.delay(200 + index * 100).duration(400)}
          >
            <ListItem
              testID={`choice-button-${choice.id}`}
              title={choice.name}
              subtitle={choice.description}
              leading={<Check size={16} color={colors.text.accent} />}
              onPress={() => handleSelectChoice(choice.id)}
              style={styles.choiceItem}
            />
          </Animated.View>
        ))}
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Unlocking...</Text>
        </View>
      )}

      {/* Helper Text */}
      <Animated.View
        entering={FadeIn.delay(600).duration(300)}
        style={styles.helperBlock}
      >
        <Text style={styles.helperText}>
          This choice is permanent unless you reset your skill tree
        </Text>
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  descriptionBlock: {
    marginBottom: spacing[5],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  instructionBlock: {
    marginBottom: spacing[4],
  },
  instruction: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.accent,
    textAlign: 'center',
  },
  choiceList: {
    gap: spacing[4],
  },
  choiceItem: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.inset,
  },
  loadingBlock: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  helperBlock: {
    marginTop: spacing[6],
  },
  helperText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
