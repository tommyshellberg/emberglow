import React from 'react';

import { Text, View } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';

interface PresenceInfoStripProps {
  mode: 'story' | 'custom' | undefined;
  questTitle: string | undefined;
  forecast: { current: number; maxIfLocked: number };
}

// NOTE(presence-perks): the mockup shows room for active-perk chips, but
// useQuestPresence() has no perk-multiplier source for an in-progress run
// (see the hook's DEFAULT_MULTIPLIER comment — participants[].rewards is
// only populated after completeQuest()). Perk chips are intentionally
// omitted here rather than invented; wire them up once an active-quest perk
// source exists.

/**
 * Quest chip + title + the live XP forecast ("62 XP · up to 93 if locked").
 * Each matched phrase lives in its own single `Text` node so it stays
 * findable by regex even though the two forecast pieces sit side by side.
 */
export function PresenceInfoStrip({
  mode,
  questTitle,
  forecast,
}: PresenceInfoStripProps) {
  return (
    <View>
      <View
        style={{
          alignSelf: 'flex-start',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'rgba(255,140,60,0.35)',
          backgroundColor: 'rgba(255,140,60,0.15)',
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: '500',
            letterSpacing: 1,
            color: '#ff9d5c',
            textTransform: 'uppercase',
          }}
        >
          {getQuestModeLabel(mode)}
        </Text>
      </View>

      {questTitle ? (
        <Text
          style={{
            marginTop: 8,
            fontSize: 17,
            fontWeight: '700',
            color: '#f4ede1',
          }}
        >
          {questTitle}
        </Text>
      ) : null}

      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffca7a' }}>
          {forecast.current} XP
        </Text>
        <Text style={{ marginLeft: 6, fontSize: 12, color: '#9c8fa8' }}>
          up to {forecast.maxIfLocked} if locked
        </Text>
      </View>
    </View>
  );
}
