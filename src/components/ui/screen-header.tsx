import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, fontFamily, leading, spacing } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  animate?: boolean;
  rightComponent?: React.ReactNode;
  testID?: string;
}

// Mockup spec: TabHeader (shared.jsx) uses 34, SubHeader (social.jsx,
// back-button variant) uses 30.
const TITLE_SIZE_WITH_BACK = 30;
const TITLE_SIZE_STANDALONE = 34;
// Brand rule is size × 1.12 (leading.display), but Erstoria's ascenders clip
// against that tight a box in RN — bump slightly, matching the established
// fix in quest-card.tsx (TITLE_FONT_SIZE * 1.15).
const TITLE_LEADING = 1.15;

const BACK_BUTTON_SIZE = 40;

/**
 * Standard header component for screens with consistent spacing, recomposed
 * to the Emberglow mockup spec (shared.jsx TabHeader / social.jsx
 * SubHeader):
 * - Title: Erstoria (`fontFamily.display`), never bold, sized 30 when a
 *   back button is shown (sub-screen header) or 34 standalone (tab header).
 * - Back button: 40×40 circular touch target, ArrowLeft at `colors.text.secondary`.
 * - Subtitle: Source Sans 3, `colors.text.muted`.
 *
 * Outer spacing is kept close to the pre-Emberglow layout so the ~15
 * consuming screens don't shift: 16px top margin on the title row, 16px
 * bottom margin on the wrapper.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  animate = true,
  rightComponent,
  testID,
}: ScreenHeaderProps) {
  const router = useRouter();
  const headerOpacity = useSharedValue(animate ? 0 : 1);

  React.useEffect(() => {
    if (animate) {
      headerOpacity.value = withTiming(1, { duration: 800 });
    }
  }, [animate, headerOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const HeaderWrapper = animate ? Animated.View : View;
  const titleSize = showBackButton
    ? TITLE_SIZE_WITH_BACK
    : TITLE_SIZE_STANDALONE;

  return (
    <HeaderWrapper
      testID={testID}
      style={[styles.wrapper, animate ? animatedStyle : undefined]}
    >
      <View style={styles.titleRow}>
        {showBackButton && (
          <TouchableOpacity
            testID="screen-header-back-button"
            onPress={handleBackPress}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text
            style={[
              styles.title,
              { fontSize: titleSize, lineHeight: titleSize * TITLE_LEADING },
            ]}
          >
            {title}
          </Text>
        </View>
        {rightComponent}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </HeaderWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[4],
  },
  titleRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14, // mockup row gap (social.jsx SubHeader)
  },
  backButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    marginLeft: -spacing[2],
    borderRadius: BACK_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.display,
    fontWeight: 'normal',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 6, // mockup spacing (shared.jsx TabHeader / social.jsx SubHeader)
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 15 * leading.body,
    color: colors.text.muted,
  },
});
