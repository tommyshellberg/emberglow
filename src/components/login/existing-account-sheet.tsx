import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import type { ExistingAccountSummary } from '@/lib/auth/social';
import { colors, fontFamily, radii, spacing } from '@/theme';

import { cardBody, cardTitle } from './text-styles';

const META_SEPARATOR = ' · ';
const META_FONT_SIZE = 13;

export type ExistingAccountSheetProps = {
  /** Controlled visibility — the caller flips this; the sheet translates it
   * into the imperative present/dismiss `@gorhom/bottom-sheet` needs. */
  visible: boolean;
  /** The hero the colliding account already owns, straight off the wire. */
  account: ExistingAccountSummary;
  /** The user accepts: sign into the older account, abandoning the hero they
   * just created. This sheet does not act on that — it only reports it. */
  onConfirm: () => void;
  /** The user backs out, by the text link OR by swiping the sheet away /
   * tapping the backdrop. All three mean the same thing: keep the new hero. */
  onDismiss: () => void;
};

/**
 * Renders the level/streak line as "Level 7 · 12 day streak", built only from
 * the fields the summary actually carries.
 *
 * Every field is optional (see `ExistingAccountSummary`), and a missing one is
 * NOT defaulted: the server already applies its own fallbacks
 * (`character?.level || 1`), so an absent value here means a server that never
 * reported it — inventing "Level 1" would state something about the user's
 * account that nothing has told us. Absent is dropped; present is shown.
 *
 * Returns null when there is nothing to say, so the caller can skip the line
 * rather than render an empty row.
 */
function formatAccountMeta(account: ExistingAccountSummary): string | null {
  const parts: string[] = [];

  // `typeof` rather than `!== undefined`: JSON nulls are reachable in a way the
  // TS type doesn't express, and "Level null" is a shipped-copy bug.
  if (typeof account.level === 'number') {
    parts.push(`Level ${account.level}`);
  }

  const streak = account.dailyQuestStreak;
  if (typeof streak === 'number') {
    // 0 is a legitimate value the server sends (`dailyQuestStreak || 0`), not a
    // stand-in for "unknown" — but "0 day streak" reads like a bug.
    if (streak === 0) {
      parts.push('No streak yet');
    } else {
      parts.push(streak === 1 ? '1 day streak' : `${streak} day streak`);
    }
  }

  return parts.length > 0 ? parts.join(META_SEPARATOR) : null;
}

/**
 * Confirmation sheet for the existing-account collision: the social identity
 * the user just verified already owns a full account, and signing into it
 * discards the provisional hero they created minutes ago. The client overwrites
 * its local character store from the server, so without this gate the swap is
 * invisible until after it has happened.
 *
 * Purely presentational: it renders the choice and reports it. The caller owns
 * the credential replay, the analytics and the visibility state.
 */
export function ExistingAccountSheet({
  visible,
  account,
  onConfirm,
  onDismiss,
}: ExistingAccountSheetProps) {
  const { ref, present, dismiss } = useEmberglowBottomSheet();
  const hasPresented = React.useRef(false);

  // Single source of truth for present/dismiss, driven by the controlled
  // `visible` prop (same bridge as JoinGuildModal). Every close path — the text
  // link, a swipe, the backdrop — flips `visible` via `onDismiss` and lets this
  // effect do the actual closing.
  React.useEffect(() => {
    if (visible && !hasPresented.current) {
      present();
      hasPresented.current = true;
    } else if (!visible && hasPresented.current) {
      // Clear the flag BEFORE dismissing: `dismiss()` fires the sheet's
      // onDismiss synchronously, and that handler must no-op for a close we
      // initiated ourselves — otherwise it asks the caller to close, which
      // re-runs this effect, which dismisses again.
      hasPresented.current = false;
      dismiss();
    }
  }, [visible, present, dismiss]);

  // Fires for the close paths that never touch `visible`: swipe-down and
  // backdrop tap. Guarded for the same loop as above, from the other side.
  const handleSheetDismiss = React.useCallback(() => {
    if (hasPresented.current) {
      onDismiss();
    }
  }, [onDismiss]);

  const name = account.name?.trim();
  const meta = formatAccountMeta(account);

  return (
    <BottomSheet
      ref={ref}
      title="You already have a hero"
      onDismiss={handleSheetDismiss}
    >
      {/* An empty summary is reachable: `socialSignIn` throws with
          `details.account ?? {}`, so a server that sent no account payload
          would otherwise leave an empty bordered card on the sheet. */}
      {name || meta ? (
        <View testID="existing-account-summary" style={styles.identityCard}>
          {name ? (
            <Text testID="existing-account-name" style={styles.name}>
              {name}
            </Text>
          ) : null}
          {meta ? (
            <Text testID="existing-account-meta" style={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.body}>
        Signing in restores this hero. The one you just created was one quest
        old and won't be kept.
      </Text>

      <View style={styles.actions}>
        <Button
          testID="existing-account-confirm"
          // The sole action on this sheet, so it takes the one ember primary.
          variant="primary"
          fullWidth
          // Never "Continue as " — a blank name is reachable straight off the
          // wire (`character?.name || ''`), and this is the only action here.
          label={name ? `Continue as ${name}` : 'Continue to your account'}
          onPress={onConfirm}
          accessibilityHint="Signs into your existing account and discards the hero you just created"
        />
        <Button
          testID="existing-account-use-different"
          variant="ghost"
          fullWidth
          label="Use a different account"
          onPress={onDismiss}
          accessibilityHint="Keeps the hero you just created and closes this sheet"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  name: {
    ...cardTitle,
    textAlign: 'center',
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: META_FONT_SIZE,
    lineHeight: META_FONT_SIZE * 1.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  body: {
    ...cardBody,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  actions: {
    marginTop: spacing[5],
    gap: spacing[2],
  },
});
