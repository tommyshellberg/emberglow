import type * as Contacts from 'expo-contacts';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { colors, radii, spacing } from '@/theme';

import { ContactItem } from './ContactItem';
import { ContactSearchBar } from './ContactSearchBar';

interface ContactsListProps {
  contacts: (Contacts.Contact & { isFriend?: boolean })[];
  selectedContacts: { [email: string]: { name: string; selected: boolean } };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onContactSelect: (contact: Contacts.Contact) => void;
  onInvite: () => void;
  onManualAdd: () => void;
  selectedCount: number;
}

interface ContactSection {
  title: string;
  data: (Contacts.Contact & { isFriend?: boolean })[];
}

// The list sits inside Emberglow's BottomSheet, which already provides the
// sheet's own scroll container — a bounded-height ScrollView here (matching
// the Invite Friends mockup) avoids nesting a virtualized SectionList inside
// that outer scroll view.
const LIST_MAX_HEIGHT = 320;

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  selectedContacts,
  searchQuery,
  onSearchChange,
  onContactSelect,
  onInvite,
  onManualAdd,
  selectedCount,
}) => {
  const filteredAndGroupedContacts = useMemo(() => {
    // Filter contacts based on search query
    const filtered = contacts.filter((contact) => {
      const name = contact.name?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      return name.includes(query);
    });

    // Sort contacts alphabetically
    const sorted = filtered.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    // Group by first letter
    const grouped: {
      [key: string]: (Contacts.Contact & { isFriend?: boolean })[];
    } = {};

    sorted.forEach((contact) => {
      const firstLetter = (contact.name || '#')[0].toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(contact);
    });

    // Convert to sections array
    const sections: ContactSection[] = Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));

    return sections;
  }, [contacts, searchQuery]);

  const isContactSelected = (contact: Contacts.Contact) => {
    if (!contact.emails || contact.emails.length === 0) return false;
    const email = contact.emails[0].email!;
    return selectedContacts[email]?.selected || false;
  };

  return (
    <View style={styles.container}>
      <ContactSearchBar value={searchQuery} onChangeText={onSearchChange} />

      <View style={styles.listBox}>
        <ScrollView
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
        >
          {filteredAndGroupedContacts.map((section) => (
            <View key={section.title}>
              <View style={styles.sectionHeader}>
                <EyebrowLabel tone="muted">{section.title}</EyebrowLabel>
              </View>
              {section.data.map((contact, index) => (
                <View key={contact.id}>
                  {index > 0 && <View style={styles.separator} />}
                  <ContactItem
                    contact={contact}
                    isSelected={isContactSelected(contact)}
                    isFriend={contact.isFriend || false}
                    onPress={() =>
                      !contact.isFriend && onContactSelect(contact)
                    }
                  />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <Button
          label={
            selectedCount > 0
              ? `Invite ${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`
              : 'Select Contacts'
          }
          onPress={onInvite}
          disabled={selectedCount === 0}
          fullWidth
        />
        <Button
          label="Add Manual Contact"
          onPress={onManualAdd}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listBox: {
    maxHeight: LIST_MAX_HEIGHT,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.lg,
  },
  listContent: {
    paddingVertical: spacing[1],
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  separator: {
    height: 1,
    marginHorizontal: spacing[4],
    backgroundColor: colors.border.hairline,
  },
  actions: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
});
