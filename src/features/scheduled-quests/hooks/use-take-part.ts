import { type ScheduledQuestRun } from '../types';

interface UseTakePartResult {
  takePart: () => void;
  isArming: boolean;
}

/**
 * Stub pending Task 17 (T-0 handoff). Task 17 replaces this with the real
 * cooperative-quest arming flow; for now it's a no-op so the event screen
 * (Task 16) compiles and can render the "Take part" button shell.
 */
export function useTakePart(
  _run: ScheduledQuestRun | undefined
): UseTakePartResult {
  return {
    takePart: () => {},
    isArming: false,
  };
}
