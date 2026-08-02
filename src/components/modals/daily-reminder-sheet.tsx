import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';

import { BottomSheet } from '@/components/emberglow';
import { ReminderOptIn } from '@/components/reminder/reminder-opt-in';
import { useReminderOptIn } from '@/components/reminder/use-reminder-opt-in';
import { useAnnouncementStore } from '@/store/announcement-store';

/**
 * Home-screen surface for the daily-reminder opt-in (existing users' first
 * touch, and the single re-ask for new users who declined at the first-quest
 * celebration). Seen is stamped on PRESENT, not dismiss — this sheet shows at
 * most once, ever (announcement-store rule).
 */
export const DailyReminderSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const posthog = usePostHog();
  const setHasSeenDailyReminderPrompt = useAnnouncementStore(
    (state) => state.setHasSeenDailyReminderPrompt
  );
  const { initialTime, accept, decline } = useReminderOptIn('sheet');

  const handleModalChange = (index: number) => {
    if (index >= 0) {
      posthog.capture('daily_reminder_prompt_viewed', { surface: 'sheet' });
      setHasSeenDailyReminderPrompt(true);
    }
  };

  return (
    <BottomSheet ref={ref} title="Daily Reminder" onChange={handleModalChange}>
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={async (time) => {
          await accept(time);
          // @ts-ignore - ref might be null but we check before calling
          ref?.current?.dismiss();
        }}
        onDecline={() => {
          decline();
          // @ts-ignore - ref might be null but we check before calling
          ref?.current?.dismiss();
        }}
      />
    </BottomSheet>
  );
});
