/* eslint-env jest */
/**
 * Ref-attaching `@gorhom/bottom-sheet` mock, for tests that assert on a sheet's
 * open/close behaviour rather than just its content.
 *
 * jest-setup.ts's global mock renders `BottomSheetModal` as
 * `jest.fn(({ children }) => children)` — a plain function component, so the
 * ref a component passes it never attaches and `present()` / `dismiss()` are
 * silent no-ops. Content assertions don't care, but anything that drives a sheet
 * imperatively does: with that mock, deleting a `present()` call outright fails
 * no test. This replacement exposes the imperative handle as jest.fn()s and
 * captures the `onDismiss` prop, which is the only way a synchronous test can
 * stand in for a swipe-down or backdrop tap (the real gesture lives in the
 * library's native pan handler).
 *
 * `dismiss()` here calls `onDismiss` synchronously. The real modal does that
 * only in the modal-stacking exception (BottomSheetModal.tsx:279-289); with the
 * sheet actually open it goes through `runOnUI(animateToPosition)` →
 * `runOnJS(handleOnClose)` → `unmount()` (:291-293) and the callback lands a
 * close animation later. Either way `unmount()` fires the provided `onDismiss`
 * (:106-133) — the point being modelled is that a PROGRAMMATIC close calls back
 * too, which is what a controlled-visibility bridge has to cope with. The
 * synchronous version is the tightest ordering a real close can take.
 *
 * Usage:
 *   jest.mock('@gorhom/bottom-sheet', () =>
 *     require('@/lib/test-mocks/gorhom-bottom-sheet').createBottomSheetMock()
 *   );
 *   beforeEach(resetBottomSheetMock);
 */
import * as React from 'react';
import type { FlatListProps, TextInputProps } from 'react-native';
import { FlatList, TextInput } from 'react-native';

export type BottomSheetHandleMock = {
  present: jest.Mock;
  dismiss: jest.Mock;
};

/**
 * Populated as the mocked modal mounts and renders. Shared by reference with
 * the consumer's `jest.mock` factory: its `require` of this helper and the test
 * file's `import` resolve to the same module instance.
 */
export const bottomSheetMock: {
  handle?: BottomSheetHandleMock;
  onDismiss?: () => void;
} = {};

export const resetBottomSheetMock = () => {
  bottomSheetMock.handle = undefined;
  bottomSheetMock.onDismiss = undefined;
};

type MockModalProps = {
  children?: React.ReactNode;
  onDismiss?: () => void;
};

export const createBottomSheetMock = () => {
  const BottomSheetModal = React.forwardRef<unknown, MockModalProps>(
    (props, ref) => {
      // The handle is built once, but `dismiss` has to reach the CURRENT
      // onDismiss — hence the ref indirection rather than a closure over the
      // first render's prop.
      const onDismissRef = React.useRef(props.onDismiss);
      onDismissRef.current = props.onDismiss;
      bottomSheetMock.onDismiss = props.onDismiss;

      React.useImperativeHandle(ref, () => {
        const handle: BottomSheetHandleMock = {
          present: jest.fn(),
          dismiss: jest.fn(() => {
            onDismissRef.current?.();
          }),
        };
        bottomSheetMock.handle = handle;
        return handle;
      }, []);

      return props.children;
    }
  );

  // Everything below mirrors jest-setup.ts's mock, so a sheet renders exactly as
  // it does under the global one. The unused exports still have to be here:
  // replacing a module replaces all of it, and the `@/components/emberglow`
  // barrel reaches several of them at load time.
  return {
    BottomSheetModal,
    BottomSheetModalProvider: jest.fn(
      ({ children }: { children?: React.ReactNode }) => children
    ),
    BottomSheetBackdrop: jest.fn(() => null),
    BottomSheetScrollView: jest.fn(
      ({ children }: { children?: React.ReactNode }) => children
    ),
    BottomSheetTextInput: jest.fn((props: TextInputProps) =>
      React.createElement(TextInput, props)
    ),
    BottomSheetFlatList: jest.fn((props: FlatListProps<unknown>) =>
      React.createElement(FlatList, props)
    ),
    createBottomSheetScrollableComponent: jest.fn(() =>
      jest.fn(({ children }: { children?: React.ReactNode }) => children)
    ),
    SCROLLABLE_TYPE: {
      FLATLIST: 'FlatList',
      SCROLLVIEW: 'ScrollView',
      SECTIONLIST: 'SectionList',
      VIRTUALIZED_LIST: 'VirtualizedList',
    },
  };
};
