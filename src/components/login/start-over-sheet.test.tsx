import * as React from 'react';
import { StyleSheet } from 'react-native';

import {
  bottomSheetMock,
  resetBottomSheetMock,
} from '@/lib/test-mocks/gorhom-bottom-sheet';
import { fireEvent, render, screen } from '@/lib/test-utils';
import { colors } from '@/theme';

import { StartOverSheet } from './start-over-sheet';

// jest-setup.ts's global sheet mock never attaches a ref, so `present()` /
// `dismiss()` are silent no-ops there and its `onDismiss` prop is unreachable —
// neither this sheet's opening nor its dismissal routes would be observable.
// Same substitution `existing-account-sheet.test.tsx` makes, for the same reason.
jest.mock('@gorhom/bottom-sheet', () =>
  require('@/lib/test-mocks/gorhom-bottom-sheet').createBottomSheetMock()
);

// RNTL 13 sets `defaultIncludeHiddenElements: false`, so a bare `queryBy*`
// returning null proves absence only from the VISIBLE tree. Every absence
// assertion below opts hidden elements back in.
const hidden = { includeHiddenElements: true } as const;

// Deliberately not 'your hero': that is this sheet's missing-name fallback, so a
// fixture equal to it could not tell "read the prop" from "defaulted".
const HERO_NAME = 'Thornwake';

const renderSheet = (
  props: Partial<React.ComponentProps<typeof StartOverSheet>> = {}
) => {
  const onConfirm = jest.fn();
  const onDismiss = jest.fn();
  const view = render(
    <StartOverSheet
      visible
      heroName={HERO_NAME}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      {...props}
    />
  );
  return { ...view, onConfirm, onDismiss };
};

beforeEach(resetBottomSheetMock);

describe('StartOverSheet', () => {
  it('asks the question in the title, so the cost is legible before anything else', () => {
    renderSheet();

    expect(screen.getByText('Start over?')).toBeOnTheScreen();
  });

  it('names the hero and the quest the wipe would take', () => {
    renderSheet();

    expect(
      screen.getByText(
        "This will discard Thornwake and the quest you've finished."
      )
    ).toBeOnTheScreen();
  });

  // `''` is representable — `Character.name` is typed `string` with no
  // non-empty constraint — and it survives `??` while failing `||`, the
  // distinction that has already produced one bug on this branch. A blank name
  // must never leave the sentence reading "This will discard  and the quest…".
  it.each([
    ['absent', undefined],
    ['null', null],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('falls back to a generic hero when the name is %s', (_, heroName) => {
    renderSheet({ heroName });

    expect(
      screen.getByText(
        "This will discard your hero and the quest you've finished."
      )
    ).toBeOnTheScreen();
    // The fallback replaces the name rather than being appended to a gap.
    expect(screen.queryByText(/discard {2}/, hidden)).toBeNull();
  });

  it('labels the destructive action "Start over" and the way out "Keep my hero"', () => {
    renderSheet();

    expect(screen.getByText('Start over')).toBeOnTheScreen();
    expect(screen.getByText('Keep my hero')).toBeOnTheScreen();
  });

  it('fires onConfirm — and only onConfirm — when the destructive action is pressed', () => {
    const { onConfirm, onDismiss } = renderSheet();

    fireEvent.press(screen.getByTestId('start-over-confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('fires onDismiss — and only onDismiss — when "Keep my hero" is pressed', () => {
    const { onConfirm, onDismiss } = renderSheet();

    fireEvent.press(screen.getByTestId('start-over-keep-hero'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('reserves the ember primary for the confirm action, the sheet’s only action', () => {
    renderSheet();

    const confirm = StyleSheet.flatten(
      screen.getByTestId('start-over-confirm').props.style
    );
    const keep = StyleSheet.flatten(
      screen.getByTestId('start-over-keep-hero').props.style
    );

    // Asserted through the rendered background rather than a `variant` prop:
    // Button is the real component here, so this is what the user sees.
    expect(confirm.backgroundColor).toBe(colors.accent.primary);
    expect(keep.backgroundColor).toBe('transparent');
  });

  // The labels say what each button does; only the hints say what it COSTS.
  // Since confirming destroys a hero and a completed quest, that consequence
  // being reachable by a screen reader is part of the sheet's job.
  it('tells assistive tech what each action costs, not just what it does', () => {
    renderSheet();

    expect(
      screen.getByTestId('start-over-confirm').props.accessibilityHint
    ).toBe(
      'Discards your hero and your finished quest, then restarts onboarding from the beginning'
    );
    expect(
      screen.getByTestId('start-over-keep-hero').props.accessibilityHint
    ).toBe('Keeps your hero and closes this sheet');
  });

  describe('visibility bridge', () => {
    it('presents the sheet when it mounts visible', () => {
      renderSheet();

      expect(bottomSheetMock.handle?.present).toHaveBeenCalledTimes(1);
    });

    it('leaves the sheet closed when it mounts hidden', () => {
      renderSheet({ visible: false });

      // Without this, `handle` being undefined would make the assertion below
      // pass for the wrong reason (nothing to have been called).
      expect(bottomSheetMock.handle).toBeDefined();
      expect(bottomSheetMock.handle?.present).not.toHaveBeenCalled();
    });

    it('presents the sheet when the caller flips visible on', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet({
        visible: false,
      });

      rerender(
        <StartOverSheet
          visible
          heroName={HERO_NAME}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(bottomSheetMock.handle?.present).toHaveBeenCalledTimes(1);
    });

    it('dismisses the sheet when the caller flips visible to false', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      rerender(
        <StartOverSheet
          visible={false}
          heroName={HERO_NAME}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(bottomSheetMock.handle?.dismiss).toHaveBeenCalledTimes(1);
    });

    // The load-bearing ordering: `dismiss()` fires onDismiss (synchronously in
    // the mock, a close animation later in the library), so reporting that
    // dismiss back to the caller would ask it to close a sheet it just closed —
    // and here it would report a user back-out AFTER the wipe was confirmed.
    // Fails if the presented flag is cleared after `dismiss()` instead of
    // before, and fails if the guard in the onDismiss handler is dropped.
    it('does not report back the dismiss it performed itself', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      rerender(
        <StartOverSheet
          visible={false}
          heroName={HERO_NAME}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();
    });

    // Swipe-down and backdrop tap never touch `visible`, so the sheet has to
    // tell the caller. Driven by invoking the onDismiss prop the component
    // hands @gorhom/bottom-sheet — RNTL cannot perform either real gesture,
    // which lives in the library's native pan handler / backdrop pressable, and
    // both reach this component through exactly this one callback.
    it('reports a swipe-down or backdrop dismiss to the caller', () => {
      const { onConfirm, onDismiss } = renderSheet();

      bottomSheetMock.onDismiss?.();

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    // The sheet closed itself, the caller answers by flipping `visible` off,
    // and there is nothing left to close. A second dismiss() at the unmounted
    // modal parks @gorhom's status at DISMISSING (its `forceClose` no-ops on a
    // null inner ref), and `handlePortalRender` then drops every later render —
    // the sheet silently never opens again, which on THIS sheet means the
    // confirmation gate in front of a destructive wipe stops appearing.
    it('does not dismiss again after the sheet closed itself', () => {
      const { rerender, onConfirm, onDismiss } = renderSheet();

      bottomSheetMock.onDismiss?.();
      expect(onDismiss).toHaveBeenCalledTimes(1);

      rerender(
        <StartOverSheet
          visible={false}
          heroName={HERO_NAME}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      );

      expect(bottomSheetMock.handle).toBeDefined();
      expect(bottomSheetMock.handle?.dismiss).not.toHaveBeenCalled();
    });

    it('ignores a dismiss callback for a sheet it never presented', () => {
      const { onDismiss } = renderSheet({ visible: false });

      // Same trap: an undefined captured callback would make this pass without
      // ever exercising the guard.
      expect(bottomSheetMock.onDismiss).toBeDefined();
      bottomSheetMock.onDismiss?.();

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
