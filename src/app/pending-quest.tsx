import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestRewardPreview } from '@/api/quest-runs';
import {
  Badge,
  Button,
  EyebrowLabel,
  IconButton,
} from '@/components/emberglow';
import { BackgroundImage } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, palette, scrims, spacing } from '@/theme';

import { ActivePerksCard } from './pending-quest/components/active-perks-card';
import {
  ANIMATION_CONFIG,
  STRINGS,
  TEST_IDS,
  UI_CONFIG,
} from './pending-quest/constants';
import { usePendingQuestAnimations } from './pending-quest/hooks/use-pending-quest-animations';

// Screen-specific copy and sizing (quest-flow.jsx StartQuestScreen, lines
// 5-38). `./pending-quest/constants` is shared with
// `cooperative-pending-quest.tsx` — values that only apply to this screen's
// Emberglow layout live here instead of overloading a shared export.
const HERO_BODY_COPY =
  'Your hero stands ready. The story continues the moment you step away.';
const CANCEL_BUTTON_LABEL = 'Cancel quest';
// The back button fires the same handler as "Cancel quest" (see
// `handleCancelQuest`) rather than a plain `router.back()` — the app is
// force-routed back to this screen while a quest is pending
// (`navigation-state-resolver.ts`'s `pendingQuest` branch), so a bare
// "back" would just bounce right back here. The accessibility label names
// the actual effect (cancelling the quest) rather than "Go back", since a
// back arrow that quietly cancels something needs to say so.
const BACK_BUTTON_LABEL = 'Cancel quest';
const BACK_BUTTON_TEST_ID = 'pending-quest-back-button';
const STORY_MODE_BADGE_LABEL = 'Vaedros';
const LOCK_ICON_SIZE = 17;
const CONTENT_BOTTOM_PADDING = 36;
const TITLE_FONT_SIZE = 34;
const BODY_FONT_SIZE = 15;

export default function PendingQuestScreen() {
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const cancelQuest = useQuestStore((state) => state.cancelQuest);
  const userId = useUserStore((state) => state.user?.id);
  const insets = useSafeAreaInsets();

  // Fetch quest reward preview
  // Custom and cooperative quests need questData, story quests need questTemplateId
  const needsQuestData =
    pendingQuest?.mode === 'custom' || pendingQuest?.mode === 'cooperative';
  const { data: rewardPreview } = useQuestRewardPreview({
    questTemplateId: needsQuestData ? undefined : pendingQuest?.id,
    questData: needsQuestData
      ? {
          durationMinutes: pendingQuest?.durationMinutes || 0,
          category: pendingQuest?.category,
          mode: pendingQuest?.mode || 'custom',
          reward: {
            xp: pendingQuest?.reward?.xp || 0,
          },
        }
      : undefined,
    participantIds: userId ? [userId] : [],
    enabled: !!pendingQuest && !!userId,
  });

  // Use animation hook for all screen animations
  const { headerStyle, cardStyle, buttonStyle, shimmerStyle } =
    usePendingQuestAnimations(!!pendingQuest);

  const handleCancelQuest = () => {
    cancelQuest();
    router.back();
  };

  if (!pendingQuest) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  // XP resolution matches the old `QuestInfoCard` -> `RewardPreviewCard`
  // path: the current user's adjusted (post-perk) reward preview XP, falling
  // back to the quest's base reward while the preview is loading/unavailable.
  const participant = rewardPreview?.participantRewards[0];
  const xp = participant?.adjustedXP ?? pendingQuest.reward?.xp ?? 0;

  // Third badge: story quests always take place in Vaedros; custom quests
  // show their (required) category when it's a non-empty string.
  const thirdBadgeLabel =
    pendingQuest.mode === 'story'
      ? STORY_MODE_BADGE_LABEL
      : pendingQuest.category || undefined;

  return (
    <View style={styles.flex}>
      {/* Full-screen Background Image */}
      <BackgroundImage
        testID="background-image"
        source={require('@/../assets/images/background/card-background-alt.jpg')}
      />

      {/* Scrims over the background art (quest-flow.jsx:10-11) */}
      <LinearGradient
        pointerEvents="none"
        colors={scrims.top.colors}
        start={scrims.top.start}
        end={scrims.top.end}
        style={styles.scrimTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={scrims.bottom.colors}
        start={scrims.bottom.start}
        end={scrims.bottom.end}
        style={styles.scrimBottom}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing[4],
            paddingHorizontal: UI_CONFIG.HORIZONTAL_PADDING,
            paddingBottom: CONTENT_BOTTOM_PADDING,
          },
        ]}
      >
        <IconButton
          label={BACK_BUTTON_LABEL}
          onPress={handleCancelQuest}
          testID={BACK_BUTTON_TEST_ID}
          style={styles.backButton}
        >
          <ArrowLeft />
        </IconButton>

        {/* Eyebrow + Title + Badges + Body copy — left-aligned header block */}
        <Animated.View style={[headerStyle, styles.header]}>
          <EyebrowLabel>{getQuestModeLabel(pendingQuest.mode)}</EyebrowLabel>
          <Text style={styles.title}>{pendingQuest.title}</Text>
          <View style={styles.badgeRow}>
            <Badge tone="warm">{`+${xp} XP`}</Badge>
            <Badge tone="neutral">{`${pendingQuest.durationMinutes} min offline`}</Badge>
            {thirdBadgeLabel ? (
              <Badge tone="neutral">{thirdBadgeLabel}</Badge>
            ) : null}
          </View>
          <Text style={styles.bodyCopy}>{HERO_BODY_COPY}</Text>
        </Animated.View>

        {/* Active perks — restores the "active perks" info the redesign
            regressed, as a list card instead of layered art. */}
        <Animated.View style={[cardStyle, styles.perksCardWrapper]}>
          <ActivePerksCard participant={participant} />
        </Animated.View>

        <View style={styles.spacer} />

        {/* Lock Instructions - Outside Card with Shimmer */}
        <Animated.View
          testID={TEST_IDS.LOCK_INSTRUCTIONS}
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.LOCK_INSTRUCTIONS_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          style={[shimmerStyle, styles.lockRow]}
        >
          <Lock
            size={LOCK_ICON_SIZE}
            color={palette.sandy}
            accessibilityHidden
          />
          <Text
            style={styles.lockText}
            accessibilityLabel={STRINGS.LOCK_INSTRUCTIONS}
          >
            {STRINGS.LOCK_INSTRUCTIONS}
          </Text>
        </Animated.View>

        {/* Cancel Button — no tap-to-start affordance: quests begin when the
            phone locks (`QuestTimer.onPhoneLocked`), not on a button press. */}
        <Animated.View style={buttonStyle}>
          <Button
            onPress={handleCancelQuest}
            variant="ghost"
            fullWidth
            label={CANCEL_BUTTON_LABEL}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  content: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  backButton: {
    marginBottom: spacing[5],
  },
  header: {
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    // Repo convention for Erstoria display text: fontSize * 1.15, not the
    // documented --leading-display (1.12) — see e.g. profile-card.tsx.
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    textAlign: 'left',
    marginTop: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 14,
  },
  bodyCopy: {
    fontFamily: fontFamily.regular,
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_FONT_SIZE * 1.5,
    color: colors.text.secondary,
    textAlign: 'left',
    marginTop: 12,
  },
  perksCardWrapper: {
    marginTop: spacing[6],
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: 14,
  },
  lockText: {
    fontFamily: fontFamily.regular,
    fontSize: BODY_FONT_SIZE,
    color: colors.text.primary,
  },
});
