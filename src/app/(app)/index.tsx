import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useResetStoryline } from '@/api/quest';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import { Badge, Button } from '@/components/emberglow';
import { BranchingStoryAnnouncementModal } from '@/components/modals/branching-story-announcement-modal';
import { GuildsAnnouncementModal } from '@/components/modals/guilds-announcement-modal';
import { NarratorVoiceAnnouncementModal } from '@/components/modals/narrator-voice-announcement-modal';
import { SkillTreeAnnouncementModal } from '@/components/modals/skill-tree-announcement-modal';
import { PremiumPaywall } from '@/components/paywall';
import { StreakCounter } from '@/components/StreakCounter';
import {
  BackgroundImage,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  useModal,
  View,
} from '@/components/ui';
import {
  QuestDeck,
  type QuestDeckItem,
} from '@/features/home/components/quest-deck';
import { StoryOptionButtons } from '@/features/home/components/story-option-buttons';
import {
  CARD_WIDTH,
  FOOTER_MIN_HEIGHT,
  QUEST_MODES,
} from '@/features/home/constants/home-constants';
import { useCarouselState } from '@/features/home/hooks/use-carousel-state';
import { useHomeData } from '@/features/home/hooks/use-home-data';
import { useQuestSelection } from '@/features/home/hooks/use-quest-selection';
import { useStoryOptions } from '@/features/home/hooks/use-story-options';
import { useAudioPreloader } from '@/hooks/use-audio-preloader';
import { useServerQuests } from '@/hooks/use-server-quests';
import { usePremiumAccess } from '@/lib/hooks/use-premium-access';
import QuestTimer from '@/lib/services/quest-timer';
import { refreshPremiumStatus as refreshServerPremium } from '@/lib/services/user';
import {
  getAnnouncementToShow,
  useAnnouncementStore,
} from '@/store/announcement-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';
import { useSettingsStore } from '@/store/settings-store';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import type { User } from '@/store/types';
import { useUserStore } from '@/store/user-store';
import { shadows } from '@/theme';

/**
 * Refreshes premium entitlement once, on mount.
 *
 * Extracted from `Home` because that component sat at exactly the 500-line
 * `max-lines-per-function` limit, so the next line added anywhere inside it —
 * a `testID`, in the event — tipped it over. Lifting a self-contained effect
 * out is a smaller change than reformatting the component, and the effect
 * reads better named than as an anonymous block halfway down a 500-line body.
 *
 * The RevenueCat side is cached and offline-tolerant by the SDK. The server
 * side is marked TEMPORARY by its original author and is a known nuisance for
 * provisional users, who 401 on it every time and burn refresh budget doing so
 * — see SHE-29. It stays for now because `refreshPremiumStatus` has only one
 * other caller (the post-purchase paywall), so removing it would strand
 * premium granted out of band. Now that it lives here, guarding it is a
 * one-line change.
 */
function usePremiumRefreshOnMount(refreshPremiumStatus: () => void) {
  useEffect(() => {
    refreshPremiumStatus();

    refreshServerPremium().catch((error) => {
      console.error('[Home] Server premium refresh error:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Feature-announcement modal refs plus the once-per-day gating effect that
 * decides which (if any) to present.
 *
 * Extracted from `Home` for the same reason as `usePremiumRefreshOnMount`
 * above: the component crept past the 500-line `max-lines-per-function`
 * limit again once the narrator-voice announcement wiring landed. This block
 * is self-contained — it reads only what its caller passes in and returns
 * only the four modal refs `Home` renders. Gating and the once-per-day
 * throttle itself still live in the announcement store (see
 * `getAnnouncementToShow`).
 */
function useFeatureAnnouncementSheets({
  hasCompletedFirstBranch,
  user,
  completedQuestsLength,
  availablePerksLength,
}: {
  hasCompletedFirstBranch: boolean;
  user: User | null;
  completedQuestsLength: number;
  availablePerksLength: number;
}) {
  const branchingModal = useModal();
  const skillTreeModal = useModal();
  const guildsModal = useModal();
  const narratorVoiceModal = useModal();

  const hasSeenBranchingAnnouncement = useAnnouncementStore(
    (state) => state.hasSeenBranchingAnnouncement
  );
  const hasSeenSkillTreeAnnouncement = useAnnouncementStore(
    (state) => state.hasSeenSkillTreeAnnouncement
  );
  const hasSeenGuildsAnnouncement = useAnnouncementStore(
    (state) => state.hasSeenGuildsAnnouncement
  );
  const hasSeenNarratorVoiceAnnouncement = useAnnouncementStore(
    (state) => state.hasSeenNarratorVoiceAnnouncement
  );
  const hasSeenDailyReminderPrompt = useAnnouncementStore(
    (state) => state.hasSeenDailyReminderPrompt
  );
  const lastAnnouncementShownAt = useAnnouncementStore(
    (state) => state.lastAnnouncementShownAt
  );
  const markAnnouncementShown = useAnnouncementStore(
    (state) => state.markAnnouncementShown
  );

  const dailyReminderEnabled = useSettingsStore(
    (state) => state.dailyReminder.enabled
  );
  const hasBeenPromptedForReminder = useSettingsStore(
    (state) => state.hasBeenPromptedForReminder
  );
  const reminderPromptedAt = useSettingsStore(
    (state) => state.reminderPromptedAt
  );

  // Decide which feature announcement (if any) to surface, honoring the
  // once-per-day cap. Previously three independent effects that could stack all
  // three sheets in one session; now a single selector-driven effect.
  useEffect(() => {
    const which = getAnnouncementToShow(
      {
        hasSeenBranchingAnnouncement,
        hasSeenSkillTreeAnnouncement,
        hasSeenGuildsAnnouncement,
        hasSeenNarratorVoiceAnnouncement,
        hasSeenDailyReminderPrompt,
        lastAnnouncementShownAt,
      },
      {
        hasCompletedFirstBranch,
        isRegistered: !!user && !user.isProvisional,
        completedQuestCount: completedQuestsLength,
        availablePerksCount: availablePerksLength,
        dailyReminderEnabled,
        hasBeenPromptedForReminder,
        reminderPromptedAt,
      }
    );

    if (!which) return;

    if (which === 'dailyReminder') {
      // The daily-reminder sheet itself lands in Task 8 (DailyReminderSheet +
      // home wiring). Until then, treat an eligible user as a no-op rather
      // than index into modalByKey with a ref that doesn't exist yet — this
      // also intentionally withholds markAnnouncementShown() so the day-cap
      // isn't burned on a prompt nobody saw.
      return;
    }

    const modalByKey = {
      branching: branchingModal,
      skillTree: skillTreeModal,
      guilds: guildsModal,
      narratorVoice: narratorVoiceModal,
    };

    // Delay slightly to let the screen settle, then present and stamp the
    // throttle so nothing else shows today.
    const timer = setTimeout(() => {
      modalByKey[which].present();
      markAnnouncementShown();
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    hasSeenBranchingAnnouncement,
    hasSeenSkillTreeAnnouncement,
    hasSeenGuildsAnnouncement,
    hasSeenNarratorVoiceAnnouncement,
    hasSeenDailyReminderPrompt,
    lastAnnouncementShownAt,
    hasCompletedFirstBranch,
    user,
    completedQuestsLength,
    availablePerksLength,
    dailyReminderEnabled,
    hasBeenPromptedForReminder,
    reminderPromptedAt,
    branchingModal,
    skillTreeModal,
    guildsModal,
    narratorVoiceModal,
    markAnnouncementShown,
  ]);

  return { branchingModal, skillTreeModal, guildsModal, narratorVoiceModal };
}

export default function Home() {
  const activeQuest = useQuestStore((state) => state.activeQuest);
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const refreshAvailableQuests = useQuestStore(
    (state) => state.refreshAvailableQuests
  );
  const availableQuests = useQuestStore((state) => state.availableQuests);

  // Premium access state
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const { handlePaywallSuccess } = usePremiumAccess();

  // Deck state with paywall reset. Item count is tied to QUEST_MODES
  // (always the 3 fixed modes), not carouselData.length, so this hook can
  // be called before useHomeData computes carouselData below.
  const { activeIndex, progress, advance } = useCarouselState({
    itemCount: QUEST_MODES.length,
    onPaywallReset: () => {
      if (showPaywallModal) {
        setShowPaywallModal(false);
      }
    },
  });

  const completedQuests = useQuestStore((state) => state.completedQuests);
  // First branching quest (quest-1a or quest-1b) unlocks the restart offer.
  const hasCompletedFirstBranch = completedQuests.some(
    (quest) => quest.id === 'quest-1a' || quest.id === 'quest-1b'
  );
  const user = useUserStore((state) => state.user);
  const availablePerks = useSkillTreeStore((state) =>
    state.getAvailablePerksToUnlock()
  );

  // Home-screen feature announcements. Gating + the once-per-day throttle live
  // in the announcement store (see getAnnouncementToShow); useFeatureAnnouncementSheets
  // owns the modal refs and the selection effect, and returns the refs this
  // screen presents.
  const { branchingModal, skillTreeModal, guildsModal, narratorVoiceModal } =
    useFeatureAnnouncementSheets({
      hasCompletedFirstBranch,
      user,
      completedQuestsLength: completedQuests.length,
      availablePerksLength: availablePerks.length,
    });

  // Use server-driven quests
  const {
    serverQuests,
    options: serverOptions,
    storylineProgress,
    isLoading: isLoadingQuests,
  } = useServerQuests();
  const _prepareQuest = useQuestStore((state) => state.prepareQuest);
  const _user = useUserStore((state) => state.user);
  const posthog = usePostHog();

  // Check if onboarding is complete to determine if audio preloading should be enabled
  const isOnboardingComplete = useOnboardingStore((state) =>
    state.isOnboardingComplete()
  );

  // Preload audio files for upcoming quests
  // Only enable for authenticated users (onboarding complete)
  // Provisional users get quest-1 audio preloaded in the first-quest screen
  useAudioPreloader({ storylineId: 'vaedros', enabled: isOnboardingComplete });

  // Use extracted hooks for data management
  const {
    carouselData,
    currentMapName: _currentMapName,
    storyProgress: _storyProgress,
    isStorylineComplete,
    hasStartedStoryline,
  } = useHomeData({
    serverQuests,
    availableQuests,
    storyOptions: [],
    completedQuests,
    isLoadingQuests,
    storylineProgress,
    totalStoryQuests: AVAILABLE_QUESTS.filter(
      (quest) => quest.mode === 'story' && !/quest-\d+b$/.test(quest.id)
    ).length,
  });

  const { storyOptions } = useStoryOptions({
    completedQuests,
    activeQuest,
    pendingQuest,
    serverOptions,
    serverQuests,
  });

  const {
    handleQuestOptionSelect,
    handleStartCustomQuest,
    handleCooperativeQuest,
  } = useQuestSelection({
    serverQuests,
    serverOptions,
  });

  // Storyline reset
  const resetStorylineMutation = useResetStoryline();

  const handleRestartStoryline = () => {
    Alert.alert(
      'Restart Storyline?',
      "This will reset your story progress to the first branching point. You'll keep all your achievements, stats, streaks, and XP—only your story progress resets.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            try {
              posthog.capture('storyline_restart_initiated', {
                storyline_id: 'vaedros',
                source: 'home_screen_restart_button',
              });

              await resetStorylineMutation.mutateAsync({
                storylineId: 'vaedros',
              });

              posthog.capture('storyline_reset_success', {
                storyline_id: 'vaedros',
                source: 'home_screen_restart_button',
              });

              // Refresh available quests to show the new options
              refreshAvailableQuests();
            } catch (error) {
              console.error('Error resetting storyline:', error);
              posthog.capture('storyline_reset_failed', {
                storyline_id: 'vaedros',
                source: 'home_screen_restart_button',
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              Alert.alert(
                'Error',
                'Failed to reset storyline. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  // Animation values
  const headerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  // Check for stuck cooperative quest and clean it up
  useEffect(() => {
    if (activeQuest && activeQuest.startTime) {
      // If there's an active quest with a start time but QuestTimer isn't tracking it
      const isQuestTimerRunning = QuestTimer.isRunning();

      if (!isQuestTimerRunning) {
        console.warn('Found stuck active quest, cleaning up...', activeQuest);
        // This quest was likely a cooperative quest that started prematurely
        useQuestStore.getState().failQuest();
      }
    }
  }, [activeQuest]);

  // Refresh available quests when there's no active quest
  // Only use local refresh if server quests aren't being used
  useEffect(() => {
    if (!activeQuest && !pendingQuest && serverQuests.length === 0) {
      refreshAvailableQuests();
    }
  }, [activeQuest, pendingQuest, refreshAvailableQuests, serverQuests.length]);

  // User data should already be loaded from auth hydration
  // The component will re-render when user data changes

  // Initialize animations
  useEffect(() => {
    headerOpacity.value = withDelay(450, withTiming(1, { duration: 1000 }));
    contentOpacity.value = withDelay(1000, withTiming(1, { duration: 1000 }));
    contentTranslateY.value = withDelay(1000, withSpring(0));
  }, [contentOpacity, contentTranslateY, headerOpacity]);

  // Check premium access for cooperative quests
  const {
    hasPremiumAccess: hasCoopAccess,
    checkPremiumAccess: _checkPremiumAccess,
    refreshPremiumStatus,
  } = usePremiumAccess();

  // Also get hasPremiumAccess without renaming for use in other places
  const { hasPremiumAccess } = usePremiumAccess();

  usePremiumRefreshOnMount(refreshPremiumStatus);

  // Animated background style based on carousel progress
  const backgroundStyle = useAnimatedStyle(() => {
    const inputRange = [0, 1, 2]; // Always have 3 modes now
    const outputRange = [
      QUEST_MODES[0].color,
      QUEST_MODES[1].color,
      QUEST_MODES[2].color,
    ];

    const backgroundColor = interpolateColor(
      progress.value,
      inputRange,
      outputRange
    );

    return {
      backgroundColor,
    };
  });

  // Mode deck data — the deck's card content, one entry per QUEST_MODES
  // slot (story / custom / cooperative).
  const deckData: QuestDeckItem[] = carouselData.map((item) => ({
    id: item.id,
    mode: item.mode,
    title: item.title,
    subtitle: item.subtitle,
    duration: item.duration,
    xp: item.xp,
    description: item.recap || '',
    progress: item.progress ?? 0,
    showProgress: item.mode === 'story',
    requiresPremium: Boolean(item.isPremium) && !hasPremiumAccess,
    isCompleted: item.mode === 'story' && isStorylineComplete,
    onRestart: item.mode === 'story' ? handleRestartStoryline : undefined,
  }));

  // Track premium CTA view
  const PremiumCTATracker = ({
    questId,
    type,
  }: {
    questId?: string;
    type: 'storyline' | 'cooperative';
  }) => {
    useEffect(() => {
      if (type === 'storyline') {
        posthog.capture('premium_upsell_cta_viewed', {
          upsell_type: 'storyline_quest',
          trigger_location: 'home_storyline',
          quest_type: 'story',
          quest_id: questId ?? null,
        });
      } else {
        posthog.capture('premium_upsell_cta_viewed', {
          upsell_type: 'cooperative_quest',
          trigger_location: 'home_carousel',
          quest_type: 'cooperative',
        });
      }
    }, [questId, type]);
    return null;
  };

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />

      {/* Background */}
      <BackgroundImage
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      >
        <Animated.View
          style={[
            backgroundStyle,
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: 0.6,
            },
          ]}
        />
      </BackgroundImage>

      <ScreenContainer className="flex-col">
        {/* Header — the streak rides in the header's right slot rather than
            floating over the background, so the title's flex-1 box shrinks to
            meet it instead of growing underneath it. */}
        <ScreenHeader
          testID="home-header"
          title="Choose an Adventure"
          rightComponent={<StreakCounter size="small" />}
        />

        {/* Main content area — the mode deck (story / custom / cooperative) */}
        <View style={styles.deckWrapper}>
          <QuestDeck
            data={deckData}
            activeIndex={activeIndex}
            onAdvance={advance}
          />
        </View>

        {/* Footer area with buttons */}
        {!activeQuest && (
          <View
            testID="home-footer"
            className="items-center justify-center"
            style={{
              minHeight: FOOTER_MIN_HEIGHT,
              // Committing the DecisionSlider arms pendingQuest while its
              // settle worklet still animates these views; unmounting them at
              // that instant is host-fatal on New Arch (reanimated#7594). Go
              // inert instead — pending-quest covers this a beat later.
              opacity: pendingQuest ? 0 : 1,
              pointerEvents: pendingQuest ? 'none' : 'auto',
            }}
          >
            {activeIndex === 0 ? (
              <StoryOptionButtons
                activeIndex={activeIndex}
                serverQuests={serverQuests}
                storyOptions={storyOptions}
                hasStartedStoryline={hasStartedStoryline}
                hasPremiumAccess={hasPremiumAccess}
                onQuestSelect={handleQuestOptionSelect}
                onShowPaywall={() => setShowPaywallModal(true)}
              />
            ) : activeIndex === 1 ? (
              // Show create custom quest button for custom mode
              <Animated.View
                entering={FadeIn.duration(600).delay(200)}
                className="w-full items-center px-4"
              >
                <Animated.View
                  entering={FadeInDown.duration(600).delay(400)}
                  style={[{ width: CARD_WIDTH }, shadows.card]}
                >
                  <Button
                    label="Create Custom Quest"
                    onPress={handleStartCustomQuest}
                    variant="primary"
                    size="lg"
                    fullWidth
                  />
                </Animated.View>
              </Animated.View>
            ) : activeIndex === 2 ? (
              // Show cooperative quest button for cooperative mode
              <Animated.View
                entering={FadeIn.duration(600).delay(200)}
                className="w-full items-center px-4"
              >
                {!hasCoopAccess && <PremiumCTATracker type="cooperative" />}
                <Animated.View
                  entering={FadeInDown.duration(600).delay(400)}
                  style={[{ width: CARD_WIDTH }, shadows.card]}
                >
                  {!hasCoopAccess && (
                    <View style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
                      <Badge tone="warm">Premium</Badge>
                    </View>
                  )}
                  <Button
                    label={
                      hasCoopAccess
                        ? 'Cooperative Quests'
                        : 'Unlock Cooperative Mode'
                    }
                    onPress={() => {
                      if (hasCoopAccess) {
                        handleCooperativeQuest();
                      } else {
                        posthog.capture('premium_upsell_cta_clicked', {
                          upsell_type: 'cooperative_quest',
                          trigger_location: 'home_carousel',
                          quest_type: 'cooperative',
                        });
                        setShowPaywallModal(true);
                      }
                    }}
                    variant="primary"
                    size="lg"
                    fullWidth
                  />
                </Animated.View>
              </Animated.View>
            ) : null}
          </View>
        )}
      </ScreenContainer>

      {/* Premium Paywall Modal */}
      <PremiumPaywall
        isVisible={showPaywallModal}
        source="home"
        onClose={() => {
          setShowPaywallModal(false);
        }}
        onSuccess={async () => {
          setShowPaywallModal(false);

          // Force refresh premium status
          await refreshPremiumStatus();

          // Call the hook's success handler
          handlePaywallSuccess();

          // Refresh quests to update premium access
          refreshAvailableQuests();
        }}
      />

      {/* Branching Story Announcement Modal */}
      <BranchingStoryAnnouncementModal ref={branchingModal.ref} />

      {/* Skill Tree Announcement Modal */}
      <SkillTreeAnnouncementModal ref={skillTreeModal.ref} />

      {/* Guilds Announcement Modal */}
      <GuildsAnnouncementModal ref={guildsModal.ref} />

      {/* Narrator Voice Announcement Modal */}
      <NarratorVoiceAnnouncementModal ref={narratorVoiceModal.ref} />
    </View>
  );
}

const styles = StyleSheet.create({
  deckWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
