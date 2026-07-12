import { Flame } from 'lucide-react-native';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, palette, shadows, withAlpha } from '@/theme';

const CIRCLE_SIZE = 22;
const CONNECTOR_WIDTH = 22;
const ICON_SIZE = 11;

const litFill = withAlpha(palette.cinnabar, 0.16);
const litBorder = withAlpha(palette.cinnabar, 0.55);
const litConnector = withAlpha(palette.sandy, 0.5);

export type EmberProgressProps = {
  /** 1-based step the user is on; this and all earlier flames render lit. */
  current: number;
  /** @default 5 */
  steps?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Onboarding funnel progress — flames igniting along a path, the "embers"
 * style from `prototypes/onboarding/onboarding-screens.jsx` (`OProgress`).
 */
export function EmberProgress({
  current,
  steps = 5,
  style,
}: EmberProgressProps) {
  return (
    <View
      accessibilityLabel={`Step ${current} of ${steps}`}
      style={[styles.row, style]}
    >
      {Array.from({ length: steps }, (_, i) => {
        const step = i + 1;
        const lit = step <= current;
        const isCurrent = step === current;
        return (
          <React.Fragment key={step}>
            {step > 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: lit
                      ? litConnector
                      : colors.border.hairline,
                  },
                ]}
              />
            )}
            <View
              testID={`ember-progress-step-${step}`}
              style={[
                styles.circle,
                lit ? styles.circleLit : styles.circleUnlit,
                isCurrent && shadows.glowEmber,
              ]}
            >
              <Flame
                size={ICON_SIZE}
                color={lit ? palette.sandy : colors.text.muted}
              />
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: CONNECTOR_WIDTH,
    height: 1,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLit: {
    backgroundColor: litFill,
    borderColor: litBorder,
  },
  circleUnlit: {
    backgroundColor: 'transparent',
    borderColor: colors.border.hairline,
  },
});
