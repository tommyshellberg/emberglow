import React from 'react';

import { Text } from '@/components/ui';

import { type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
  settlement?: unknown;
}

/** Stub pending Task 18, which adds the real results breakdown + tests. */
export function ResultsView(_props: Props) {
  return <Text>Results</Text>;
}
