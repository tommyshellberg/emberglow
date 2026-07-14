import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { type Control, Controller } from 'react-hook-form';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fontFamily, radii, spacing } from '@/theme';

// Category options with icons
const categoryOptions = [
  { id: 'fitness', label: 'Fitness', icon: 'heart' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'self-care', label: 'Self-care', icon: 'smile' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'learning', label: 'Learning', icon: 'book-open' },
  { id: 'creative', label: 'Creative', icon: 'edit-3' },
  { id: 'household', label: 'Household', icon: 'home' },
  { id: 'outdoors', label: 'Outdoors', icon: 'sun' },
  { id: 'other', label: 'Other', icon: 'more-horizontal' },
];

type CategorySliderProps = {
  control: Control<any>;
};

const ITEM_WIDTH = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = spacing[4];

export const CategorySlider = ({ control }: CategorySliderProps) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToCategory = (index: number) => {
    if (scrollViewRef.current) {
      const offset = Math.max(
        0,
        index * ITEM_WIDTH - SCREEN_WIDTH / 2 + ITEM_WIDTH / 2
      );
      scrollViewRef.current.scrollTo({ x: offset, animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>What type of activity?</Text>
      <Controller
        control={control}
        render={({ field: { value, onChange } }) => (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {categoryOptions.map((category, index) => {
              const isSelected = value === category.id;
              return (
                <Pressable
                  key={category.id}
                  testID={`category-option-${category.id}`}
                  style={[
                    styles.pill,
                    isSelected ? styles.pillSelected : styles.pillUnselected,
                  ]}
                  onPress={() => {
                    onChange(category.id);
                    scrollToCategory(index);
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${category.label}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Feather
                    name={category.icon as any}
                    size={24}
                    color={
                      isSelected ? colors.text.onAccent : colors.text.accent
                    }
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.label,
                      isSelected
                        ? styles.labelSelected
                        : styles.labelUnselected,
                    ]}
                    numberOfLines={1}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        name="questCategory"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  sectionLabel: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingVertical: spacing[2],
  },
  pill: {
    marginHorizontal: spacing[1],
    width: ITEM_WIDTH - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[4],
  },
  pillSelected: {
    backgroundColor: colors.accent.primary,
  },
  pillUnselected: {
    backgroundColor: colors.surface.raised,
  },
  icon: {
    marginBottom: spacing[1],
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
  },
  labelSelected: {
    fontFamily: fontFamily.semibold,
    color: colors.text.onAccent,
  },
  labelUnselected: {
    color: colors.text.primary,
  },
});
