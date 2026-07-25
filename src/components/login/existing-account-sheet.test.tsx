import * as React from 'react';
import { StyleSheet } from 'react-native';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { colors } from '@/theme';

import { ExistingAccountSheet } from './existing-account-sheet';

/**
 * Local @gorhom/bottom-sheet mock, replacing the one in jest-setup.ts for this
 * file only. Two things this sheet's contract depends on are invisible through
 * the global mock (`BottomSheetModal: jest.fn(({ children }) => children)`, a
 * plain function component that never attaches a ref):
 *
 * 1. `present()` / `dismiss()` land on the modal instance — with no ref
 *    attached they are silent no-ops, so deleting either call from the
 *    component would not fail a single assertion.
 * 2. `onDismiss` fires for programmatic closes too, not only user gestures —
 *    `unmount()` calls it either way (BottomSheetModal.tsx:106-133). The real
 *    modal usually gets there a full close animation later
 *    (`runOnUI(animateToPosition)` → `runOnJS(handleOnClose)` → `unmount`,
 *    :291-293) and synchronously only in the modal-stacking exception at
 *    :279-289. The `dismiss` below fires it synchronously: that is the tightest
 *    ordering a real close can take and the one a synchronous test can observe,
 *    and what the sheet has to get right is telling its own closes apart from
 *    the user's, not the timing.
 *
 * Everything else mirrors jest-setup.ts's mock so the sheet renders its
 * children exactly as it does elsewhere.
 */
const mockSheetState: {
  handle?: { present: jest.Mock; dismiss: jest.Mock };
  onDismiss?: () => void;
} = {};

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  const BottomSheetModal = ReactActual.forwardRef(
    (
      props: { children?: React.ReactNode; onDismiss?: () => void },
      ref: React.Ref<unknown>
    ) => {
      // The imperative handle is built once, but `dismiss` has to reach the
      // CURRENT onDismiss — hence the ref indirection rather than a closure
      // over the first render's prop.
      const onDismissRef = ReactActual.useRef(props.onDismiss);
      onDismissRef.current = props.onDismiss;
      mockSheetState.onDismiss = props.onDismiss;

      ReactActual.useImperativeHandle(ref, () => {
        const handle = {
          present: jest.fn(),
          dismiss: jest.fn(() => {
            onDismissRef.current?.();
          }),
        };
        mockSheetState.handle = handle;
        return handle;
      }, []);

      return props.children;
    }
  );

  return {
    BottomSheetModal,
    BottomSheetModalProvider: jest.fn(({ children }) => children),
    BottomSheetBackdrop: jest.fn(() => null),
    BottomSheetScrollView: jest.fn(({ children }) => children),
    // Unused by this sheet, but reachable through the `@/components/emberglow`
    // barrel (QuestCard → @/components/ui). Replacing the module wholesale
    // means covering everything the import graph touches at load time.
    BottomSheetTextInput: jest.fn((props) =>
      ReactActual.createElement(RN.TextInput, props)
    ),
    BottomSheetFlatList: jest.fn((props) =>
      ReactActual.createElement(RN.FlatList, props)
    ),
    createBottomSheetScrollableComponent: jest.fn(() =>
      jest.fn(({ children }: { children: React.ReactNode }) => children)
    ),
    SCROLLABLE_TYPE: {
      FLATLIST: 'FlatList',
      SCROLLVIEW: 'ScrollView',
      SECTIONLIST: 'SectionList',
      VIRTUALIZED_LIST: 'VirtualizedList',
    },
  };
});

// RNTL skips accessibility-hidden elements by default, so a bare
// `queryBy*` returning null is not proof of absence. Every absence assertion
// below opts hidden elements back in.
const hidden = { includeHiddenElements: true } as const;

// Deliberately unlike the server's own fallbacks (`character?.level || 1`,
// `dailyQuestStreak || 0`): a fixture that matches a fallback cannot tell
// "read from the summary" apart from "defaulted".
const HERO = { name: 'Thornwake', level: 7, dailyQuestStreak: 12 } as const;

const renderSheet = (
  props: Partial<React.ComponentProps<typeof ExistingAccountSheet>> = {}
) => {
  const onConfirm = jest.fn();
  const onDismiss = jest.fn();
  const view = render(
    <ExistingAccountSheet
      visible
      account={HERO}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      {...props}
    />
  );
  return { ...view, onConfirm, onDismiss };
};

beforeEach(() => {
  mockSheetState.handle = undefined;
  mockSheetState.onDismiss = undefined;
});

describe('ExistingAccountSheet', () => {
  it('titles the sheet so the collision is legible before anything else', () => {
    renderSheet();

    expect(screen.getByText('You already have a hero')).toBeOnTheScreen();
  });

  it('names the hero the user is about to restore, with its level and streak', () => {
    renderSheet();

    expect(screen.getByText('Thornwake')).toBeOnTheScreen();
    expect(screen.getByText('Level 7 · 12 day streak')).toBeOnTheScreen();
  });

  it('spells out that the just-created hero is the one being discarded', () => {
    renderSheet();

    expect(
      screen.getByText(
        "Signing in restores this hero. The one you just created was one quest old and won't be kept."
      )
    ).toBeOnTheScreen();
  });

  it('offers the confirm action as "Continue as {name}"', () => {
    renderSheet();

    expect(screen.getByText('Continue as Thornwake')).toBeOnTheScreen();
  });

  it('fires onConfirm — and only onConfirm — when the confirm action is pressed', () => {
    const { onConfirm, onDismiss } = renderSheet();

    fireEvent.press(screen.getByTestId('existing-account-confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('fires onDismiss — and only onDismiss — when "Use a different account" is pressed', () => {
    const { onConfirm, onDismiss } = renderSheet();

    fireEvent.press(screen.getByTestId('existing-account-use-different'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("reserves the ember primary for the confirm action, the sheet's only action", () => {
    renderSheet();

    const confirm = StyleSheet.flatten(
      screen.getByTestId('existing-account-confirm').props.style
    );
    const useDifferent = StyleSheet.flatten(
      screen.getByTestId('existing-account-use-different').props.style
    );

    // Asserted through the rendered background rather than a `variant` prop:
    // Button is the real component here, so this is what the user sees.
    expect(confirm.backgroundColor).toBe(colors.accent.primary);
    expect(useDifferent.backgroundColor).toBe('transparent');
  });

  // `name: ''` is not hypothetical — the server reads it off a nullable
  // `character` subdocument as `character?.name || ''`, and it creates full
  // accounts with no character at all. A blank name must never leave the sole
  // action on the sheet reading "Continue as ".
  it.each([
    ['absent', undefined],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('keeps the confirm action actionable when the name is %s', (_, name) => {
    renderSheet({ account: { name, level: 7, dailyQuestStreak: 12 } });

    expect(screen.getByText('Continue to your account')).toBeOnTheScreen();
    expect(screen.queryByText(/Continue as/, hidden)).toBeNull();
  });

  it('renders no name line at all when the summary has no name', () => {
    renderSheet({ account: { name: '', level: 7, dailyQuestStreak: 12 } });

    // The level/streak line still renders — only the name line goes away.
    expect(screen.queryByTestId('existing-account-name', hidden)).toBeNull();
    expect(screen.getByText('Level 7 · 12 day streak')).toBeOnTheScreen();
  });

  it('omits the level when the summary has none, keeping the streak', () => {
    renderSheet({ account: { name: 'Thornwake', dailyQuestStreak: 12 } });

    expect(screen.getByText('12 day streak')).toBeOnTheScreen();
    expect(screen.queryByText(/Level/, hidden)).toBeNull();
  });

  it('omits the streak when the summary has none, keeping the level', () => {
    renderSheet({ account: { name: 'Thornwake', level: 7 } });

    expect(screen.getByText('Level 7')).toBeOnTheScreen();
    expect(screen.queryByText(/streak/i, hidden)).toBeNull();
  });

  it('reads a real zero streak as "No streak yet" rather than "0 day streak"', () => {
    renderSheet({
      account: { name: 'Thornwake', level: 7, dailyQuestStreak: 0 },
    });

    expect(screen.getByText('Level 7 · No streak yet')).toBeOnTheScreen();
    expect(screen.queryByText(/0 day streak/, hidden)).toBeNull();
  });

  it('says "1 day streak", not "1 days streak"', () => {
    renderSheet({
      account: { name: 'Thornwake', level: 7, dailyQuestStreak: 1 },
    });

    expect(screen.getByText('Level 7 · 1 day streak')).toBeOnTheScreen();
  });

  it('drops the whole level/streak line when the summary carries neither', () => {
    renderSheet({ account: { name: 'Thornwake' } });

    expect(screen.getByText('Thornwake')).toBeOnTheScreen();
    expect(screen.queryByTestId('existing-account-meta', hidden)).toBeNull();
    // The card itself stays — there is still a name to show inside it.
    expect(screen.getByTestId('existing-account-summary')).toBeOnTheScreen();
  });

  // `{}` is what `socialSignIn` throws with when the server sends no account
  // payload (`details.account ?? {}`), so this is a wire case, not a paranoia
  // case — and an empty bordered card would be a visible defect.
  it('renders no summary card at all when the summary is empty, staying actionable', () => {
    renderSheet({ account: {} });

    expect(screen.queryByTestId('existing-account-summary', hidden)).toBeNull();
    expect(screen.getByText('Continue to your account')).toBeOnTheScreen();
    expect(screen.getByText('Use a different account')).toBeOnTheScreen();
  });

  describe('visibility bridge', () => {
    it('presents the sheet when it mounts visible', () => {
      renderSheet();

      expect(mockSheetState.handle?.present).toHaveBeenCalledTimes(1);
    });

    it('leaves the sheet closed when it mounts hidden', () => {
      renderSheet({ visible: false });

      // Without this, `handle` being undefined would make the assertion below
      // pass for the wrong reason (nothing to have been called).
      expect(mockSheetState.handle).toBeDefined();
      expect(mockSheetState.handle?.present).not.toHaveBeenCalled();
    });

    it('dismisses the sheet when the caller flips visible to false', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      rerender(
        <ExistingAccountSheet
          visible={false}
          account={HERO}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(mockSheetState.handle?.dismiss).toHaveBeenCalledTimes(1);
    });

    // The load-bearing ordering: `dismiss()` fires onDismiss synchronously (see
    // the mock's note), so reporting that dismiss back to the caller would ask
    // it to close a sheet it just closed — an open/close loop. Fails if the
    // presented flag is cleared after `dismiss()` instead of before, and fails
    // if the guard in the onDismiss handler is dropped.
    it('does not report back the dismiss it performed itself', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      rerender(
        <ExistingAccountSheet
          visible={false}
          account={HERO}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();
    });

    // Swipe-down and backdrop tap never touch `visible`, so the sheet has to
    // tell the caller. Driven by invoking the onDismiss prop the component
    // hands @gorhom/bottom-sheet — RNTL cannot perform the real gesture, which
    // lives in the library's native pan handler.
    it('reports a swipe-down or backdrop dismiss to the caller', () => {
      const { onConfirm, onDismiss } = renderSheet();

      mockSheetState.onDismiss?.();

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    // The sheet closed itself, the caller answers by flipping `visible` off,
    // and there is nothing left to close. A second dismiss() at the unmounted
    // modal parks @gorhom's status at DISMISSING (its `forceClose` no-ops on a
    // null inner ref), and `handlePortalRender` then drops every later render —
    // the sheet silently never opens again. That consequence lives inside the
    // library, so what is asserted here is the call that causes it.
    it('does not dismiss again after the sheet closed itself', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      mockSheetState.onDismiss?.();
      expect(onDismiss).toHaveBeenCalledTimes(1);

      rerender(
        <ExistingAccountSheet
          visible={false}
          account={HERO}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(mockSheetState.handle).toBeDefined();
      expect(mockSheetState.handle?.dismiss).not.toHaveBeenCalled();
    });

    it('ignores a dismiss callback for a sheet it never presented', () => {
      const { onDismiss } = renderSheet({ visible: false });

      // Same trap: an undefined captured callback would make this pass without
      // ever exercising the guard.
      expect(mockSheetState.onDismiss).toBeDefined();
      mockSheetState.onDismiss?.();

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
