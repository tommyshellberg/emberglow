import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';

import { ReminderOptIn } from './reminder-opt-in';
import { useReminderOptIn } from './use-reminder-opt-in';

/**
 * Full-screen presentation of the reminder opt-in — phase 2 of the
 * first-quest celebration. Calls onDone after accept OR decline; the caller
 * owns releasing the screen (clearing recentCompletedQuest + step advance).
 */
export function ReminderOptInScreen({ onDone }: { onDone: () => void }) {
  const { initialTime, accept, decline } = useReminderOptIn('onboarding');

  return (
    <View style={styles.container}>
      <FocusAwareStatusBar />
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={async (time) => {
          await accept(time);
          onDone();
        }}
        onDecline={() => {
          decline();
          onDone();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
