/**
 * Emberglow BottomSheet
 *
 * Dependencies:
 * - @gorhom/bottom-sheet (v5)
 *
 * Spec: `.claude/skills/emberglow-design/components/overlay/BottomSheet.{jsx,d.ts,prompt.md}`
 *
 * Deviation from the web spec (intentional): `BottomSheet.d.ts` models visibility with a
 * controlled `open: boolean` prop plus `onClose`. That doesn't map cleanly onto
 * `@gorhom/bottom-sheet`, which is imperative by nature. This port instead follows the
 * established ref/`useModal`-style pattern already used throughout this codebase (see
 * `src/components/ui/modal.tsx` and its consumers under `src/components/modals/*`):
 * mount the sheet once, then call `present()` / `dismiss()` on a ref. There is no `open`
 * prop here — use `useEmberglowBottomSheet()` to get `{ ref, present, dismiss }` and pass `ref` to
 * `<BottomSheet>`, or forward a `ref` directly (a `BottomSheetModal` ref).
 *
 * Usage:
 * const { ref, present, dismiss } = useEmberglowBottomSheet();
 * <BottomSheet ref={ref} title="New: Skill Trees">
 *   <Text>Unlock perks that grow with your journey.</Text>
 * </BottomSheet>
 * present();
 */
import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, durations, easing, fontFamily, palette, radii } from '@/theme';

const MAX_DYNAMIC_CONTENT_RATIO = 0.86;
const HANDLE_INDICATOR_SIZE = { width: 42, height: 4 };
const CONTENT_PADDING_BOTTOM = 24;

export type BottomSheetProps = Omit<
  BottomSheetModalProps,
  'children' | 'backgroundStyle' | 'handleIndicatorStyle' | 'backdropComponent'
> & {
  /** Erstoria heading, centered at the top of the sheet. */
  title?: string;
  children: React.ReactNode;
};

type ForwardedBottomSheetRef = React.ForwardedRef<BottomSheetModal>;

/**
 * Ref-based present/dismiss controller, mirroring `useModal` from `ui/modal.tsx`.
 */
export const useEmberglowBottomSheet = () => {
  const ref = React.useRef<BottomSheetModal>(null);
  const present = React.useCallback((data?: unknown) => {
    // `BottomSheetModal`'s data-payload generic now defaults to `never`
    // (was `any`) as of @gorhom/bottom-sheet v5.2, but this hook is a
    // generic passthrough — the cast is compile-time only and does not
    // change what's forwarded to the underlying `present` call.
    ref.current?.present(data as never);
  }, []);
  const dismiss = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);
  return { ref, present, dismiss };
};

export const BottomSheet = React.forwardRef(
  (
    { title, children, ...props }: BottomSheetProps,
    ref: ForwardedBottomSheetRef
  ) => {
    const sheet = useEmberglowBottomSheet();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    React.useImperativeHandle(
      ref,
      () => (sheet.ref.current as BottomSheetModal) || null
    );

    const animationConfigs = React.useMemo(
      () => ({
        duration: durations.slow,
        easing: Easing.bezier(
          easing.emberOut[0],
          easing.emberOut[1],
          easing.emberOut[2],
          easing.emberOut[3]
        ),
      }),
      []
    );

    const renderBackdrop = React.useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
          opacity={1}
          style={[backdropProps.style, styles.backdrop]}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        {...props}
        ref={sheet.ref}
        enableDynamicSizing
        maxDynamicContentSize={windowHeight * MAX_DYNAMIC_CONTENT_RATIO}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handleIndicator}
        backdropComponent={renderBackdrop}
        animationConfigs={animationConfigs}
      >
        {title ? (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
        ) : null}
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: CONTENT_PADDING_BOTTOM + insets.bottom },
          ]}
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface.raised,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border.hairline,
    shadowColor: palette.richBlack,
    shadowOffset: { width: 0, height: -12 },
    shadowRadius: 48,
    shadowOpacity: 0.7,
  },
  handleIndicator: {
    width: HANDLE_INDICATOR_SIZE.width,
    height: HANDLE_INDICATOR_SIZE.height,
    borderRadius: radii.pill,
    backgroundColor: colors.fill.subtle,
  },
  backdrop: {
    backgroundColor: colors.scrim,
  },
  titleContainer: {
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
});
