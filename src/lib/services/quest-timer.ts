import 'react-native-get-random-values'; // Import for crypto.randomUUID

import { Platform } from 'react-native';
import BackgroundService from 'react-native-bg-actions';
import { OneSignal } from 'react-native-onesignal';
import { v4 as uuidv4 } from 'uuid'; // Use uuid for unique IDs

import {
  areNotificationsEnabled,
  clearAllNotifications,
  scheduleQuestCompletionNotification,
} from '@/lib/services/notifications';
import {
  createQuestRun,
  getQuestRunStatus,
  updatePhoneLockStatus,
} from '@/lib/services/quest-run-service';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import {
  type CustomQuestTemplate,
  type Quest,
  type StoryQuestTemplate,
} from '@/store/types';
import { useUserStore } from '@/store/user-store';

// --- Linter Fix for Type Errors ---
// Helper function to safely parse JSON from storage
function parseJson<T>(jsonString: string | null | undefined): T | null {
  if (jsonString && typeof jsonString === 'string') {
    try {
      return JSON.parse(jsonString) as T;
    } catch (e) {
      console.error('Failed to parse JSON from storage:', e);
      return null;
    }
  }
  return null;
}

// Helper function to safely parse Int from storage
function parseIntSafe(value: string | null | undefined): number | null {
  if (value && typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) ? parsed : null;
  }
  return null;
}
// --- End Linter Fix ---

// REVERT: No longer need custom activity type string
// const QUEST_ACTIVITY_TYPE = 'QuestActivityAttributes';

export default class QuestTimer {
  private static isPhoneLocked: boolean = false;
  private static questStartTime: number | null = null;
  private static questTemplate:
    | (CustomQuestTemplate | StoryQuestTemplate)
    | null = null;
  // Store the OneSignal activity ID (this replaces the old liveActivityId)
  private static oneSignalActivityId: string | null = null;
  // Add quest run ID to track the server-side quest run
  private static questRunId: string | null = null;

  // Helper methods to persist quest data
  private static async saveQuestData() {
    if (this.questTemplate) {
      try {
        setItem('QUEST_TIMER_TEMPLATE', JSON.stringify(this.questTemplate));

        if (this.questStartTime) {
          setItem('QUEST_TIMER_START_TIME', this.questStartTime.toString());
        }

        // Save the OneSignal Activity ID if it exists
        if (this.oneSignalActivityId) {
          setItem('ONESIGNAL_ACTIVITY_ID', this.oneSignalActivityId);
        } else {
          // Ensure old ID is removed if activity ends
          removeItem('ONESIGNAL_ACTIVITY_ID');
        }

        // Save quest run ID
        if (this.questRunId) {
          setItem('QUEST_RUN_ID', this.questRunId);
        } else {
          removeItem('QUEST_RUN_ID');
        }
      } catch (error) {
        console.error('Error saving quest data:', error);
      }
    }
  }

  // @TODO: why are we calling this in the backgroundTask method? It should only be called once, right?
  private static loadQuestData() {
    try {
      // Use the safe parsing helper
      const templateJson = getItem<string>('QUEST_TIMER_TEMPLATE');
      if (templateJson) {
        this.questTemplate = parseJson<
          CustomQuestTemplate | StoryQuestTemplate
        >(templateJson);
      }

      // Use the safe parsing helper
      const startTimeStr = getItem<string>('QUEST_TIMER_START_TIME');
      this.questStartTime = parseIntSafe(startTimeStr);

      // Load the OneSignal Activity ID
      this.oneSignalActivityId = getItem<string>('ONESIGNAL_ACTIVITY_ID');

      // Load quest run ID
      this.questRunId = getItem<string>('QUEST_RUN_ID');

      console.log('[QuestTimer] Loaded quest data:', {
        hasTemplate: !!this.questTemplate,
        templateId: this.questTemplate?.id,
        questRunId: this.questRunId,
        startTime: this.questStartTime,
        oneSignalActivityId: this.oneSignalActivityId,
      });

      // Update the store with the live activity ID if it exists
      if (this.oneSignalActivityId) {
        const store = useQuestStore.getState();
        if (typeof store.setLiveActivityId === 'function') {
          store.setLiveActivityId(this.oneSignalActivityId);
        } else {
          console.warn(
            'setLiveActivityId function not found in quest store state.'
          );
        }
      }
    } catch (error) {
      console.error('Error loading quest data:', error);
    }
  }

  private static async clearQuestData() {
    try {
      removeItem('QUEST_TIMER_TEMPLATE');
      removeItem('QUEST_TIMER_START_TIME');
      removeItem('ONESIGNAL_ACTIVITY_ID'); // Clear OneSignal ID
      removeItem('QUEST_RUN_ID'); // Clear quest run ID
    } catch (error) {
      console.error('Error clearing quest data:', error);
    }
  }

  // Single entry point - prepare the quest and wait for phone lock
  static async prepareQuest(
    questTemplate: CustomQuestTemplate | StoryQuestTemplate,
    cooperativeQuestRunId?: string
  ) {
    console.log('[QuestTimer] prepareQuest called with:', {
      title: questTemplate.title,
      id: questTemplate.id,
      _id: (questTemplate as any)._id,
      customId: (questTemplate as any).customId,
      mode: questTemplate.mode,
      category: (questTemplate as any).category,
      cooperativeQuestRunId,
    });

    const notificationsEnabled = await areNotificationsEnabled();
    if (notificationsEnabled) {
      await clearAllNotifications();
    }

    this.questTemplate = questTemplate;
    this.questStartTime = null;

    // Use the provided cooperative quest run ID if available
    if (cooperativeQuestRunId) {
      console.log(
        '[QuestTimer] Using provided cooperative quest run ID:',
        cooperativeQuestRunId
      );
      this.questRunId = cooperativeQuestRunId;
    } else if (questTemplate.category === 'cooperative') {
      // This is a cooperative quest but no quest run ID was provided
      // This should not happen - cooperative quests should always have a quest run
      // from the server before reaching this point
      console.error(
        '[QuestTimer] ERROR: Cooperative quest without quest run ID!',
        questTemplate
      );
      throw new Error(
        'Cooperative quest must have an existing quest run ID from server'
      );
    } else {
      // Create a quest run on the server (only for solo quests)
      try {
        console.log('[QuestTimer] Creating quest run for solo quest');
        console.log(
          '[QuestTimer] About to call createQuestRun with template:',
          {
            id: questTemplate.id,
            _id: (questTemplate as any)._id,
            customId: (questTemplate as any).customId,
            mode: questTemplate.mode,
            title: questTemplate.title,
          }
        );
        const questRun = await createQuestRun(questTemplate);
        console.log(
          '[QuestTimer] Quest run created successfully:',
          questRun.id
        );
        this.questRunId = questRun.id;

        // If this is a cooperative quest, store the cooperative quest run data
        if (questRun.invitationId && questRun.participants) {
          console.log('Setting cooperative quest run data:', questRun);
          const user = useUserStore.getState().user;
          const questId =
            (questRun as any).questId ||
            questRun.quest?.id ||
            questTemplate.id ||
            questRun.id ||
            `quest-${questRun.id}`;
          console.log(
            '[QuestTimer] Setting cooperative quest run with questId:',
            questId
          );

          useQuestStore.getState().setCooperativeQuestRun({
            id: questRun.id,
            questId: questId,
            hostId: user?.id || '',
            status: 'pending',
            participants: Array.isArray(questRun.participants)
              ? questRun.participants.map((p: any) =>
                  typeof p === 'string'
                    ? { userId: p, ready: false, status: 'pending' }
                    : p
                )
              : [],
            invitationId: questRun.invitationId,
            actualStartTime: questRun.actualStartTime,
            scheduledEndTime: questRun.scheduledEndTime,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to create quest run:', error);
        // Continue anyway as the quest can still work locally
      }
    }

    const pendingQuestTitle = 'Quest Ready';
    const pendingTaskDesc = 'Lock your phone to begin your quest';

    if (Platform.OS === 'ios') {
      try {
        if (!this.oneSignalActivityId) {
          this.oneSignalActivityId = uuidv4();
        }
        // Construct attributes and content with status='pending'
        const attributes = {
          title: pendingQuestTitle,
          description: pendingTaskDesc,
        };
        const pendingContent = {
          durationMinutes: questTemplate.durationMinutes,
          status: 'pending', // Using status instead of pending boolean
        };
        OneSignal.LiveActivities.startDefault(
          this.oneSignalActivityId,
          attributes,
          pendingContent
        );
        const store = useQuestStore.getState();
        if (typeof store.setLiveActivityId === 'function') {
          store.setLiveActivityId(this.oneSignalActivityId);
        }
      } catch (error) {
        console.error(
          'Error starting pending OneSignal Live Activity (Default):',
          error
        );
        this.oneSignalActivityId = null;
      }
    }

    await this.saveQuestData();

    // Android Background Service Setup (remains the same)
    const options = {
      taskName: 'QuestTimer',
      taskTitle: pendingQuestTitle,
      taskDesc: pendingTaskDesc,
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#77c5bf',
      progressBar: {
        max: 100,
        value: 0,
        indeterminate: true,
      },
      parameters: {
        questDuration: questTemplate.durationMinutes * 60 * 1000,
        questTitle: questTemplate.title,
        questDescription:
          ('recap' in questTemplate
            ? questTemplate.recap
            : questTemplate.title) || 'Focus on your quest',
        questId: questTemplate.id,
      },
    };

    try {
      await BackgroundService.start(this.backgroundTask, options);
    } catch (error) {
      console.error('Failed to start background service:', error);
    }
  }

  // Called from the lock state listener when phone is locked
  static async onPhoneLocked() {
    console.log('Phone locked');

    // Early return if we're already in the locked state
    if (this.isPhoneLocked) {
      console.log('Phone already marked as locked, ignoring duplicate call');
      return;
    }

    this.isPhoneLocked = true;
    this.loadQuestData();

    if (this.questTemplate && !this.questStartTime) {
      this.questStartTime = Date.now();
      console.log('Quest started at', new Date(this.questStartTime));

      if (Platform.OS === 'ios') {
        // Use the existing live activity ID if present.
        const activityId = this.oneSignalActivityId || uuidv4();
        // Construct updated attributes and content with status='active'
        const attributes = {
          title: this.questTemplate.title,
          description:
            'description' in this.questTemplate
              ? this.questTemplate.description
              : 'Focus on your quest',
        };
        const updatedContent = {
          durationMinutes: this.questTemplate.durationMinutes,
          status: 'active', // Using status='active' instead of pending=false
        };
        console.log(
          'Updating Live Activity for quest start with attributes:',
          JSON.stringify(attributes)
        );
        console.log('Updated content:', JSON.stringify(updatedContent));
        OneSignal.LiveActivities.startDefault(
          activityId,
          attributes,
          updatedContent
        );
        this.oneSignalActivityId = activityId;
        console.log('Live Activity updated with id:', activityId);
      }

      // Check if this is a cooperative quest
      const questStore = useQuestStore.getState();
      const cooperativeQuestRun = questStore.cooperativeQuestRun;
      const isCooperativeQuest =
        cooperativeQuestRun && cooperativeQuestRun.id === this.questRunId;

      if (this.questRunId) {
        if (isCooperativeQuest) {
          // For cooperative quests, send phone lock status instead of activating
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second

          const sendPhoneLockStatus = async (): Promise<boolean> => {
            try {
              console.log(
                `Sending phone lock status (attempt ${retryCount + 1}/${maxRetries})...`,
                {
                  questRunId: this.questRunId,
                  locked: true,
                  liveActivityId: this.oneSignalActivityId,
                  platform: Platform.OS,
                }
              );
              // Include the live activity ID for iOS
              const response = await updatePhoneLockStatus(
                this.questRunId!,
                true,
                this.oneSignalActivityId
              );
              console.log('Phone lock status sent successfully, response:', {
                id: response.id,
                status: response.status,
                participants: response.participants?.map((p: any) => ({
                  userId: typeof p === 'string' ? p : p.userId,
                  phoneLocked:
                    typeof p === 'object' ? p.phoneLocked : undefined,
                  status: typeof p === 'object' ? p.status : 'unknown',
                })),
              });
              return true;
            } catch (error: any) {
              console.error(
                `Failed to send phone lock status (attempt ${retryCount + 1}):`,
                error?.response?.data || error?.message || error
              );
              retryCount++;

              if (retryCount < maxRetries) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return sendPhoneLockStatus();
              }

              console.error(
                'Max retries reached, phone lock status update failed'
              );
              return false;
            }
          };

          await sendPhoneLockStatus();
          // Don't activate quest locally yet - wait for server to activate it

          // Single check for quest activation (no polling)
          console.log('[QuestTimer] Checking quest activation status once...');
          try {
            const questRun = await getQuestRunStatus(this.questRunId!);
            console.log(
              '[QuestTimer] Initial quest run status:',
              JSON.stringify({
                id: questRun.id,
                status: questRun.status,
                actualStartTime: questRun.actualStartTime,
                scheduledEndTime: questRun.scheduledEndTime,
              })
            );

            if (questRun.status === 'active' && questRun.actualStartTime) {
              console.log(
                '[QuestTimer] Server already activated cooperative quest, starting locally'
              );

              // Update the cooperative quest run in store
              const questStore = useQuestStore.getState();
              questStore.setCooperativeQuestRun({
                ...cooperativeQuestRun,
                status: 'active',
                actualStartTime: questRun.actualStartTime,
                scheduledEndTime: questRun.scheduledEndTime,
              });

              // Start the quest locally
              if (this.questTemplate && !questStore.activeQuest) {
                const startTime = questRun.actualStartTime || Date.now();
                const quest: Quest = {
                  ...this.questTemplate,
                  startTime,
                  status: 'active' as const,
                };
                questStore.startQuest(quest);
              }

              // Update Android notification to show quest is active
              if (Platform.OS === 'android' && BackgroundService.isRunning()) {
                try {
                  await BackgroundService.updateNotification({
                    taskTitle: `Quest in progress: ${this.questTemplate.title}`,
                    taskDesc: `Keep your phone locked for ${this.questTemplate.durationMinutes} minutes to complete the quest`,
                    progressBar: {
                      max: 100,
                      value: 0,
                      indeterminate: false,
                    },
                  });
                } catch (error) {
                  console.error(
                    '[QuestTimer] Failed to update Android notification:',
                    error
                  );
                }
              }
            } else if (questRun.status === 'failed') {
              console.log(
                '[QuestTimer] Quest already failed by another participant'
              );

              // Update local state to failed
              const questStore = useQuestStore.getState();
              questStore.setCooperativeQuestRun({
                ...cooperativeQuestRun,
                status: 'failed',
              });
              questStore.failQuest();
            } else {
              console.log(
                '[QuestTimer] Quest not yet active, waiting for other participants...'
              );
            }
          } catch (error) {
            console.error(
              '[QuestTimer] Failed to check quest activation:',
              error
            );
          }
        } else {
          // For single-player quests, also use phone lock status endpoint
          try {
            console.log('Sending phone lock status for single-player quest...');
            await updatePhoneLockStatus(
              this.questRunId!,
              true,
              this.oneSignalActivityId
            );
            console.log('Phone lock status sent successfully');
          } catch (error) {
            console.error('Failed to send phone lock status:', error);
            // Continue anyway as the quest can still work locally
          }
        }
      }

      await this.saveQuestData();

      // For single-player quests, start immediately
      if (!isCooperativeQuest) {
        setTimeout(() => {
          // Only update store if phone is still locked
          if (this.isPhoneLocked) {
            const questStore = useQuestStore.getState();
            // Check if there's already an active quest to prevent double-starting
            if (!questStore.activeQuest && this.questTemplate) {
              const startTime = this.questStartTime || Date.now();
              const quest: Quest = {
                ...this.questTemplate,
                startTime,
                status: 'active' as const,
              };
              questStore.startQuest(quest);
            }
          }
        }, 500);
      }
      // For cooperative quests, the polling mechanism above will handle activation

      // Only update Android notification if background service is running
      if (Platform.OS === 'android' && BackgroundService.isRunning()) {
        console.log('Updating Android notification...');
        try {
          await BackgroundService.updateNotification({
            taskTitle: `Quest in progress: ${this.questTemplate.title}`,
            taskDesc: `Keep your phone locked for ${this.questTemplate.durationMinutes} minutes to complete the quest`,
            progressBar: {
              max: 100,
              value: 0,
              indeterminate: false,
            },
          });
        } catch (error) {
          console.error('Failed to update Android notification:', error);
          // Continue anyway - the quest can still work
        }
      }
    } else {
      console.log('Quest already started or template missing on phone lock.');
    }
  }

  // Modified onPhoneUnlocked to fail immediately only when quest is still in progress
  static async onPhoneUnlocked() {
    console.log('Phone unlocked');
    this.isPhoneLocked = false;

    await this.loadQuestData();

    // Early return if no quest is running
    if (!this.questRunId || !this.questStartTime || !this.questTemplate) {
      console.log('No active quest found on unlock.');
      return;
    }

    // Determine if this is a cooperative quest ONCE
    const questStore = useQuestStore.getState();
    const cooperativeQuestRun = questStore.cooperativeQuestRun;
    const isCooperativeQuest =
      cooperativeQuestRun && cooperativeQuestRun.id === this.questRunId;

    // Send phone unlock status to server
    if (this.questRunId) {
      try {
        console.log(
          `Sending phone unlock status for ${isCooperativeQuest ? 'cooperative' : 'single-player'} quest...`
        );
        await updatePhoneLockStatus(this.questRunId, false);
        console.log('Phone unlock status sent successfully');
      } catch (error) {
        console.error('Failed to send phone unlock status:', error);
        // Continue with local handling even if server update fails
      }
    }

    if (this.questStartTime && this.questTemplate) {
      const elapsedTime = Date.now() - this.questStartTime;
      const questDurationMs = this.questTemplate.durationMinutes * 60 * 1000;

      // Check if quest duration has been completed
      if (elapsedTime >= questDurationMs) {
        console.log('Quest duration completed, marking quest as successful');

        // Check if quest is already completed to avoid double completion
        const activeQuest = questStore.activeQuest;
        const pendingQuest = questStore.pendingQuest;

        if (activeQuest?.id === this.questTemplate.id) {
          console.log('Completing active quest:', activeQuest.id);
          console.log('[QuestTimer] Quest completion details:', {
            questId: activeQuest.id,
            questRunId: this.questRunId,
            hasQuestRunId: !!this.questRunId,
          });

          questStore.completeQuest(true);

          // Fetch quest run data from server to get participant rewards
          // Check the completed quest for questRunId (not this.questRunId which might be stale)
          const completedQuest = questStore.recentCompletedQuest;
          const questRunId = completedQuest?.questRunId;

          console.log('[QuestTimer] After completion, checking for questRunId:', {
            hasCompletedQuest: !!completedQuest,
            questRunId,
            thisQuestRunId: this.questRunId,
          });

          if (questRunId) {
            try {
              console.log(
                '[QuestTimer] Fetching quest run data to get participant rewards:',
                questRunId
              );
              const questRunData = await getQuestRunStatus(questRunId);
              console.log(
                '[QuestTimer] Quest run data received:',
                JSON.stringify({
                  id: questRunData.id,
                  status: questRunData.status,
                  participants: questRunData.participants,
                })
              );

              // Update recentCompletedQuest with participants data from server
              if (completedQuest) {
                const updatedQuest = {
                  ...completedQuest,
                  participants: questRunData.participants as any[], // Server returns participants with rewards
                };

                console.log('[QuestTimer] Updating quest with participants:', {
                  questId: updatedQuest.id,
                  participantCount: questRunData.participants.length,
                  hasRewards: !!(questRunData.participants[0] as any)?.rewards,
                });

                useQuestStore.setState({
                  recentCompletedQuest: updatedQuest,
                  completedQuests: questStore.completedQuests.map((q) =>
                    q.id === updatedQuest.id && q.stopTime === updatedQuest.stopTime
                      ? updatedQuest
                      : q
                  ),
                });
                console.log(
                  '[QuestTimer] Updated recentCompletedQuest with participants data'
                );
              }
            } catch (error) {
              console.error(
                '[QuestTimer] Failed to fetch quest run data:',
                error
              );
              // Continue anyway - quest is still complete, just without adjusted XP display
            }
          }
        } else if (pendingQuest?.id === this.questTemplate.id) {
          console.log(
            'Completing quest that was stuck in pending state:',
            pendingQuest.id
          );

          // Manually transition to completed
          const completedQuest = {
            ...pendingQuest,
            id: pendingQuest.id || this.questTemplate.id || 'unknown',
            startTime:
              this.questStartTime ||
              Date.now() - pendingQuest.durationMinutes * 60 * 1000,
            stopTime: Date.now(),
            status: 'completed' as const,
            questRunId: this.questRunId || undefined,
          };

          // Update the store state
          questStore.reset();
          useQuestStore.setState({
            activeQuest: null,
            pendingQuest: null,
            recentCompletedQuest: completedQuest,
            lastCompletedQuestTimestamp: Date.now(),
            completedQuests: [...questStore.completedQuests, completedQuest],
            currentLiveActivityId: null,
            cooperativeQuestRun: null,
            availableQuests: [],
            failedQuest: null,
            failedQuests: questStore.failedQuests,
            currentInvitation: null,
            pendingInvitations: [],
          });

          // Update character XP and streak
          const characterStore = useCharacterStore.getState();
          characterStore.addXP(completedQuest.reward.xp);
          characterStore.updateStreak(questStore.lastCompletedQuestTimestamp);

          // Fetch quest run data from server to get participant rewards
          const questRunIdFromQuest = completedQuest.questRunId;
          console.log('[QuestTimer] Pending quest - checking for questRunId:', {
            questRunId: questRunIdFromQuest,
            thisQuestRunId: this.questRunId,
          });

          if (questRunIdFromQuest) {
            try {
              console.log(
                '[QuestTimer] Fetching quest run data for pending quest completion:',
                questRunIdFromQuest
              );
              const questRunData = await getQuestRunStatus(questRunIdFromQuest);

              // Update the completed quest with participants data
              const updatedQuest = {
                ...completedQuest,
                participants: questRunData.participants as any[],
              };

              console.log('[QuestTimer] Updating pending quest with participants:', {
                questId: updatedQuest.id,
                participantCount: questRunData.participants.length,
                hasRewards: !!(questRunData.participants[0] as any)?.rewards,
              });

              useQuestStore.setState((state) => ({
                recentCompletedQuest: updatedQuest,
                completedQuests: state.completedQuests.map((q) =>
                  q.id === updatedQuest.id && q.stopTime === updatedQuest.stopTime
                    ? updatedQuest
                    : q
                ),
              }));
              console.log(
                '[QuestTimer] Updated pending quest completion with participants data'
              );
            } catch (error) {
              console.error(
                '[QuestTimer] Failed to fetch quest run data for pending quest:',
                error
              );
            }
          }
        }

        // Update OneSignal Live Activity with completed status
        if (Platform.OS === 'ios' && this.oneSignalActivityId) {
          try {
            console.log(
              `Updating OneSignal Live Activity ${this.oneSignalActivityId} with completed status`
            );
            const completedAttributes = {
              title: 'Quest Complete',
              description: 'Congratulations on finishing your quest!',
            };
            const completedContent = {
              durationMinutes: this.questTemplate.durationMinutes,
              status: 'completed',
            };
            OneSignal.LiveActivities.startDefault(
              this.oneSignalActivityId,
              completedAttributes,
              completedContent
            );
          } catch (error) {
            console.error('Failed to update OneSignal Live Activity:', error);
          }
        }

        // Clear quest data and stop background service
        await this.stopQuest();
        return;
      } else if (elapsedTime < questDurationMs) {
        console.log('Quest interrupted due to phone unlock during progress.');

        if (!isCooperativeQuest) {
          // For single-player quests, handle failure locally
          console.log('Failing single-player quest due to phone unlock');

          // Use status='failed' when ending OneSignal Live Activity
          if (Platform.OS === 'ios' && this.oneSignalActivityId) {
            try {
              console.log(
                `Updating OneSignal Live Activity ${this.oneSignalActivityId} with failed status`
              );
              const failedAttributes = {
                title: 'Quest Failed',
                description: 'Try again next time',
              };
              const failedContent = {
                durationMinutes: this.questTemplate.durationMinutes,
                status: 'failed', // Set status to failed instead of ending activity
              };
              OneSignal.LiveActivities.startDefault(
                this.oneSignalActivityId,
                failedAttributes,
                failedContent
              );
              this.oneSignalActivityId = null;
            } catch (error) {
              console.error(
                'Error ending OneSignal Live Activity (Failure):',
                error
              );
            }
          }

          // Update Android notification to show quest failed
          if (Platform.OS === 'android' && BackgroundService.isRunning()) {
            try {
              await BackgroundService.updateNotification({
                taskTitle: 'Quest Failed',
                taskDesc: 'You unlocked your phone. Try again next time!',
                progressBar: {
                  max: 100,
                  value: 0,
                  indeterminate: false,
                },
              });
            } catch (error) {
              console.error(
                '[QuestTimer] Failed to update Android notification:',
                error
              );
            }
          }

          // For single-player quests, we already sent the unlock status above

          const questStoreState = useQuestStore.getState();
          questStoreState.failQuest();
          await this.stopQuest(); // stopQuest also calls clearQuestData
        } else {
          // For cooperative quests, the server will handle the failure
          console.log(
            'Cooperative quest failure - server will handle failure, updating local state'
          );

          // Update local state and clean up
          const questStoreState = useQuestStore.getState();
          questStoreState.failQuest();
          await this.stopQuest();
        }
      } else {
        // Quest completed successfully before unlock or exactly at unlock
        // Note: Server will automatically mark the quest as successful, so no need to call updateQuestRunStatus here
        console.log(
          'Phone unlocked, but quest duration met or exceeded. Quest considered complete.'
        );

        // Ensure completion state is set if somehow missed by background task
        const questStoreState = useQuestStore.getState();
        if (questStoreState.activeQuest) {
          questStoreState.completeQuest(true); // Force completion if needed
        }
      }
    } else {
      console.log('No active quest found on unlock.');
    }
  }

  // Background task now also updates OneSignal Live Activity progress
  private static backgroundTask = async (taskData?: {
    questDuration: number;
    questTitle: string;
    questId: string;
    questDescription: string;
  }) => {
    console.log('Background task started', taskData);
    if (!taskData) return;

    // Load quest data initially - only once
    await this.loadQuestData();

    console.log('[Background Task] Quest data loaded:', {
      hasQuestTemplate: !!this.questTemplate,
      questTemplateId: this.questTemplate?.id,
      questRunId: this.questRunId,
      isPhoneLocked: this.isPhoneLocked,
      questStartTime: this.questStartTime,
    });

    // Use questId from taskData for Live Activity ID consistency
    const currentActivityId = this.oneSignalActivityId;
    const { questDuration } = taskData;

    // For cooperative quests, check if we need to wait for server activation
    if (this.isPhoneLocked && !this.questStartTime && this.questRunId) {
      const questStore = useQuestStore.getState();
      const cooperativeQuestRun = questStore.cooperativeQuestRun;
      const isCooperativeQuest =
        cooperativeQuestRun && cooperativeQuestRun.id === this.questRunId;

      console.log('[Background Task] Checking quest type:', {
        questRunId: this.questRunId,
        cooperativeQuestRunId: cooperativeQuestRun?.id,
        isCooperativeQuest,
        cooperativeQuestRun: cooperativeQuestRun
          ? {
              id: cooperativeQuestRun.id,
              status: cooperativeQuestRun.status,
              participants: cooperativeQuestRun.participants?.length,
            }
          : null,
      });

      if (isCooperativeQuest) {
        console.log(
          '[Background Task] Cooperative quest - waiting for activation (no polling)'
        );

        // Single check for quest status
        try {
          const questRun = await getQuestRunStatus(this.questRunId!);
          console.log(
            '[Background Task] Initial quest run status:',
            JSON.stringify({
              id: questRun.id,
              status: questRun.status,
              actualStartTime: questRun.actualStartTime,
            })
          );

          if (questRun.status === 'active' && questRun.actualStartTime) {
            console.log(
              '[Background Task] Cooperative quest already activated by server'
            );

            // Update the store
            questStore.setCooperativeQuestRun({
              ...cooperativeQuestRun,
              status: 'active',
              actualStartTime: questRun.actualStartTime,
              scheduledEndTime: questRun.scheduledEndTime,
            });

            // Start the quest
            this.questStartTime = questRun.actualStartTime;
            if (this.questTemplate && !questStore.activeQuest) {
              const quest: Quest = {
                ...this.questTemplate,
                startTime: this.questStartTime,
                status: 'active' as const,
              };
              questStore.startQuest(quest);
            }

            // Update Android notification to show quest is active
            if (Platform.OS === 'android' && BackgroundService.isRunning()) {
              try {
                await BackgroundService.updateNotification({
                  taskTitle: `Quest Active: ${taskData.questTitle}`,
                  taskDesc: `Keep locked for ${questDuration / (60 * 1000)} minutes`,
                  progressBar: {
                    max: 100,
                    value: 0,
                    indeterminate: false,
                  },
                });
              } catch (error) {
                console.error(
                  '[Background Task] Failed to update Android notification:',
                  error
                );
              }
            }
          } else if (questRun.status === 'failed') {
            console.log(
              '[Background Task] Quest already failed by another participant'
            );

            // Update local state to failed
            questStore.setCooperativeQuestRun({
              ...cooperativeQuestRun,
              status: 'failed',
            });
            questStore.failQuest();

            // Stop the background service
            await this.stopQuest();
            return; // Exit background task
          } else {
            console.log(
              '[Background Task] Quest not yet active, continuing to wait...'
            );
          }
        } catch (error) {
          console.error(
            '[Background Task] Failed to check quest activation:',
            error
          );
        }
      }
    }

    while (BackgroundService.isRunning()) {
      if (this.isPhoneLocked && this.questStartTime && this.questTemplate) {
        const elapsedTime = Date.now() - this.questStartTime;
        const progress = Math.min(
          Math.round((elapsedTime / questDuration) * 100),
          100
        );

        // Update Android notification
        await BackgroundService.updateNotification({
          progressBar: {
            max: 100,
            value: progress,
            indeterminate: false,
          },
        });

        // Check if quest is complete
        if (elapsedTime >= questDuration) {
          console.log(
            'Quest completed in background task:',
            this.questTemplate?.id || 'unknown'
          );

          // Update OneSignal Live Activity with status='completed'
          if (Platform.OS === 'ios' && currentActivityId) {
            const completionAttributes = {
              title: 'Quest Complete',
              description: 'Congratulations on finishing your quest!',
            };
            const completionContent = {
              durationMinutes: this.questTemplate.durationMinutes,
              status: 'completed', // Use status instead of boolean flags
            };
            console.log(
              `Updating Live Activity ${currentActivityId} with completed status`
            );
            OneSignal.LiveActivities.startDefault(
              currentActivityId,
              completionAttributes,
              completionContent
            );
          }
          // --- End Live Activity Update ---

          const questStoreState = useQuestStore.getState();
          const questId = this.questTemplate?.id;

          console.log('[Background Task] Completing quest:', {
            questTemplateId: questId,
            activeQuestId: questStoreState.activeQuest?.id,
            pendingQuestId: questStoreState.pendingQuest?.id,
          });

          if (questStoreState.activeQuest?.id === questId) {
            questStoreState.completeQuest(true); // Mark quest as complete in the store
          } else if (questStoreState.pendingQuest?.id === questId) {
            // For cooperative quests that might not have transitioned to active
            console.log(
              'Completing cooperative quest that was stuck in pending state'
            );
            const pendingQuest = questStoreState.pendingQuest;
            const cooperativeQuestRun = questStoreState.cooperativeQuestRun;

            // Manually transition to completed
            const completedQuest = {
              ...pendingQuest,
              id: pendingQuest.id || questId || 'unknown', // Ensure ID is never undefined
              startTime:
                cooperativeQuestRun?.actualStartTime ||
                this.questStartTime ||
                Date.now() - pendingQuest.durationMinutes * 60 * 1000,
              stopTime: Date.now(),
              status: 'completed' as const,
            };

            // Manually update the store state
            const completedQuests = [
              ...questStoreState.completedQuests,
              completedQuest,
            ];
            // Clear the pending quest and set as completed
            questStoreState.reset();
            useQuestStore.setState({
              activeQuest: null,
              pendingQuest: null,
              recentCompletedQuest: completedQuest,
              lastCompletedQuestTimestamp: Date.now(),
              completedQuests: completedQuests,
              currentLiveActivityId: null,
              cooperativeQuestRun: null,
              availableQuests: [],
              failedQuest: null,
              failedQuests: questStoreState.failedQuests,
              currentInvitation: null,
              pendingInvitations: [],
            });

            // Update character XP and streak
            const characterStore = useCharacterStore.getState();
            characterStore.addXP(completedQuest.reward.xp);
            characterStore.updateStreak(
              questStoreState.lastCompletedQuestTimestamp
            );

            // Invalidate queries to fetch fresh data
            const { queryClient } = require('@/api/common');
            queryClient.invalidateQueries({
              queryKey: ['user', 'details'] as const,
            });
            queryClient.invalidateQueries({
              queryKey: ['next-available-quests'] as const,
            });
          }
          // for now only schedule for Android
          if (Platform.OS === 'android') {
            const completedQuestId = this.questTemplate?.id || questId;
            await scheduleQuestCompletionNotification(completedQuestId); // Schedule completion notification with quest ID
          }
          await this.stopQuest(); // Stop background service and clear data
          break; // Exit loop
        }
      } else if (!this.isPhoneLocked && this.questStartTime) {
        // Phone was unlocked while quest was running - failQuest handled by onPhoneUnlocked
        // We might need to stop the background task here if onPhoneUnlocked doesn't trigger stopQuest reliably
        console.log('Background task detected unlock, stopping.');
        await this.stopQuest(); // Consider adding this if needed
        break; // Exit loop
      }

      // Adjust update interval based on duration to save battery
      const updateInterval = Math.min(
        Math.max(questDuration / 100, 1000),
        15000
      ); // Update at least every second, max 15s
      await new Promise((resolve) => setTimeout(resolve, updateInterval));
    }
    console.log('Background task finished for quest:', taskData.questId);
  };

  static async stopQuest() {
    console.log('Stopping quest timer and background service.');
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }

    // Explicitly nullify all class properties before clearing storage
    this.oneSignalActivityId = null;
    this.questTemplate = null;
    this.questStartTime = null;
    this.questRunId = null;

    // Clear quest data from storage
    await this.clearQuestData();
  }

  static isRunning(): boolean {
    return BackgroundService.isRunning();
  }

  static getQuestRunId(): string | null {
    return this.questRunId;
  }
}
