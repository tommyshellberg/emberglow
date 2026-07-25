import { Search } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, fontFamily, radii, spacing } from '@/theme';

interface ContactSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const ContactSearchBar: React.FC<ContactSearchBarProps> = ({
  value,
  onChangeText,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Search size={18} color={colors.text.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search contacts"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing[3],
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
});
