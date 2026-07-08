import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { type Control, Controller } from 'react-hook-form';
import { Dimensions, ScrollView } from 'react-native';

// Import UI components from project
import { Pressable, Text, View } from '@/components/ui';

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
  questCategory: string;
};

const ITEM_WIDTH = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = 16;

export const CategorySlider = ({
  control,
  questCategory,
}: CategorySliderProps) => {
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
    <View className="mb-4">
      <Text className="mb-3 px-4 text-base text-neutral-200">
        What type of activity?
      </Text>
      <Controller
        control={control}
        render={({ field: { value, onChange } }) => (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingVertical: 8,
            }}
          >
            {categoryOptions.map((category, index) => {
              const isSelected = value === category.id;
              return (
                <Pressable
                  key={category.id}
                  testID={`category-option-${category.id}`}
                  className={`mx-1 items-center justify-center rounded-xl px-3 py-4 ${
                    isSelected ? 'bg-secondary-400' : 'bg-cardBackground'
                  }`}
                  style={{ width: ITEM_WIDTH - 8 }}
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
                    color={isSelected ? '#00121b' : '#36B6D3'}
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    className={`text-center text-xs ${
                      isSelected ? 'font-semibold text-black' : 'text-white'
                    }`}
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
