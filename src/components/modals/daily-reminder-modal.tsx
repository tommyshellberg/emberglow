import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePostHog } from 'posthog-react-native';
import React, { useRef, useState } from 'react';

import { Button, Text, View } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { scheduleDailyReminderNotification } from '@/lib/services/notifications';
import { useSettingsStore } from '@/store/settings-store';

type Props = {
  defaultTime: Date;
  onClose: () => void;
};

export function DailyReminderModal({ defaultTime, onClose }: Props) {
  const [reminderTime, setReminderTime] = useState<Date>(defaultTime);
  const [wantsReminder, setWantsReminder] = useState<boolean | null>(null);
  const modalRef = useRef<BottomSheetModal>(null);

  const posthog = usePostHog();
  const setDailyReminder = useSettingsStore((state) => state.setDailyReminder);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  const handleScheduleNotification = async (time: Date) => {
    const success = await scheduleDailyReminderNotification(
      time.getHours(),
      time.getMinutes()
    );

    setDailyReminder({
      enabled: success,
      time: {
        hour: time.getHours(),
        minute: time.getMinutes(),
      },
    });

    posthog.capture('set_daily_reminder');

    return success;
  };

  const handleSubmit = async () => {
    if (wantsReminder) {
      await handleScheduleNotification(reminderTime);
    } else {
      setDailyReminder({ enabled: false, time: null });
      posthog.capture('declined_daily_reminder');
    }
    modalRef.current?.dismiss();
    onClose();
  };

  // Present modal when mounted
  React.useEffect(() => {
    modalRef.current?.present();
  }, []);

  return (
    <Modal
      ref={modalRef}
      snapPoints={['70%']}
      title="Daily Reminder"
      detached={true}
      onDismiss={onClose}
    >
      <View className="px-4 pb-6">
        <Text className="mb-6 text-center">
          Want a daily nudge to start your next quest?
        </Text>

        <View className="mb-6 space-y-4">
          <Button
            label="Yes, remind me"
            variant={wantsReminder ? 'default' : 'outline'}
            onPress={() => setWantsReminder(true)}
          />

          {wantsReminder && (
            <View className="my-4 items-center">
              <Text className="mb-2 text-neutral-500">at</Text>
              <View className="w-full rounded-xl bg-neutral-200 p-2">
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display="compact"
                  onChange={handleTimeChange}
                  textColor="#333333"
                  themeVariant="light"
                  minuteInterval={15}
                />
              </View>
            </View>
          )}

          <Button
            label="No thanks"
            variant={wantsReminder === false ? 'default' : 'outline'}
            onPress={() => setWantsReminder(false)}
          />
        </View>

        <Button
          label="Confirm"
          onPress={handleSubmit}
          disabled={wantsReminder === null}
        />
      </View>
    </Modal>
  );
}
