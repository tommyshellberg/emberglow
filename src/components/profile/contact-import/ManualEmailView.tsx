import { ChevronLeft, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, IconButton, Input } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

interface ManualEmailViewProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (email: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const ManualEmailView: React.FC<ManualEmailViewProps> = ({
  email: initialEmail,
  onEmailChange,
  onSubmit,
  onBack,
  isSubmitting,
}) => {
  // Use local state for smooth typing
  const [localEmail, setLocalEmail] = useState(initialEmail);

  // Update local state if parent email changes
  useEffect(() => {
    setLocalEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = () => {
    // Update parent state and submit with the email
    onEmailChange(localEmail);
    onSubmit(localEmail);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton label="Back" size={36} onPress={onBack}>
          <ChevronLeft />
        </IconButton>
      </View>

      <View style={styles.intro}>
        <View style={styles.iconTile}>
          <Mail size={22} color={colors.text.accent} />
        </View>
        <Text style={styles.introText}>
          Enter a friend's email to invite them to emberglow.
        </Text>
      </View>

      <Input
        label="Email Address"
        value={localEmail}
        onChangeText={setLocalEmail}
        placeholder="friend@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        autoFocus
        containerStyle={styles.inputContainer}
      />

      {isSubmitting && (
        <ActivityIndicator
          size="small"
          color={colors.accent.primary}
          style={styles.spinner}
        />
      )}

      <Button
        label={isSubmitting ? 'Sending…' : 'Send Invite'}
        onPress={handleSubmit}
        disabled={!localEmail.trim() || isSubmitting}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.sandy, 0.15),
  },
  introText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text.secondary,
  },
  inputContainer: {
    marginBottom: spacing[6],
  },
  spinner: {
    marginBottom: spacing[2],
  },
});
