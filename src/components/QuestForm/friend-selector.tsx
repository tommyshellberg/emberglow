import { Check, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TextInput } from 'react-native';

import CHARACTERS from '@/app/data/characters';
import { ListItem } from '@/components/emberglow';
import { Pressable, ScrollView, Text, View } from '@/components/ui';
import { useFriendManagement } from '@/lib/hooks/use-friend-management';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, radii, spacing } from '@/theme';

interface FriendSelectorProps {
  onSelectionChange: (selectedIds: string[], selectedFriends?: any[]) => void;
  maxSelections?: number;
}

/**
 * Selection affordance for a participant row. No Emberglow checkbox/radio
 * primitive exists (ground rule 4), so this is a bespoke themed circle —
 * matching the treatment already used by `GuildSelector`'s own indicator.
 */
function SelectionCheckmark({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        styles.selectionCircle,
        selected
          ? styles.selectionCircleSelected
          : styles.selectionCircleUnselected,
      ]}
    >
      {selected && (
        <Check size={13} color={colors.palette.richBlack} strokeWidth={3} />
      )}
    </View>
  );
}

export function FriendSelector({
  onSelectionChange,
  maxSelections = 5,
}: FriendSelectorProps) {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const user = useUserStore((state) => state.user);
  const userEmail = user?.email || '';

  const { friendsData, isLoadingFriends } = useFriendManagement(userEmail);

  const friends = friendsData?.friends || [];

  // Sort friends alphabetically by character name
  const sortedFriends = [...friends].sort((a, b) => {
    const nameA = a?.character?.name || a?.displayName || a?.email || '';
    const nameB = b?.character?.name || b?.displayName || b?.email || '';
    return nameA.localeCompare(nameB);
  });

  // Filter friends based on search query
  const filteredFriends = sortedFriends.filter((friend) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const name =
      friend?.character?.name || friend?.displayName || friend?.email || '';
    const type = friend?.character?.type || '';
    return (
      name.toLowerCase().includes(searchLower) ||
      type.toLowerCase().includes(searchLower)
    );
  });

  // Determine which friends to display
  const displayedFriends = searchQuery
    ? filteredFriends
    : filteredFriends.slice(0, 5);

  useEffect(() => {
    const selectedIds = Array.from(selectedFriends);
    const selectedFriendData = friends.filter((friend) => {
      const friendId = friend.userId || friend.id || friend._id || friend.email;
      return selectedIds.includes(friendId);
    });
    onSelectionChange(selectedIds, selectedFriendData);
  }, [selectedFriends, friends]); // Removed onSelectionChange from dependencies

  const toggleFriend = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else if (newSelection.size < maxSelections) {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  if (isLoadingFriends) {
    return (
      <View style={styles.centeredPad}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.centeredPad}>
        <Text style={styles.emptyText}>
          No friends to invite. Add friends from your profile to invite them to
          quests!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        {selectedFriends.size > 0 && (
          <Text style={styles.headerCount}>
            {selectedFriends.size} selected
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={20} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.text.muted}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <X size={20} color={colors.text.muted} />
          </Pressable>
        )}
      </View>

      {/* Results count */}
      {searchQuery && (
        <Text style={styles.resultsCount}>
          {filteredFriends.length} result
          {filteredFriends.length !== 1 ? 's' : ''}
        </Text>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
        {displayedFriends.length === 0 ? (
          <View style={styles.emptyListPad}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No friends found' : 'No friends to display'}
            </Text>
          </View>
        ) : (
          displayedFriends.map((friend, index) => {
            if (!friend) {
              return null;
            }

            // Use the userId field from the friend object, not _id
            const friendId =
              friend.userId || friend.id || friend._id || friend.email;
            if (!friendId) {
              console.warn('Friend has no valid ID:', friend);
              return null;
            }

            const isSelected = selectedFriends.has(friendId);
            const character = CHARACTERS.find(
              (c) => c.id === friend?.character?.type
            );
            const isLastItem = index === displayedFriends.length - 1;
            // Matches the legacy `@/components/ui/checkbox` Checkbox's label
            // exactly (see git history) so screen-reader users get the same
            // purpose-written "Select {name}" announcement as before,
            // instead of RN's default auto-concatenated row text.
            const friendLabel =
              friend?.character?.name || friend?.email || 'friend';

            return (
              <ListItem
                key={friendId}
                title={
                  friend?.character?.name ||
                  friend?.displayName ||
                  friend?.email ||
                  'Unknown'
                }
                subtitle={friend?.character?.type || 'Friend'}
                leading={
                  character ? (
                    <Image
                      source={character.profileImage}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarFallbackText}>
                      {friend?.character?.type?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  )
                }
                trailing={<SelectionCheckmark selected={isSelected} />}
                onPress={() => toggleFriend(friendId)}
                style={!isLastItem && styles.rowDivider}
                accessibilityLabel={`Select ${friendLabel}`}
                accessibilityHint={
                  isSelected ? 'Double tap to remove' : 'Double tap to select'
                }
              />
            );
          })
        )}
      </ScrollView>

      {selectedFriends.size >= maxSelections && (
        <Text style={styles.maxText}>
          Maximum {maxSelections} friends can be invited
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[4],
  },
  centeredPad: {
    paddingVertical: spacing[4],
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    color: colors.text.muted,
  },
  headerRow: {
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text.primary,
  },
  headerCount: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
  searchBar: {
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: {
    marginLeft: spacing[2],
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.text.primary,
  },
  clearButton: {
    marginLeft: spacing[2],
  },
  resultsCount: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
  list: {
    maxHeight: 208,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  emptyListPad: {
    padding: spacing[4],
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackText: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.accent,
  },
  maxText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.muted,
  },
  selectionCircle: {
    height: 24,
    width: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleSelected: {
    backgroundColor: colors.text.accent,
  },
  selectionCircleUnselected: {
    borderWidth: 2,
    borderColor: colors.border.strong,
  },
});
