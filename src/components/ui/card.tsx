import React from 'react';
import {
  Image,
  type ImageStyle,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { twMerge } from 'tailwind-merge';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  headerImage?: any; // Image source (require or uri)
  headerImageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

export function Card({
  children,
  className = '',
  style,
  headerImage,
  headerImageStyle,
  testID,
}: CardProps) {
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: 'rgba(44, 69, 107, 0.90)', // cardBackground with 92% opacity
        },
        style,
      ]}
      className={twMerge(
        'rounded-lg overflow-hidden shadow-sm elevation-1',
        className
      )}
    >
      {headerImage && (
        <View style={{ position: 'relative' }}>
          <Image
            source={headerImage}
            style={[
              {
                height: 120,
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
              } as ImageStyle,
              headerImageStyle,
            ]}
            resizeMode="cover"
          />
          {/* White tint overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          />
        </View>
      )}
      {children}
    </View>
  );
}
