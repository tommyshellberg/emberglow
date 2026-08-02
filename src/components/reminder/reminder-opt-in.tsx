import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { type ReminderTimeValue } from '@/lib/reminder-time';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

type ReminderOptInProps = {
  initialTime: ReminderTimeValue;
  onAccept: (time: ReminderTimeValue) => void;
  onDecline: () => void;
};

/**
 * Shared daily-reminder opt-in content (mockup:
 * docs/superpowers/specs/assets/2026-08-01-daily-reminder-mockup.png).
 * Presentation only — permission/store/analytics side effects live in
 * useReminderOptIn so both surfaces (onboarding phase 2, home sheet) share
 * one behavior.
 */
export function ReminderOptIn({
  initialTime,
  onAccept,
  onDecline,
}: ReminderOptInProps) {
  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(initialTime.hour, initialTime.minute, 0, 0);
    return d;
  });

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    if (selected) setTime(selected);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <Bell size={28} color={colors.accent.primary} />
      </View>

      <Text style={styles.headline}>When will you quest each day?</Text>
      <Text style={styles.subcopy}>
        A quiet nudge at the same time each day keeps the streak alive.
      </Text>

      <DateTimePicker
        testID="reminder-time-picker"
        value={time}
        mode="time"
        display="spinner"
        onChange={handleTimeChange}
        minuteInterval={15}
        themeVariant="dark"
        {...(Platform.OS === 'ios' ? { style: styles.picker } : {})}
      />

      <View style={styles.actions}>
        <Button
          label="Set daily reminder"
          onPress={() =>
            onAccept({ hour: time.getHours(), minute: time.getMinutes() })
          }
          fullWidth
          glow
        />
        <Pressable
          onPress={onDecline}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
          style={styles.skip}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    // Ember-glow halo around the bell, per the mockup — reserved for this
    // single accented element rather than applied broadly.
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: shadows.glowEmber.shadowColor,
          shadowOffset: shadows.glowEmber.shadowOffset,
          shadowRadius: shadows.glowEmber.shadowRadius,
          shadowOpacity: shadows.glowEmber.shadowOpacity,
        }
      : null),
  },
  headline: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  subcopy: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  picker: {
    height: 180,
    alignSelf: 'stretch',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  skipText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.secondary,
  },
});
