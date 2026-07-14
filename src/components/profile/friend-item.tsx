import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

import { getCharacterAvatar } from '@/app/utils/character-utils';
import { ListItem } from '@/components/emberglow';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

type Friend = {
  _id: string;
  email: string;
  character: {
    name: string;
    type: string;
    level: number;
  } | null;
};

type FriendItemProps = {
  friend: Friend;
  onDelete: (friend: Friend) => void;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function FriendItem({ friend, onDelete }: FriendItemProps) {
  const classLabel = friend.character?.type
    ? capitalize(friend.character.type)
    : 'Character';

  return (
    <ListItem
      title={friend.character?.name || 'Unknown'}
      subtitle={classLabel}
      leading={
        <Image
          source={getCharacterAvatar(friend.character?.type)}
          style={styles.avatar}
        />
      }
      trailing={
        <Pressable
          onPress={() => onDelete(friend)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${friend.character?.name || 'friend'}`}
          accessibilityHint="Tap to remove this friend from your list"
          style={styles.removeButton}
        >
          <Text style={styles.removeLabel}>Remove</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  removeLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
});
