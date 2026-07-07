import React from 'react';

import { Text } from '@/components/ui';

import { type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
}

/** Stub pending Task 18, which adds the real cancelled/failed messaging + tests. */
export function CancelledView(_props: Props) {
  return <Text>Cancelled</Text>;
}
