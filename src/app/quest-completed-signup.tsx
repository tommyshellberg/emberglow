import { router } from 'expo-router';
import { Feather, Scroll, User, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CHARACTERS from '@/app/data/characters';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import { Badge, Button, EyebrowLabel } from '@/components/emberglow';
import {
  type SocialProvider,
  SocialSignInButtons,
} from '@/components/login/social-sign-in-buttons';
import { FocusAwareStatusBar } from '@/components/ui';
import type { SocialSignInOutcome } from '@/lib/auth/social';
import { useCharacterStore } from '@/store/character-store';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  tints,
  tracking,
} from '@/theme';

// Screen-specific sizing/copy (onboarding-screens.jsx ClaimScreen, lines
// 283-324). Entrance stagger kept inside the 0-600ms range used elsewhere in
// Phase 3 (was up to 2600ms before this recomposition).
const ANIM_DURATION = 400;
const ANIM_STAGGER = 100;
const TITLE_FONT_SIZE = 34;
const AVATAR_SIZE = 64;
const HERO_CARD_PADDING = 14;
const HERO_NAME_FONT_SIZE = 22;
const HERO_META_FONT_SIZE = 12;
const UNLOCKS_MARGIN_TOP = 26;
const UNLOCK_GAP = 14;
const UNLOCK_ICON_SIZE = 18;
const FOOTNOTE_FONT_SIZE = 14;
// Mockup constrains the footnote to `30ch` — approximated in points, same
// ratio as auth/magiclink/verify.tsx's 28ch/240pt precedent.
const FOOTNOTE_MAX_WIDTH = 260;
const FALLBACK_HERO_NAME = 'Your hero';
const FALLBACK_HERO_TYPE = 'Adventurer';

type UnlockIconComponent = typeof Scroll;

const UNLOCKS: { Icon: UnlockIconComponent; label: string }[] = [
  { Icon: Scroll, label: 'The story continues — chapter two awaits' },
  { Icon: Feather, label: 'Custom quests for the life you actually live' },
  { Icon: Users, label: 'Co-op quests with friends' },
];

function UnlockRow({
  Icon,
  label,
}: {
  Icon: UnlockIconComponent;
  label: string;
}) {
  return (
    <View style={styles.unlockRow}>
      <Icon size={UNLOCK_ICON_SIZE} color={palette.sandy} />
      <Text style={styles.unlockText}>{label}</Text>
    </View>
  );
}

export default function QuestCompletedSignupScreen() {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const character = useCharacterStore((state) => state.character);

  const handleCreateAccount = useCallback(() => {
    posthog.capture('onboarding_trigger_try_create_account');

    // Navigate to login - the login flow will handle setting onboarding to
    // COMPLETED after successful authentication.
    router.replace('/login');
  }, [posthog]);

  const handleSocialSignInSuccess = useCallback(
    (
      _target: 'onboarding' | 'app',
      _outcome: SocialSignInOutcome | (string & {}),
      provider: SocialProvider
    ) => {
      // The user arriving here already has a provisional character and has
      // completed quest-1 (that's how they reached this screen), so unlike
      // the login screen's `created` case, no explicit routing decision is
      // needed: `socialSignIn` (src/api/auth.ts) clears the provisional
      // tokens as a side effect, and the globally-mounted NavigationGate's
      // onboarding-sync heuristic (navigation-state-resolver.ts) then flips
      // onboarding to COMPLETED and routes to `/(app)` on its own — the
      // same mechanism the magic-link conversion path already relies on
      // (see `completeSignIn`'s JSDoc). This only fires the funnel event.
      posthog.capture('signup_completed', { method: provider });
    },
    [posthog]
  );

  const handleSocialSignInError = useCallback(
    (kind: 'email-in-use' | 'generic') => {
      showMessage({
        message:
          kind === 'email-in-use' ? 'Email already in use' : 'Sign-in failed',
        description:
          kind === 'email-in-use'
            ? 'This email is already tied to another account.'
            : 'Please try again.',
        type: 'danger',
        duration: 3000,
      });
    },
    []
  );

  // Hero card data — real data throughout, no hardcoded name/XP/type. XP is
  // quest-1's reward preview from AVAILABLE_QUESTS (matching the
  // first-quest-result.tsx precedent), not the character store's
  // accumulated `currentXP`, since the card means "what you just earned",
  // not "your lifetime total".
  const characterProfile = character
    ? CHARACTERS.find((c) => c.id === character.type)
    : undefined;
  const heroName = character?.name ?? FALLBACK_HERO_NAME;
  const heroLevel = character?.level ?? 1;
  const heroTypeLabel = characterProfile?.type ?? FALLBACK_HERO_TYPE;
  const firstQuestXP =
    AVAILABLE_QUESTS.find((quest) => quest.id === 'quest-1')?.reward.xp ?? 0;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[6],
        },
      ]}
    >
      <FocusAwareStatusBar />

      <Animated.View
        entering={FadeInDown.duration(ANIM_DURATION)}
        style={styles.header}
      >
        <EyebrowLabel tone="warm">Quest one · complete</EyebrowLabel>
        <Text style={styles.title}>Claim your legend</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(ANIM_STAGGER).duration(ANIM_DURATION)}
        style={styles.heroCard}
      >
        <View style={styles.avatar}>
          {characterProfile ? (
            <Image
              source={characterProfile.profileImage}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityLabel={`${heroName}'s character avatar`}
            />
          ) : (
            // Decorative — the hero's name is already visible as adjacent
            // text, so the fallback glyph adds nothing for screen readers.
            <User size={28} color={tints.sandy60} accessible={false} />
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{heroName}</Text>
          <Text style={styles.heroMeta}>
            {`Level ${heroLevel} · ${heroTypeLabel}`}
          </Text>
        </View>
        <Badge tone="warm">{`+${firstQuestXP} XP`}</Badge>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(ANIM_STAGGER * 2).duration(ANIM_DURATION)}
        style={styles.unlocks}
      >
        {UNLOCKS.map(({ Icon, label }) => (
          <UnlockRow key={label} Icon={Icon} label={label} />
        ))}
      </Animated.View>

      <View style={styles.spacer} />

      <Animated.View
        entering={FadeInDown.delay(ANIM_STAGGER * 3).duration(ANIM_DURATION)}
      >
        <Text style={styles.footnote}>
          {`${heroName} lives only on this device for now. 
          A free account is how you keep them.`}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(ANIM_STAGGER * 4).duration(ANIM_DURATION)}
      >
        <SocialSignInButtons
          onSuccess={handleSocialSignInSuccess}
          onError={handleSocialSignInError}
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          label="Create account"
          accessibilityLabel="Create account"
          onPress={handleCreateAccount}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[6],
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    // Repo convention for Erstoria display text: fontSize * 1.15 — see e.g.
    // pending-quest.tsx / profile-card.tsx.
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 10,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HERO_CARD_PADDING,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.lg,
    padding: HERO_CARD_PADDING,
    marginTop: spacing[6],
    ...shadows.card,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontFamily: fontFamily.display,
    fontSize: HERO_NAME_FONT_SIZE,
    lineHeight: HERO_NAME_FONT_SIZE * 1.15,
    color: colors.text.primary,
  },
  heroMeta: {
    fontFamily: fontFamily.semibold,
    fontSize: HERO_META_FONT_SIZE,
    letterSpacing: HERO_META_FONT_SIZE * tracking.label,
    textTransform: 'uppercase',
    color: colors.text.accent,
    marginTop: 3,
  },
  unlocks: {
    gap: UNLOCK_GAP,
    marginTop: UNLOCKS_MARGIN_TOP,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UNLOCK_GAP,
  },
  unlockText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15.5,
    lineHeight: 15.5 * 1.4,
    color: colors.text.secondary,
  },
  spacer: {
    flex: 1,
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: FOOTNOTE_FONT_SIZE,
    lineHeight: FOOTNOTE_FONT_SIZE * 1.55,
    color: colors.text.muted,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: FOOTNOTE_MAX_WIDTH,
    marginBottom: spacing[4],
  },
});
