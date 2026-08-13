import { Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import {
  colors,
  palette,
  radii,
  shadows,
  spacing,
  text,
  withAlpha,
} from '@/theme';

import { FriendItem } from './friend-item';
import { InvitationItem } from './invitation-item';

// Matches the guild empty state's icon circle (h-16 w-16 / 64px).
const EMPTY_ICON_SIZE = 64;

type CombinedItem = {
  type: 'friend' | 'invitation';
  id: string;
  data: any;
  [key: string]: any;
};

type FriendsListProps = {
  combinedData: CombinedItem[];
  isLoading: boolean;
  onInvite: () => void;
  onDelete: (friend: any) => void;
  onRescind: (invitation: any) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isOutgoingInvitation: (invitation: any) => boolean;
  acceptMutation: any;
  rejectMutation: any;
  rescindMutation: any;
  userEmail: string;
};

type Group =
  | { kind: 'friends'; items: CombinedItem[] }
  | { kind: 'invitation'; item: CombinedItem };

// Friend rows render inside one shared raised card, but invitations (which
// the design doesn't cover) keep their own individual presentation — this
// groups only the *consecutive* friend entries together so the original
// combinedData order (incoming invites, then friends, then outgoing
// invites) is preserved exactly.
function groupConsecutiveFriends(items: CombinedItem[]): Group[] {
  const groups: Group[] = [];

  for (const item of items) {
    if (item.type === 'friend') {
      const last = groups[groups.length - 1];
      if (last?.kind === 'friends') {
        last.items.push(item);
      } else {
        groups.push({ kind: 'friends', items: [item] });
      }
    } else {
      groups.push({ kind: 'invitation', item });
    }
  }

  return groups;
}

export function FriendsList({
  combinedData,
  isLoading,
  onInvite,
  onDelete,
  onRescind,
  onAccept,
  onReject,
  isOutgoingInvitation,
  acceptMutation,
  rejectMutation,
  rescindMutation,
  userEmail,
}: FriendsListProps) {
  const groups = groupConsecutiveFriends(combinedData);

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <EyebrowLabel tone="warm">
          {`Friends · ${combinedData?.length || 0}`}
        </EyebrowLabel>
        {/* Redundant with the empty-state card's own "Invite friends" CTA
            when the list is empty — only show the compact header action
            once there's a list for it to sit alongside. */}
        {combinedData.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            label="+ Invite"
            onPress={onInvite}
            accessibilityLabel="Invite friends"
            accessibilityHint="Tap to invite friends to join Emberglow"
            testID="invite-friends-button"
          />
        )}
      </View>

      {groups.map((group, index) => {
        const groupStyle = index > 0 ? styles.group : undefined;

        if (group.kind === 'friends') {
          return (
            <View
              key={`friends-${group.items[0].id}`}
              style={[styles.rowCard, groupStyle]}
            >
              {group.items.map((item, itemIndex) => (
                <View
                  key={item.id}
                  style={itemIndex > 0 ? styles.divider : null}
                >
                  <FriendItem friend={item.data} onDelete={onDelete} />
                </View>
              ))}
            </View>
          );
        }

        return (
          <View key={group.item.id} style={groupStyle}>
            <InvitationItem
              invitation={group.item.data}
              outgoing={group.item.outgoing}
              isOutgoingInvitation={isOutgoingInvitation}
              onAccept={onAccept}
              onReject={onReject}
              onRescind={onRescind}
              acceptMutation={acceptMutation}
              rejectMutation={rejectMutation}
              rescindMutation={rescindMutation}
              userEmail={userEmail}
            />
          </View>
        );
      })}

      {combinedData.length === 0 && !isLoading && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Users size={28} color={colors.text.accent} strokeWidth={2} />
          </View>
          {/* Copy judgment call — flagged for review. */}
          <Text style={styles.emptyHeadline}>Bring your circle along</Text>
          <Text style={styles.emptyText}>
            Don't see someone you want to connect with?
          </Text>
          <Button
            label="Invite friends"
            variant="primary"
            fullWidth
            onPress={onInvite}
            testID="invite-friends-empty-cta"
          />
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingBlock}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing[4],
    marginTop: spacing[6],
    marginBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  rowCard: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  group: {
    marginTop: spacing[3],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[6],
    gap: spacing[3],
  },
  emptyIconCircle: {
    width: EMPTY_ICON_SIZE,
    height: EMPTY_ICON_SIZE,
    borderRadius: EMPTY_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm ember tint, same accent EyebrowLabel's tone="warm" resolves to.
    backgroundColor: withAlpha(palette.sandy, 0.16),
    marginBottom: spacing[1],
  },
  emptyHeadline: {
    ...text.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    ...text.body,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  loadingText: {
    color: colors.text.secondary,
  },
});
