import * as Linking from 'expo-linking';
import { Settings } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

interface PermissionDeniedViewProps {
  onEnablePermissions: () => void;
  onManualAdd: () => void;
}

export const PermissionDeniedView: React.FC<PermissionDeniedViewProps> = ({
  onEnablePermissions,
  onManualAdd,
}) => {
  const handleEnablePermissions = async () => {
    if (Platform.OS === 'ios') {
      // On iOS, open settings
      await Linking.openSettings();
    } else {
      // On Android, we can re-prompt
      onEnablePermissions();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconTile}>
        <Settings size={36} color={colors.text.accent} />
      </View>

      <Text style={styles.title}>Contact Access Required</Text>

      <Text style={styles.description}>
        To import contacts and invite friends easily, please enable contact
        access in your device settings.
      </Text>

      <View style={styles.actions}>
        <Button
          label="Enable Permissions"
          onPress={handleEnablePermissions}
          fullWidth
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          label="Add Contact Manually"
          onPress={onManualAdd}
          variant="outline"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTile: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.cinnabar, 0.18),
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[8],
  },
  actions: {
    width: '100%',
    gap: spacing[3],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.hairline,
  },
  dividerText: {
    marginHorizontal: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
});
