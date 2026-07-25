/**
 * JoinGuildModal Component
 *
 * Sheet for joining an existing guild using an invite code.
 */

import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ArrowRight, User } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

import { GUILD_VALIDATION } from '../../constants/guild-strings';
import type { JoinGuildModalProps } from '../../types/guild-types';

const INVITE_CODE_LENGTH = 8;

const SAMPLE_MEMBERS = [
  {
    initials: 'JM',
    background: colors.accent.primary,
    color: colors.text.onAccent,
  },
  { initials: 'SK', background: palette.sandy, color: palette.richBlack },
  { initials: 'AL', background: palette.aegean, color: colors.text.primary },
];

/**
 * Visual illustration showing the concept of joining a guild:
 * "You" on the left, an arrow, and the guild's member avatars on the right.
 *
 * Memoised (no props) so it never re-renders while the user types in the code
 * field — the illustration is a dozen static views with nothing to update.
 */
const JoinIllustration = React.memo(function JoinIllustration() {
  return (
    <View style={styles.previewCard}>
      <View style={styles.illustrationRow}>
        <View style={styles.illustrationColumn}>
          <View style={styles.youAvatar}>
            <User size={22} color={colors.text.accent} />
          </View>
          <Text style={styles.caption}>You</Text>
        </View>

        <ArrowRight size={22} color={colors.text.accent} style={styles.arrow} />

        <View style={styles.illustrationColumn}>
          <View style={styles.avatarStack}>
            {SAMPLE_MEMBERS.map((member, index) => (
              <View
                key={member.initials}
                style={[
                  styles.avatar,
                  index > 0 && styles.avatarOverlap,
                  { backgroundColor: member.background },
                ]}
              >
                <Text style={[styles.avatarText, { color: member.color }]}>
                  {member.initials}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.caption}>Your Guild</Text>
        </View>
      </View>
    </View>
  );
});

export function JoinGuildModal({
  visible,
  onSubmit,
  onClose,
  isLoading,
  error,
}: JoinGuildModalProps) {
  const { ref, present, dismiss } = useEmberglowBottomSheet();
  const hasPresented = useRef(false);

  // Form state
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Mirror `code` in a ref so `handleSubmit` can read the latest value without
  // depending on `code` — that keeps its identity (and the memoised action row,
  // with its reanimated Buttons) stable across keystrokes.
  const codeRef = useRef(code);

  const resetForm = useCallback(() => {
    codeRef.current = '';
    setCode('');
    setValidationError(null);
  }, []);

  // Single source of truth for present/dismiss, driven by the controlled
  // `visible` prop. The close paths that leave the sheet open — Cancel, or a
  // programmatic close — flip `visible` via `onClose` and let this effect do the
  // actual closing and resetting. A sheet that closed ITSELF is handled in
  // `handleSheetDismiss` instead, and deliberately does not come back through
  // here.
  useEffect(() => {
    if (visible && !hasPresented.current) {
      present();
      hasPresented.current = true;
    } else if (!visible && hasPresented.current) {
      hasPresented.current = false;
      resetForm();
      dismiss();
    }
  }, [visible, present, dismiss, resetForm]);

  // Fires for EVERY close, including the `dismiss()` above: the modal's
  // `unmount()` calls the provided onDismiss either way
  // (BottomSheetModal.tsx:106-133), normally one close animation later via
  // `runOnJS`. The flag is what separates a close the USER performed —
  // swipe-down or backdrop tap, neither of which touches `visible` — from one we
  // performed ourselves.
  const handleSheetDismiss = useCallback(() => {
    if (hasPresented.current) {
      // The sheet is already closed and the store answers this by flipping
      // `visible` off. Left set, the effect above would then fire a SECOND
      // dismiss() at an unmounted modal, which parks @gorhom's status at
      // DISMISSING (`forceClose` no-ops on a null inner ref) and makes
      // `handlePortalRender` (:399-415) drop every later render — the sheet
      // silently never opens again. Repro before this line existed: open Join a
      // Guild, swipe it away, tap Join again.
      hasPresented.current = false;
      // The effect's close branch owns the reset and no longer runs for this
      // path, so reset here — otherwise a swiped-away sheet reopens with the
      // last typed code (and any validation error) still in the field.
      resetForm();
      onClose();
    }
  }, [onClose, resetForm]);

  const handleCancel = useCallback(() => {
    // Just ask the store to close; the effect owns the actual dismiss + reset.
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const trimmedCode = codeRef.current.trim().toUpperCase();

    // Validate code is not empty
    if (!trimmedCode) {
      setValidationError(GUILD_VALIDATION.INVITE_CODE_REQUIRED);
      return;
    }

    // Validate code format (8 alphanumeric characters)
    if (
      trimmedCode.length !== INVITE_CODE_LENGTH ||
      !/^[A-Z0-9]+$/.test(trimmedCode)
    ) {
      setValidationError(GUILD_VALIDATION.INVITE_CODE_INVALID);
      return;
    }

    setValidationError(null);
    onSubmit(trimmedCode);
  }, [onSubmit]);

  const handleCodeChange = useCallback((text: string) => {
    // Auto-uppercase and remove non-alphanumeric characters
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    codeRef.current = sanitized;
    setCode(sanitized);
    // Clear a showing validation error as the user corrects it. Functional
    // update keeps this callback's identity stable (no `validationError` dep).
    setValidationError((prev) => (prev ? null : prev));
  }, []);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const displayedError = validationError ?? error;

  // Static action row — stable deps mean React reuses this element across
  // keystrokes, so the reanimated Buttons don't re-render while typing.
  const actions = useMemo(
    () => (
      <View style={styles.actions}>
        <Button
          testID="join-guild-submit"
          label="Join Guild"
          onPress={handleSubmit}
          disabled={isLoading}
          fullWidth
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={handleCancel}
          fullWidth
        />
      </View>
    ),
    [handleSubmit, handleCancel, isLoading]
  );

  return (
    <BottomSheet ref={ref} title="Join a Guild" onDismiss={handleSheetDismiss}>
      <View style={styles.illustrationWrapper}>
        <JoinIllustration />
      </View>

      <Text style={styles.heading}>Enter Your Code</Text>

      <Text style={styles.body}>
        Got an invite code from a friend? Enter it below to join their guild and
        start questing together.
      </Text>

      <BottomSheetTextInput
        testID="guild-invite-code-input"
        placeholder="XXXXXXXX"
        placeholderTextColor={colors.text.muted}
        value={code}
        onChangeText={handleCodeChange}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.codeField,
          {
            borderColor: displayedError
              ? palette.cinnabar
              : focused
                ? withAlpha(palette.sandy, 0.55)
                : colors.border.subtle,
          },
        ]}
      />

      {displayedError ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{displayedError}</Text>
        </View>
      ) : null}

      {actions}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  illustrationWrapper: {
    marginBottom: spacing[5],
  },
  previewCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationColumn: {
    alignItems: 'center',
  },
  youAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.inset,
  },
  arrow: {
    marginHorizontal: spacing[4],
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.raised,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  caption: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.secondary,
  },
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  codeField: {
    height: 56,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  errorRow: {
    marginTop: spacing[3],
    backgroundColor: withAlpha(palette.cinnabar, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
    borderRadius: radii.md,
    padding: spacing[3],
  },
  errorText: {
    textAlign: 'center',
    color: colors.status.danger,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  actions: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
});
