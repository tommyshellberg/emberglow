import type { MapId, MapName } from '@/app/data/maps';
import { MAP_NAMES, QUEST_MAP_MAPPING } from '@/app/data/maps';
import { PRE_RENDERED_MAPS } from '@/app/data/maps';

export function getMapForQuest(questId: string): MapId {
  for (const [mapId, quests] of Object.entries(QUEST_MAP_MAPPING)) {
    if (quests.some((quest) => quest.id === questId)) {
      return mapId as MapId;
    }
  }
  // Default to 'map-1' if no matching map found
  return 'map-1';
}

export function getMapNameForQuest(questId: string): MapName {
  const mapId = getMapForQuest(questId);
  return MAP_NAMES[mapId];
}

export function getPreRenderedMapForQuest(questId: string | undefined): number {
  if (!questId) return PRE_RENDERED_MAPS['01']; // Default to first map

  // Extract quest number, ignoring side-quest letters (a, b, etc.)
  const questNumberMatch = questId.match(/quest-(\d+)[a-z]?/);

  if (!questNumberMatch) return PRE_RENDERED_MAPS['01']; // Default if no match

  // Get the quest number and convert to a number
  const questNumStr = questNumberMatch[1];
  const questNum = parseInt(questNumStr, 10);
  const mapNum = Math.max(1, questNum);
  // Convert back to padded string format
  const mapKey = mapNum.toString().padStart(2, '0');
  // Return the corresponding pre-rendered map or default to first one
  return PRE_RENDERED_MAPS[mapKey] || PRE_RENDERED_MAPS['01'];
}
