// Mirrors the server's lead-window checks in scheduled-quest.controller.js
// (including the dev relaxation of the floor to 10s).
const MIN_LEAD_MS = __DEV__ ? 10 * 1000 : 15 * 60 * 1000;
const MAX_LEAD_MS = 14 * 24 * 60 * 60 * 1000;

export function validateEventForm(input: {
  title: string;
  startsAtMs: number;
  nowMs?: number;
}): string | null {
  const now = input.nowMs ?? Date.now();
  if (!input.title.trim()) return 'Give your event a title';
  const lead = input.startsAtMs - now;
  if (lead < MIN_LEAD_MS)
    return 'Events must start at least 15 minutes from now';
  if (lead > MAX_LEAD_MS) return 'Events must start within 14 days';
  return null;
}
