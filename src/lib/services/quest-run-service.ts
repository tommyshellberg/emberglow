import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getItem } from '@/lib/storage';
import { type CustomQuestTemplate } from '@/store/types';
import { type StoryQuestTemplate } from '@/store/types';
// Adjust import path as needed

export type QuestRunStatus = 'pending' | 'active' | 'failed' | 'success';

export interface QuestRunResponse {
  id: string;
  status: QuestRunStatus;
  participants: string[] | QuestParticipant[];
  quest: {
    title: string;
    durationMinutes: number;
    mode: string;
    category: string;
    reward: {
      xp: number;
    };
    options: any[];
  };
  invitationId?: string;
  actualStartTime?: number;
  scheduledEndTime?: number;
}

interface QuestParticipantRewards {
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

interface QuestParticipant {
  userId: string;
  ready: boolean;
  status: string;
  userName?: string;
  characterType?: string;
  phoneLocked?: boolean;
  characterName?: string;
  rewards?: QuestParticipantRewards;
}

const generateQuestRunBodyCustom = (questTemplate: CustomQuestTemplate) => {
  // @TODO: For now, leave out the questTemplateId as the server doesn't have the template documents added yet.
  // Remove both id and inviteeIds from the quest object
  const { id: _id, inviteeIds, ...rest } = questTemplate;

  // Ensure mode is set
  if (!rest.mode) {
    rest.mode = 'custom';
  }

  // Build the request body
  const body: any = {
    quest: rest,
  };

  // Add inviteeIds if this is a cooperative quest
  if (inviteeIds && inviteeIds.length > 0) {
    body.inviteeIds = inviteeIds;
    console.log('Creating cooperative quest with inviteeIds:', inviteeIds);
  }

  console.log('Quest run request body:', body);
  return body;
};

const generateQuestRunBodyStory = (questTemplate: StoryQuestTemplate) => {
  // Check if this is a server quest template with _id
  const questTemplateId = (questTemplate as any)._id;

  if (questTemplateId) {
    // Server quest template - use questTemplateId
    console.log(
      '[generateQuestRunBodyStory] Using server questTemplateId:',
      questTemplateId
    );
    return { questTemplateId };
  } else {
    // Local quest template - send full quest object
    console.log(
      '[generateQuestRunBodyStory] Using local quest template, sending full quest object'
    );
    const { id: _id, inviteeIds, ...rest } = questTemplate;

    // Ensure mode is set
    if (!rest.mode) {
      rest.mode = 'story';
    }

    return {
      quest: rest,
    };
  }
};

export async function createQuestRun(
  questTemplate: CustomQuestTemplate | StoryQuestTemplate
): Promise<QuestRunResponse> {
  console.log('[createQuestRun] Called with template:', {
    id: questTemplate.id,
    _id: (questTemplate as any)._id,
    customId: (questTemplate as any).customId,
    mode: questTemplate.mode,
    title: questTemplate.title,
  });

  // Determine mode - if undefined, check for story-specific fields
  const mode =
    questTemplate.mode ||
    ((questTemplate as any).poiSlug || (questTemplate as any).story
      ? 'story'
      : 'custom');

  const body =
    mode === 'story'
      ? generateQuestRunBodyStory(questTemplate)
      : generateQuestRunBodyCustom(questTemplate);

  console.log(
    '[createQuestRun] Generated body for API call:',
    JSON.stringify(body, null, 2)
  );

  try {
    // Check if we're using a provisional user
    const hasProvisionalToken = !!getItem('provisionalAccessToken');
    console.log(
      '[createQuestRun] Using provisional token:',
      hasProvisionalToken
    );

    // Use the appropriate client
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    console.log('[createQuestRun] Making POST request to /quest-runs/');
    const response = await client.post<QuestRunResponse>('/quest-runs/', body);
    console.log('[createQuestRun] Response received:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('[createQuestRun] Failed to create quest run:', error);
    console.error('[createQuestRun] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      response: (error as any).response?.data,
      status: (error as any).response?.status,
    });
    throw error;
  }
}

export async function updateQuestRunStatus(
  runId: string,
  status: QuestRunStatus,
  liveActivityId?: string | null,
  ready?: boolean
): Promise<QuestRunResponse> {
  try {
    console.log(
      'Updating quest run status:',
      runId,
      status,
      liveActivityId,
      ready
    );
    const payload: {
      status: QuestRunStatus;
      liveActivityId?: string;
      ready?: boolean;
    } = {
      status,
    };

    if (liveActivityId) {
      payload.liveActivityId = liveActivityId;
    }

    if (ready !== undefined) {
      payload.ready = ready;
    }

    // Check if we're using a provisional user
    const hasProvisionalToken = !!getItem('provisionalAccessToken');

    // Use the appropriate client
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    const response = await client.patch<QuestRunResponse>(
      `/quest-runs/${runId}/status`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update quest run ${runId} to ${status}:`, error);
    throw error;
  }
}

export async function getQuestRunStatus(
  runId: string
): Promise<QuestRunResponse> {
  try {
    const hasProvisionalToken = !!getItem('provisionalAccessToken');
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    const response = await client.get<QuestRunResponse>(`/quest-runs/${runId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to get quest run ${runId} status:`, error);
    throw error;
  }
}

export async function updatePhoneLockStatus(
  runId: string,
  locked: boolean,
  liveActivityID?: string | null
): Promise<QuestRunResponse> {
  // Validate runId before making request
  if (!runId || runId === 'null' || runId === 'undefined') {
    throw new Error('Invalid quest run ID for phone lock status update');
  }

  try {
    console.log(
      'Updating phone lock status:',
      runId,
      'locked:',
      locked,
      'liveActivityID:',
      liveActivityID
    );

    const payload: { locked: boolean; liveActivityID?: string } = { locked };

    // Include liveActivityID if provided (iOS only)
    if (liveActivityID) {
      payload.liveActivityID = liveActivityID;
    }

    // Check if we're using a provisional user
    const hasProvisionalToken = !!getItem('provisionalAccessToken');

    // Use the appropriate client
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    const response = await client.patch<QuestRunResponse>(
      `/quest-runs/${runId}/phone-lock-status`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error(
      `Failed to update phone lock status for quest run ${runId}:`,
      error
    );
    throw error;
  }
}
