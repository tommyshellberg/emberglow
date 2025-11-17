import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { queryClient } from '@/api/common';
import type { QuestTemplate } from '@/api/quest/types';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import {
  cancelStreakWarningNotification,
  scheduleStreakWarningNotification,
} from '@/lib/services/notifications';
import QuestTimer from '@/lib/services/quest-timer';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { usePOIStore } from '@/store/poi-store';

import { useCharacterStore } from './character-store';
import { useOnboardingStore } from './onboarding-store';
import {
  type CooperativeQuestRun,
  type CustomQuestTemplate,
  type Quest,
  type QuestInvitation,
  type QuestReflection,
  type StoryQuestTemplate,
} from './types';

interface QuestState {
  activeQuest: Quest | null;
  pendingQuest: (CustomQuestTemplate | StoryQuestTemplate) | null;
  availableQuests: (CustomQuestTemplate | StoryQuestTemplate)[];
  failedQuest: Quest | null;
  completedQuests: Quest[];
  recentCompletedQuest: Quest | null;
  lastCompletedQuestTimestamp: number | null;
  currentLiveActivityId: string | null;
  failedQuests: Quest[];
  shouldShowStreakCelebration: boolean;
  // Server-driven quest data
  serverAvailableQuests: QuestTemplate[];
  hasMoreQuests: boolean;
  storylineComplete: boolean;
  // Cooperative quest fields
  currentInvitation: QuestInvitation | null;
  cooperativeQuestRun: CooperativeQuestRun | null;
  pendingInvitations: QuestInvitation[];
  // Actions
  cancelQuest: () => void;
  startQuest: (quest: Quest) => void;
  completeQuest: (ignoreDuration?: boolean) => Promise<Quest | null>;
  failQuest: () => void;
  refreshAvailableQuests: () => void;
  resetFailedQuest: () => void;
  clearRecentCompletedQuest: () => void;
  setShouldShowStreakCelebration: (show: boolean) => void;
  reset: () => void;
  getCompletedQuests: () => Quest[];
  prepareQuest: (quest: CustomQuestTemplate | StoryQuestTemplate) => void;
  setLiveActivityId: (id: string | null) => void;
  // Server-driven quest actions
  setServerAvailableQuests: (
    quests: QuestTemplate[],
    hasMore: boolean,
    complete: boolean
  ) => void;
  // Cooperative quest actions
  setCurrentInvitation: (invitation: QuestInvitation | null) => void;
  setCooperativeQuestRun: (run: CooperativeQuestRun | null) => void;
  setPendingInvitations: (invitations: QuestInvitation[]) => void;
  updateParticipantReady: (userId: string, ready: boolean) => void;
  syncQuestRuns: (questRuns: Quest[]) => void;
  // Reflection actions
  addReflectionToQuest: (questId: string, reflection: QuestReflection) => void;
}

// Create type-safe functions for Zustand's storage
const getItemForStorage = (name: string) => {
  const value = getItem<string>(name);
  return value ?? null;
};

const setItemForStorage = async (name: string, value: string) => {
  setItem(name, value);
};

const removeItemForStorage = async (name: string) => {
  removeItem(name);
};

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      activeQuest: null,
      pendingQuest: null,
      availableQuests: [],
      failedQuest: null,
      completedQuests: [],
      recentCompletedQuest: null,
      lastCompletedQuestTimestamp: null,
      currentLiveActivityId: null,
      failedQuests: [],
      shouldShowStreakCelebration: false,
      // Server-driven quest data
      serverAvailableQuests: [],
      hasMoreQuests: false,
      storylineComplete: false,
      // Cooperative quest fields
      currentInvitation: null,
      cooperativeQuestRun: null,
      pendingInvitations: [],
      prepareQuest: (quest: CustomQuestTemplate | StoryQuestTemplate) => {
        const currentCooperativeQuestRun = get().cooperativeQuestRun;
        // Only clear cooperative quest data when preparing a non-cooperative quest
        const shouldClearCooperativeData =
          quest.mode !== 'custom' || quest.category !== 'cooperative';

        set({
          pendingQuest: quest,
          availableQuests: [],
          cooperativeQuestRun: shouldClearCooperativeData
            ? null
            : currentCooperativeQuestRun,
          currentInvitation: shouldClearCooperativeData
            ? null
            : get().currentInvitation,
        });
      },

      startQuest: (quest: Quest) => {
        const startedQuest = {
          ...quest,
          startTime: Date.now(),
        };
        set({ activeQuest: startedQuest, pendingQuest: null });
      },

      completeQuest: async (ignoreDuration = false) => {
        const { activeQuest, lastCompletedQuestTimestamp } = get();
        if (activeQuest && activeQuest.startTime) {
          const completionTime = Date.now();
          const duration = (completionTime - activeQuest.startTime) / 1000;

          if (ignoreDuration || duration >= activeQuest.durationMinutes * 60) {
            // Quest completed successfully
            const questRunId = QuestTimer.getQuestRunId();

            // Create base completed quest
            let completedQuest: Quest = {
              ...activeQuest,
              stopTime: completionTime,
              status: 'completed' as const,
              questRunId: questRunId || undefined,
            };

            // Fetch quest run data from server to get participant rewards
            if (questRunId) {
              try {
                console.log('[QuestStore] Fetching quest run data to get rewards:', questRunId);
                const { getQuestRunStatus } = await import('@/lib/services/quest-run-service');
                const questRunData = await getQuestRunStatus(questRunId);

                console.log('[QuestStore] Quest run data received:', {
                  questRunId,
                  status: questRunData.status,
                  hasParticipants: !!questRunData.participants,
                  participantCount: questRunData.participants?.length,
                });

                // Add participants with rewards to the completed quest
                if (questRunData.participants) {
                  completedQuest.participants = questRunData.participants.map((p: any) => ({
                    userId: typeof p === 'string' ? p : p.userId,
                    ready: typeof p === 'object' ? p.ready : true,
                    status: typeof p === 'object' ? p.status : 'completed',
                    phoneLocked: typeof p === 'object' ? p.phoneLocked : undefined,
                    rewards: typeof p === 'object' ? p.rewards : undefined,
                  }));

                  console.log('[QuestStore] Added participant rewards to completed quest:', {
                    questId: completedQuest.id,
                    participantCount: completedQuest.participants.length,
                    firstParticipantRewards: completedQuest.participants[0]?.rewards,
                  });
                }
              } catch (error) {
                console.error('[QuestStore] Failed to fetch quest run data for rewards:', error);
                // Continue with base completed quest if fetch fails
              }
            }

            // Track cooperative quest success
            const cooperativeQuestRun = get().cooperativeQuestRun;
            if (cooperativeQuestRun) {
              // Note: PostHog tracking is handled in the UI components
              // where we have access to the posthog instance
            }

            // Check if this is the first quest completed today
            const isFirstQuestOfTheDay = (() => {
              if (!lastCompletedQuestTimestamp) return true;

              const lastDate = new Date(lastCompletedQuestTimestamp);
              const now = new Date(completionTime);

              return (
                lastDate.getDate() !== now.getDate() ||
                lastDate.getMonth() !== now.getMonth() ||
                lastDate.getFullYear() !== now.getFullYear()
              );
            })();

            const characterStore = useCharacterStore.getState();
            characterStore.updateStreak(lastCompletedQuestTimestamp);

            // Check if we should show streak celebration
            const shouldShowStreakCelebration = (() => {
              const dailyQuestStreak = characterStore.dailyQuestStreak;
              const lastStreakCelebrationShown =
                characterStore.lastStreakCelebrationShown;

              console.log('[QuestStore] Checking streak celebration:', {
                dailyQuestStreak,
                lastStreakCelebrationShown,
                lastShownDate: lastStreakCelebrationShown
                  ? new Date(lastStreakCelebrationShown).toDateString()
                  : null,
                today: new Date().toDateString(),
              });

              // Must have a streak (at least 1)
              if (dailyQuestStreak < 1) {
                console.log('[QuestStore] No streak, not showing celebration');
                return false;
              }

              // Check if we've already shown the celebration today
              const today = new Date();
              const todayString = today.toDateString();

              if (lastStreakCelebrationShown) {
                const lastShownDate = new Date(lastStreakCelebrationShown);
                const lastShownString = lastShownDate.toDateString();

                // If we already showed it today, don't show again
                if (lastShownString === todayString) {
                  console.log(
                    '[QuestStore] Already shown today, not showing again'
                  );
                  return false;
                }
              }

              // Haven't shown it today, so we should show it
              console.log('[QuestStore] Should show streak celebration!');
              return true;
            })();

            console.log(
              '[QuestStore] Setting state with shouldShowStreakCelebration:',
              shouldShowStreakCelebration
            );

            console.log('[QuestStore] Setting recentCompletedQuest:', {
              questId: completedQuest.id,
              questRunId: completedQuest.questRunId,
              hasParticipants: !!(completedQuest as any).participants,
              xp: completedQuest.reward.xp,
            });

            set((state) => ({
              activeQuest: null, // Quest is no longer active
              pendingQuest: null, // Clear any lingering pending quest
              recentCompletedQuest: completedQuest,
              lastCompletedQuestTimestamp: completionTime,
              completedQuests: [...state.completedQuests, completedQuest],
              // TODO: does this interfere with updating the live activity?
              currentLiveActivityId: null, // Clear activity ID on completion
              cooperativeQuestRun: null, // Clear cooperative quest run on completion
              shouldShowStreakCelebration, // Set the flag here
            }));

            if (activeQuest.mode === 'story' && activeQuest.poiSlug) {
              const poiStore = usePOIStore.getState();
              poiStore.revealLocation(activeQuest.poiSlug);
            }

            characterStore.addXP(completedQuest.reward.xp);

            // Invalidate user details cache to force fresh data from server
            // This ensures local XP/level syncs with server-calculated values
            queryClient.invalidateQueries({
              queryKey: ['user', 'details'] as const,
            });

            // Invalidate next available quests to fetch fresh quest options
            // This ensures we get the correct next quest after completing one
            queryClient.invalidateQueries({
              queryKey: ['next-available-quests'] as const,
            });

            // If this is the first quest completed today, cancel today's warning
            // and schedule tomorrow's warning
            if (isFirstQuestOfTheDay) {
              cancelStreakWarningNotification()
                .then(() => scheduleStreakWarningNotification(true))
                .catch((err) =>
                  console.error('Error scheduling streak notifications:', err)
                );
            }

            return completedQuest;
          } else {
            // Duration not met
            console.warn(
              'CompleteQuest called but duration not met for quest:',
              activeQuest.id
            );
            get().failQuest(); // Fail the quest if duration condition isn't met
            return null;
          }
        }
        console.warn(
          'CompleteQuest called but no active quest found or quest has no start time.'
        );
        return null;
      },

      cancelQuest: () => {
        const { activeQuest, pendingQuest, cooperativeQuestRun } = get();
        if (activeQuest || pendingQuest) {
          // End any active live activity when quest is canceled
          QuestTimer.stopQuest();
          set({
            activeQuest: null,
            pendingQuest: null,
            currentLiveActivityId: null,
            // Clear cooperative quest run if this was a cooperative quest
            cooperativeQuestRun:
              (pendingQuest?.mode === 'custom' &&
                pendingQuest?.category === 'cooperative') ||
              (activeQuest?.mode === 'custom' &&
                'category' in activeQuest &&
                activeQuest?.category === 'cooperative')
                ? null
                : cooperativeQuestRun,
          });
        }
      },

      failQuest: () => {
        const { activeQuest, pendingQuest } = get();
        const failedQuestDetails = activeQuest || pendingQuest;
        if (failedQuestDetails) {
          QuestTimer.stopQuest();

          // Ensure all required fields for Quest are present
          const now = Date.now();
          const cooperativeQuestRun = get().cooperativeQuestRun;
          const questId =
            failedQuestDetails.id ||
            cooperativeQuestRun?.questId ||
            `failed-${now}`;

          // Track cooperative quest failure
          if (cooperativeQuestRun) {
            // Note: PostHog tracking is handled in the UI components
            // where we have access to the posthog instance
          }

          const failedQuestWithTime: Quest = {
            ...failedQuestDetails,
            startTime: activeQuest?.startTime || now,
            stopTime: now,
            status: 'failed' as const,
            reward: failedQuestDetails.reward ?? { xp: 0 },
            durationMinutes: failedQuestDetails.durationMinutes ?? 0,
            title: failedQuestDetails.title ?? 'Unknown Quest',
            id: questId,
            questRunId: QuestTimer.getQuestRunId() || undefined,
            // Add any other required fields here
          };

          set({
            failedQuest: failedQuestWithTime,
            failedQuests: [...get().failedQuests, failedQuestWithTime],
            activeQuest: null,
            pendingQuest: null,
            currentLiveActivityId: null,
            cooperativeQuestRun: null, // Clear cooperative quest run on failure
          });
        }
      },

      refreshAvailableQuests: () => {
        const { activeQuest, completedQuests, serverAvailableQuests } = get();

        if (activeQuest) {
          // If there is an active quest, don't refresh available quests
          return;
        }

        // If server has provided quests, don't override them with local logic
        // This allows server to provide previously completed quests for checkpoint scenarios
        if (serverAvailableQuests && serverAvailableQuests.length > 0) {
          console.log('🎯 Server quests available, skipping local quest logic');
          return;
        }

        // Local quest logic - only used as fallback for unauthenticated users
        // If no quests completed, start with quest-1 (this is the only valid case for showing quest-1)
        if (completedQuests.length === 0) {
          const firstQuest = AVAILABLE_QUESTS.find((q) => q.id === 'quest-1');
          if (firstQuest) {
            set({ availableQuests: [firstQuest] });
            return;
          }
          set({ availableQuests: [] });
          return;
        }

        // Filter for only story quests
        const storyQuests = completedQuests.filter(
          (q) => q.mode === 'story' && q.status === 'completed'
        );

        // If no story quests at all, show no quests
        // (don't fallback to first quest - that would hide a potential issue)
        if (storyQuests.length === 0) {
          set({ availableQuests: [] });
          return;
        }

        // Sort story quests by completion time (newest first)
        const sortedStoryQuests = [...storyQuests].sort(
          (a, b) => (b.stopTime || 0) - (a.stopTime || 0)
        );

        // Use the most recent STORY quest to determine what comes next
        const lastCompletedStory = sortedStoryQuests[0];

        // Find the quest template for the last completed story quest
        const lastCompletedTemplate = AVAILABLE_QUESTS.find(
          (q) => q.id === lastCompletedStory.id
        );

        if (lastCompletedTemplate && 'options' in lastCompletedTemplate) {
          // For quests with options, find the next quest IDs
          const nextQuestIds = lastCompletedTemplate.options.map(
            (opt) => opt.nextQuestId
          );

          // Filter out null nextQuestIds (end of storyline)
          const validNextQuestIds = nextQuestIds.filter((id) => id !== null);

          // Find those quests from available quests
          const nextQuests = AVAILABLE_QUESTS.filter(
            (q) =>
              validNextQuestIds.includes(q.id) &&
              !completedQuests.some((completed) => completed.id === q.id)
          );

          if (nextQuests.length > 0) {
            set({ availableQuests: nextQuests });
            return;
          }
        }

        // For quests without options or if we can't find the template,
        // try to infer the next level based on quest ID patterns
        const idMatch = lastCompletedStory.id.match(/quest-(\d+)/);
        if (idMatch) {
          const currentLevel = parseInt(idMatch[1]);
          const nextLevel = currentLevel + 1;

          // Look for quests at the next level
          const nextLevelQuests = AVAILABLE_QUESTS.filter(
            (q) =>
              q.id.startsWith(`quest-${nextLevel}`) &&
              !q.id.includes('a') &&
              !q.id.includes('b') &&
              !completedQuests.some((completed) => completed.id === q.id)
          );

          if (nextLevelQuests.length > 0) {
            set({ availableQuests: [nextLevelQuests[0]] });
            return;
          }
        }

        // If we can't find next quests, return an empty array
        // This is expected if all quests are completed or there's no clear next step
        set({ availableQuests: [] });
      },

      resetFailedQuest: () => {
        set({ failedQuest: null });
      },

      clearRecentCompletedQuest: () => {
        set({ recentCompletedQuest: null });
      },

      setShouldShowStreakCelebration: (show: boolean) => {
        set({ shouldShowStreakCelebration: show });
      },

      getCompletedQuests: () => {
        return get().completedQuests;
      },

      setLiveActivityId: (id: string | null) => {
        set({ currentLiveActivityId: id });
      },

      // Cooperative quest actions
      setCurrentInvitation: (invitation: QuestInvitation | null) => {
        set({ currentInvitation: invitation });
      },

      setCooperativeQuestRun: (run: CooperativeQuestRun | null) => {
        set({ cooperativeQuestRun: run });
      },

      setPendingInvitations: (invitations: QuestInvitation[]) => {
        set({ pendingInvitations: invitations });
      },

      updateParticipantReady: (userId: string, ready: boolean) => {
        const { cooperativeQuestRun } = get();
        if (!cooperativeQuestRun) return;

        const updatedParticipants = cooperativeQuestRun.participants.map((p) =>
          p.userId === userId ? { ...p, ready } : p
        );

        set({
          cooperativeQuestRun: {
            ...cooperativeQuestRun,
            participants: updatedParticipants,
          },
        });
      },

      syncQuestRuns: (questRuns: Quest[]) => {
        const currentState = get();

        // Create maps for all quests (server quests)
        const serverQuestMap = new Map<string, Quest>();
        questRuns.forEach((quest) => {
          const key = `${quest.id}-${quest.stopTime}`;
          serverQuestMap.set(key, quest);
        });

        // Merge with local quests, preserving local-only quests
        const mergedCompletedMap = new Map<string, Quest>();
        const mergedFailedMap = new Map<string, Quest>();

        // First, add all server quests
        questRuns.forEach((quest) => {
          const key = `${quest.id}-${quest.stopTime}`;
          if (quest.status === 'completed') {
            mergedCompletedMap.set(key, quest);
          } else if (quest.status === 'failed') {
            mergedFailedMap.set(key, quest);
          }
        });

        // Then, add local quests that aren't on the server
        currentState.completedQuests.forEach((localQuest) => {
          const key = `${localQuest.id}-${localQuest.stopTime}`;
          if (!serverQuestMap.has(key)) {
            // This is a local-only quest, preserve it
            mergedCompletedMap.set(key, localQuest);
          }
        });

        currentState.failedQuests.forEach((localQuest) => {
          const key = `${localQuest.id}-${localQuest.stopTime}`;
          if (!serverQuestMap.has(key)) {
            // This is a local-only quest, preserve it
            mergedFailedMap.set(key, localQuest);
          }
        });

        // Only update if there are changes to avoid re-renders
        const newCompletedQuests = Array.from(mergedCompletedMap.values());
        const newFailedQuests = Array.from(mergedFailedMap.values());

        const hasCompletedChanges =
          newCompletedQuests.length !== currentState.completedQuests.length ||
          newCompletedQuests.some((quest, index) => {
            const existing = currentState.completedQuests[index];
            return (
              !existing ||
              quest.id !== existing.id ||
              quest.stopTime !== existing.stopTime
            );
          });

        const hasFailedChanges =
          newFailedQuests.length !== currentState.failedQuests.length ||
          newFailedQuests.some((quest, index) => {
            const existing = currentState.failedQuests[index];
            return (
              !existing ||
              quest.id !== existing.id ||
              quest.stopTime !== existing.stopTime
            );
          });

        if (hasCompletedChanges || hasFailedChanges) {
          set({
            completedQuests: newCompletedQuests,
            failedQuests: newFailedQuests,
          });
        }
      },

      setServerAvailableQuests: (
        quests: QuestTemplate[],
        hasMore: boolean,
        complete: boolean
      ) => {
        // Check if we're in onboarding and shouldn't progress past quest-1
        const onboardingStore = useOnboardingStore.getState();
        const hasSeenSignupPrompt = onboardingStore.hasSeenSignupPrompt();
        const isOnboardingComplete = onboardingStore.isOnboardingComplete();

        // If user hasn't signed up yet and has completed quest-1,
        // don't allow progression to next quests
        if (!isOnboardingComplete && hasSeenSignupPrompt) {
          console.log(
            '🎯 Blocking quest progression - user must complete signup first'
          );
          return; // Don't update available quests
        }

        // Convert server quest templates to client format
        const clientQuests = quests.map((quest) => ({
          ...quest,
          // Preserve both IDs
          id: quest.customId, // Use customId as the primary ID for client
          customId: quest.customId, // Also preserve it as customId
          _id: quest._id, // Keep the MongoDB ID as well
          mode: quest.mode as 'story' | 'custom',
        }));

        console.log(
          '🎯 Setting server available quests - server has full authority:',
          {
            questCount: quests.length,
            questIds: clientQuests.map((q) => q.id),
            hasMore,
            complete,
          }
        );

        // Server quests completely override local quest logic
        // This includes previously completed quests for checkpoint scenarios
        set({
          serverAvailableQuests: quests,
          availableQuests: clientQuests as (
            | CustomQuestTemplate
            | StoryQuestTemplate
          )[],
          hasMoreQuests: hasMore,
          storylineComplete: complete,
        });
      },

      reset: () => {
        set({
          activeQuest: null,
          pendingQuest: null,
          availableQuests: [],
          completedQuests: [],
          failedQuest: null,
          recentCompletedQuest: null,
          lastCompletedQuestTimestamp: null,
          currentLiveActivityId: null, // Reset activity ID
          failedQuests: [],
          shouldShowStreakCelebration: false,
          // Reset server-driven quest data
          serverAvailableQuests: [],
          hasMoreQuests: false,
          storylineComplete: false,
          // Reset cooperative quest fields
          currentInvitation: null,
          cooperativeQuestRun: null,
          pendingInvitations: [],
        });
        useCharacterStore.getState().resetStreak();
        // Need a way to signal QuestTimer to stop without direct import
      },

      addReflectionToQuest: (questId: string, reflection: QuestReflection) => {
        const { completedQuests, recentCompletedQuest } = get();

        // Update the quest in completedQuests array
        const updatedCompletedQuests = completedQuests.map((quest) => {
          if (quest.id === questId && quest.status === 'completed') {
            return { ...quest, reflection };
          }
          return quest;
        });

        // Also update recentCompletedQuest if it matches
        let updatedRecentCompletedQuest = recentCompletedQuest;
        if (recentCompletedQuest && recentCompletedQuest.id === questId) {
          updatedRecentCompletedQuest = { ...recentCompletedQuest, reflection };
        }

        set({
          completedQuests: updatedCompletedQuests,
          recentCompletedQuest: updatedRecentCompletedQuest,
        });
      },
    }),
    {
      name: 'quest-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
      onRehydrateStorage: (_initialState) => {
        return (state, error) => {
          if (error) {
            console.error(
              'An error occurred during quest store hydration:',
              error
            );
          } else if (state) {
            // Check for data consistency issues that might occur after app reinstall
            const hasCompletedQuests =
              state.completedQuests && state.completedQuests.length > 0;
            const hasActiveQuest = state.activeQuest !== null;

            // If there's an active quest but no completed quests, this is likely stale data
            // from a previous install (since you must complete quest-1 before getting quest-1a)
            if (hasActiveQuest && !hasCompletedQuests) {
              console.log(
                '🧹 Detected inconsistent state - clearing stale quest data'
              );
              state.activeQuest = null;
              state.pendingQuest = null;
              state.currentLiveActivityId = null;
              state.availableQuests = [];
              return;
            }

            // Check if pending quest is a completed cooperative quest
            if (state.pendingQuest && state.completedQuests) {
              const pendingQuestId = state.pendingQuest.id;
              const isCompleted = state.completedQuests.some(
                (q) => q.id === pendingQuestId
              );

              if (isCompleted) {
                console.log(
                  '🧹 Detected completed quest still in pending state:',
                  pendingQuestId
                );
                state.pendingQuest = null;
                state.cooperativeQuestRun = null;
              }
            }

            // Check if there's a cooperative quest run that shows as completed
            if (state.cooperativeQuestRun && state.pendingQuest) {
              const cooperativeRun = state.cooperativeQuestRun;

              // If the cooperative quest run shows as completed but quest is still pending
              if (
                (cooperativeRun.status as any) === 'success' ||
                cooperativeRun.status === 'completed' ||
                (cooperativeRun.scheduledEndTime &&
                  Date.now() > cooperativeRun.scheduledEndTime)
              ) {
                console.log(
                  '🧹 Found cooperative quest that completed but was not recorded:',
                  state.pendingQuest.id
                );

                // Add it to completed quests
                const completedQuest = {
                  ...state.pendingQuest,
                  startTime:
                    cooperativeRun.actualStartTime ||
                    Date.now() - state.pendingQuest.durationMinutes * 60 * 1000,
                  stopTime: cooperativeRun.scheduledEndTime || Date.now(),
                  status: 'completed' as const,
                };

                // Make sure it's not already in completed quests
                const alreadyCompleted = state.completedQuests.some(
                  (q) => q.id === completedQuest.id
                );
                if (!alreadyCompleted) {
                  state.completedQuests.push(completedQuest);
                }

                state.pendingQuest = null;
                state.cooperativeQuestRun = null;
              }
            }

            // Check if there's an active quest that should have completed/failed
            if (state.activeQuest && state.activeQuest.startTime) {
              const now = Date.now();
              const questDuration =
                state.activeQuest.durationMinutes * 60 * 1000;
              const questEndTime = state.activeQuest.startTime + questDuration;

              // If the quest should have ended by now
              if (now > questEndTime) {
                console.log(
                  '🧹 Cleaning up stale active quest:',
                  state.activeQuest.id
                );
                // Just clear the active quest without marking as failed
                // This handles cases where the app was reinstalled or data is from a previous user
                state.activeQuest = null;
                state.currentLiveActivityId = null;

                // Also clear any pending quest that might be stale
                if (state.pendingQuest) {
                  console.log('🧹 Also clearing stale pending quest');
                  state.pendingQuest = null;
                }
              }
            }
          }
        };
      },
    }
  )
);
