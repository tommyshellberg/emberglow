import type * as Contacts from 'expo-contacts';
import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, ListItem } from '@/components/emberglow';
import { colors, palette, radii } from '@/theme';

interface ContactItemProps {
  contact: Contacts.Contact & { isFriend?: boolean };
  isSelected: boolean;
  isFriend: boolean;
  onPress: () => void;
}

export const ContactItem: React.FC<ContactItemProps> = ({
  contact,
  isSelected,
  isFriend,
  onPress,
}) => {
  const displayName = contact.name || contact.emails?.[0]?.email || 'Unknown';
  const email = contact.emails?.[0]?.email || '';
  const showEmailSubtitle = !!(email && contact.name);

  return (
    <ListItem
      testID={`contact-item-${contact.id}`}
      title={displayName}
      subtitle={showEmailSubtitle ? email : undefined}
      onPress={isFriend ? undefined : onPress}
      style={isFriend ? styles.friendRow : undefined}
      trailing={
        isFriend ? (
          <Badge tone="neutral">Already invited</Badge>
        ) : (
          <View
            style={[
              styles.checkCircle,
              isSelected && styles.checkCircleSelected,
            ]}
          >
            {isSelected && (
              <Check size={13} color={palette.richBlack} strokeWidth={3} />
            )}
          </View>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  friendRow: {
    opacity: 0.6,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    borderColor: palette.sandy,
    backgroundColor: palette.sandy,
  },
});
