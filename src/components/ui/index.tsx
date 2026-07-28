import { cssInterop } from 'nativewind';
import Svg from 'react-native-svg';

export * from './background-image';
export * from './button';
export * from './card';
export * from './checkbox';
export { default as colors } from './colors';
export * from './date-time-field';
export * from './duration-badge';
export * from './eyebrow';
export * from './focus-aware-status-bar';
export * from './gradient-background';
export * from './image';
export * from './input';
export * from './list';
export * from './modal';
export { default as BottomSheetKeyboardAwareScrollView } from './modal-keyboard-aware-scroll-view';
export * from './progress-bar';
export * from './screen-container';
export * from './screen-header';
export * from './segmented-control';
export * from './select';
export * from './text';
export * from './title';
export * from './utils';

// export base components from react-native
export {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
export { SafeAreaView } from 'react-native-safe-area-context';

//Apply cssInterop to Svg to resolve className string into style
cssInterop(Svg, {
  className: {
    target: 'style',
  },
});
