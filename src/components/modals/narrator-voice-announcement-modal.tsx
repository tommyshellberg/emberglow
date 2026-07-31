import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/emberglow';
import { useAnnouncementStore } from '@/store/announcement-store';
import { colors, fontFamily, palette, radii, spacing } from '@/theme';

const VOICES = [
  {
    initial: 'M',
    name: 'The Original Narrator',
    tagline: 'The voice of Vaedros since day one',
    background: colors.accent.primary,
    color: colors.text.onAccent,
    isNew: false,
  },
  {
    initial: 'F',
    name: 'The New Narrator',
    tagline: 'A new voice joins the tale',
    background: palette.sandy,
    color: palette.richBlack,
    isNew: true,
  },
];

/** Two-voice preview in the same bordered fill.faint card style as guilds. */
function VoicePreviewCard() {
  return (
    <View style={styles.previewCard}>
      {VOICES.map((voice, index) => (
        <View
          key={voice.initial}
          style={[styles.voiceRow, index > 0 && styles.voiceRowSpacing]}
        >
          <View
            style={[styles.voiceAvatar, { backgroundColor: voice.background }]}
          >
            <Text style={[styles.voiceInitial, { color: voice.color }]}>
              {voice.initial}
            </Text>
          </View>
          <View style={styles.voiceInfo}>
            <Text style={styles.voiceName}>{voice.name}</Text>
            <Text style={styles.voiceTagline}>{voice.tagline}</Text>
          </View>
          {voice.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export const NarratorVoiceAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const router = useRouter();
    const posthog = usePostHog();
    const setHasSeenNarratorVoiceAnnouncement = useAnnouncementStore(
      (state) => state.setHasSeenNarratorVoiceAnnouncement
    );

    const handleModalChange = (index: number) => {
      if (index >= 0) {
        posthog.capture('narrator_voice_announcement_viewed');
      }
    };

    // Deep-link rather than switching immediately: character defaults already
    // make the effective voice female for half the roster (see
    // DEFAULT_VOICE_BY_CHARACTER), so "switch to female now" could be a no-op.
    const handleChooseVoice = () => {
      posthog.capture('narrator_voice_announcement_accepted');
      setHasSeenNarratorVoiceAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
      router.push('/settings');
    };

    const handleDismiss = () => {
      posthog.capture('narrator_voice_announcement_declined');
      setHasSeenNarratorVoiceAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
    };

    return (
      <BottomSheet
        ref={ref}
        title="New: Narrator Voices"
        onChange={handleModalChange}
      >
        <View style={styles.previewWrapper}>
          <VoicePreviewCard />
        </View>

        <Text style={styles.heading}>Choose Who Tells Your Story</Text>

        <Text style={styles.body}>
          Every quest in Vaedros can now be narrated by a new female voice.
          Switch anytime in Settings — your story, your storyteller.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Choose My Narrator"
            onPress={handleChooseVoice}
            fullWidth
          />
          <Button
            label="Maybe Later"
            variant="ghost"
            onPress={handleDismiss}
            fullWidth
          />
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  previewWrapper: {
    marginBottom: spacing[5],
  },
  previewCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  voiceRowSpacing: {
    marginTop: spacing[3],
  },
  voiceAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInitial: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  voiceTagline: {
    fontFamily: fontFamily.regular,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1] / 2,
  },
  newBadge: {
    backgroundColor: colors.accent.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2,
  },
  newBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.text.onAccent,
  },
  heading: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  actions: {
    gap: spacing[3],
  },
});
