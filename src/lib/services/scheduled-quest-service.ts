import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getProvisionalAccessToken } from '@/api/token';
import { type ScheduledQuestRun } from '@/features/scheduled-quests/types';

export interface CreateScheduledQuestInput {
  title: string;
  category: string;
  durationMinutes: number;
  scheduledStartAt: string; // ISO, UTC
  visibility: 'public' | 'friends';
  maxParticipants: number;
}

export interface DiscoverParams {
  category?: string;
  page?: number;
  limit?: number;
}

// Same client-selection idiom as quest-run-service.ts: presence of a
// provisional token decides which axios instance carries the call.
const clientFor = () =>
  getProvisionalAccessToken() ? provisionalApiClient : apiClient;

export async function createScheduledQuest(
  input: CreateScheduledQuestInput
): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().post('/quest-runs/scheduled', input);
  return data;
}

export async function discoverScheduledQuests(
  params?: DiscoverParams
): Promise<{ results: ScheduledQuestRun[] }> {
  const { data } = await clientFor().get('/quest-runs/discover', { params });
  return data;
}

export async function getMyScheduledQuests(): Promise<{
  results: ScheduledQuestRun[];
}> {
  const { data } = await clientFor().get('/quest-runs/scheduled/mine');
  return data;
}

export async function getScheduledQuest(
  questRunId: string
): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().get(`/quest-runs/scheduled/${questRunId}`);
  return data;
}

export async function joinScheduledQuest(
  questRunId: string
): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().post(`/quest-runs/${questRunId}/join`);
  return data;
}

export async function leaveScheduledQuest(questRunId: string): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}/join`);
}

export async function cancelScheduledQuest(questRunId: string): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}`);
}

export async function kickParticipant(
  questRunId: string,
  userId: string
): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}/participants/${userId}`);
}

/** Server messages are user-presentable (400/403/409 map in the controller). */
export function scheduledQuestErrorMessage(error: unknown): string {
  const axiosErr = error as { response?: { data?: { message?: string } } };
  return (
    axiosErr?.response?.data?.message ?? 'Something went wrong - try again'
  );
}
