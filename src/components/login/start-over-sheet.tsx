import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import { spacing } from '@/theme';

import { cardBody } from './text-styles';

/**
 * Stands in for the hero's name when there is none to print. Same wording as
 * `copy.ts`'s chooser fallback, kept local for the same reason
 * `existing-account-sheet.tsx` owns its own copy: a sheet's sentences are its
 * own, and `copy.ts` is the per-INTENT framing table, which this is not.
 */
const FALLBACK_HERO_NAME = 'your hero';

export type StartOverSheetProps = {
  /** Controlled visibility — the caller flips this; the sheet translates it
   * into the imperative present/dismiss `@gorhom/bottom-sheet` needs. */
  visible: boolean;
  /**
   * The hero this would discard. `character?.name` can be passed straight
   * through: `null`, `undefined`, `''` and whitespace all resolve to
   * `FALLBACK_HERO_NAME`, because `Character.name` is typed `string` with no
   * non-empty constraint and "discard  and the quest" is not a sentence.
   */
  heroName?: string | null;
  /** The user accepts: discard the hero and the finished quest. This sheet does
   * not act on that — it only reports it. */
  onConfirm: () => void;
  /** The user backs out, by the ghost button OR by swiping the sheet away /
   * tapping the backdrop. All three mean the same thing: keep the hero. */
  onDismiss: () => void;
};

/**
 * Confirmation gate in front of the `/login` "Create a hero" link.
 *
 * That link signs the user out, deletes all four provisional keys and resets
 * onboarding — a user who taps it to look at the welcome screen loses the hero
 * and the quest they have already finished, with nothing to undo it. The wipe is
 * silent and irreversible, so it does not run until this sheet says so.
 *
 * Purely presentational: it renders the choice and reports it. The caller owns
 * the wipe, the navigation and the visibility state.
 */
export function StartOverSheet({
  visible,
  heroName,
  onConfirm,
  onDismiss,
}: StartOverSheetProps) {
  const { ref, present, dismiss } = useEmberglowBottomSheet();
  const hasPresented = React.useRef(false);

  // Single source of truth for present/dismiss, driven by the controlled
  // `visible` prop (same bridge as ExistingAccountSheet and JoinGuildModal).
  // Every close path — the ghost button, a swipe, the backdrop — flips `visible`
  // via `onDismiss` and lets this effect do the actual closing.
  React.useEffect(() => {
    if (visible && !hasPresented.current) {
      present();
      hasPresented.current = true;
    } else if (!visible && hasPresented.current) {
      // Cleared before `dismiss()` so `handleSheetDismiss` sees a close it
      // should stay quiet about. Ordering only bites on the library's
      // synchronous dismiss path (BottomSheetModal.tsx:279-289); the usual path
      // calls back an animation later, by which time either order has run.
      hasPresented.current = false;
      dismiss();
    }
  }, [visible, present, dismiss]);

  // Fires for EVERY close, not just the user's: the modal's `unmount()` calls
  // the provided onDismiss for programmatic dismisses too
  // (BottomSheetModal.tsx:106-133), normally one close animation later via
  // `runOnJS`. So this flag is the only thing separating "the user swiped it
  // away or tapped the backdrop", which the caller must hear about, from "we
  // closed it ourselves" — which it must not, or the close that follows a
  // confirmed wipe would report a user back-out a few hundred ms after the hero
  // was already discarded.
  const handleSheetDismiss = React.useCallback(() => {
    if (hasPresented.current) {
      // Cleared here too, because this sheet is now closed and the caller
      // answers by flipping `visible` off: left set, the effect above would
      // fire a SECOND dismiss() at an unmounted modal. That one takes the async
      // branch (after `unmount()` the status is INITIAL, not CLOSED), parks the
      // status at DISMISSING and then no-ops on a null inner ref — after which
      // `handlePortalRender` (:399-415) drops every later render and the sheet
      // silently never opens again. On this sheet that means the confirmation in
      // front of an irreversible wipe stops appearing.
      hasPresented.current = false;
      onDismiss();
    }
  }, [onDismiss]);

  // `||`, not `??`: this is a "no usable name" check. Trimmed first for the same
  // reason `existing-account-sheet.tsx` trims — whitespace prints as a gap in
  // the sentence, which is indistinguishable from a missing word.
  const name = heroName?.trim() || FALLBACK_HERO_NAME;

  return (
    <BottomSheet ref={ref} title="Start over?" onDismiss={handleSheetDismiss}>
      <Text style={styles.body}>
        This will discard {name} and the quest you&apos;ve finished.
      </Text>

      <View style={styles.actions}>
        <Button
          testID="start-over-confirm"
          // The only affirmative action here (the other one closes the sheet),
          // so it takes the one ember primary — it is the branch the user came
          // to this sheet to take.
          variant="primary"
          fullWidth
          label="Start over"
          onPress={onConfirm}
          accessibilityHint="Discards your hero and your finished quest, then restarts onboarding from the beginning"
        />
        <Button
          testID="start-over-keep-hero"
          variant="ghost"
          fullWidth
          label="Keep my hero"
          onPress={onDismiss}
          accessibilityHint="Keeps your hero and closes this sheet"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    ...cardBody,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing[5],
    gap: spacing[2],
  },
});
