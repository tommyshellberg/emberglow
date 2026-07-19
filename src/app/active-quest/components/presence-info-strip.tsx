import React from 'react';

import { colors, Text, View } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';

// Ember-tinted chip built from the `brown` token (247,164,75). Translucency
// needs rgba, so the fill/stroke are that token at low alpha rather than a
// second hardcoded hue.
const CHIP_BORDER = 'rgba(247,164,75,0.4)';
const CHIP_FILL = 'rgba(247,164,75,0.14)';

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
          borderRadius: 999,
          borderWidth: 1,
          borderColor: CHIP_BORDER,
          backgroundColor: CHIP_FILL,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        {/* Uppercased via CSS (not `.toUpperCase()`) so the underlying text
            node stays "Story Quest" for the mode-label assertions. */}
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: colors.brown,
            textTransform: 'uppercase',
          }}
        >
          {getQuestModeLabel(mode)}
        </Text>
      </View>

      {questTitle ? (
        // The brand's Erstoria serif — the display face this screen never used
        // before — gives the story title the weight of a chapter heading.
        // `text-3xl` carries a matching lineHeight so the serif never clips.
        <Text
          className="font-erstoria text-3xl"
          style={{ marginTop: 12, color: colors.cream[300] }}
        >
          {questTitle}
        </Text>
      ) : null}

      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brown }}>
          {forecast.current} XP
        </Text>
        <Text
          style={{ marginLeft: 6, fontSize: 13, color: colors.neutral[200] }}
        >
          up to {forecast.maxIfLocked} if locked
        </Text>
      </View>
    </View>
  );
}
