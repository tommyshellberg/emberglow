import * as React from 'react';
import { View } from 'react-native';

import { Image } from './image';

export type BackgroundImageProps = {
  /** Image source to display as background. Defaults to onboarding-bg.jpg */
  source?: any;
  /** Tint overlay className. Defaults to 'bg-white/10' */
  tintClassName?: string;
  /** Additional overlays or content to render on top of the tint */
  children?: React.ReactNode;
  /** Optional className for the container View */
  className?: string;
  /** Optional testID for the container View */
  testID?: string;
};

/**
 * BackgroundImage component that renders a full-screen background image
 * with a white tint overlay by default.
 *
 * @example
 * // Default usage with onboarding background
 * <BackgroundImage />
 *
 * @example
 * // Custom background image
 * <BackgroundImage source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')} />
 *
 * @example
 * // Custom tint opacity
 * <BackgroundImage tintClassName="bg-white/20" />
 *
 * @example
 * // With additional overlays
 * <BackgroundImage>
 *   <Animated.View style={animatedStyle} />
 * </BackgroundImage>
 */
export function BackgroundImage({
  source = require('@/../assets/images/background/onboarding-bg.jpg'),
  tintClassName = 'bg-white/10',
  children,
  className = 'absolute inset-0',
  testID,
}: BackgroundImageProps) {
  return (
    <View className={className} testID={testID}>
      <Image source={source} className="size-full" resizeMode="cover" />
      <View className={`absolute inset-0 ${tintClassName}`} />
      {children}
    </View>
  );
}
