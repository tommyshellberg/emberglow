import * as Contacts from 'expo-contacts';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomSheet, useEmberglowBottomSheet } from '@/components/emberglow';
import { colors, fontFamily, spacing } from '@/theme';

import { ContactsList } from './ContactsList';
import { EmptyContactsView } from './EmptyContactsView';
import { InviteResultsSummary } from './InviteResultsSummary';
import { ManualEmailView } from './ManualEmailView';
import { PermissionDeniedView } from './PermissionDeniedView';

type ViewState =
  | 'empty'
  | 'permissions-denied'
  | 'loading'
  | 'contacts'
  | 'sending'
  | 'results'
  | 'manual';

interface SelectedContacts {
  [email: string]: { name: string; selected: boolean };
}

interface InviteResults {
  successful: { name: string; email: string }[];
  failed: { name: string; email: string; reason: string }[];
}

interface BulkInviteResult {
  email: string;
  success: boolean;
  reason?: string;
}

interface ContactsImportModalProps {
  sendBulkInvites: (emails: string[]) => Promise<BulkInviteResult[]>;
  friends: any[];
  userEmail: string;
}

export interface ContactsImportModalRef {
  present: () => void;
  dismiss: () => void;
}

export const ContactsImportModal = forwardRef<
  ContactsImportModalRef,
  ContactsImportModalProps
>(({ sendBulkInvites, friends, userEmail }, ref) => {
  const sheet = useEmberglowBottomSheet();
  const [viewState, setViewState] = useState<ViewState>('empty');
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<SelectedContacts>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteResults | null>(
    null
  );
  const [manualEmail, setManualEmail] = useState('');

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        sheet.present();
        checkPermissionsAndLoadContacts();
      },
      dismiss: () => {
        sheet.dismiss();
        // Reset state when modal closes
        setViewState('empty');
        setContacts([]);
        setSelectedContacts({});
        setSearchQuery('');
        setInviteResults(null);
        setManualEmail('');
      },
    }),
    [sheet]
  );

  // Handle app state changes to re-check permissions after user returns from settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && viewState === 'permissions-denied') {
        checkPermissionsAndLoadContacts();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [viewState]);

  const checkPermissionsAndLoadContacts = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();

      if (status === 'granted') {
        setViewState('loading');
        await loadContacts();
      } else if (status === 'undetermined') {
        // Don't automatically request permissions on modal open
        // Let the user click the button first
        setViewState('empty');
      } else {
        setViewState('permissions-denied');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setViewState('empty');
    }
  };

  const requestPermissionAndLoad = async () => {
    try {
      setViewState('loading');
      const { status } = await Contacts.requestPermissionsAsync();

      if (status === 'granted') {
        await loadContacts();
      } else {
        setViewState('permissions-denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request contacts permission');
      setViewState('empty');
    }
  };

  const loadContacts = async () => {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      // Filter contacts with email addresses and exclude user's own email
      const contactsWithEmail = data.filter((contact) => {
        if (!contact.emails || contact.emails.length === 0) return false;

        // Check if any of the contact's emails match the user's email
        const hasUserEmail = contact.emails.some(
          (email) => email.email?.toLowerCase() === userEmail.toLowerCase()
        );

        return !hasUserEmail;
      });

      if (contactsWithEmail.length > 0) {
        // Cross-reference with existing friends
        const friendEmails = friends.map((f) => f.email.toLowerCase());

        const processedContacts = contactsWithEmail.map((contact) => ({
          ...contact,
          isFriend:
            contact.emails?.some((email) =>
              friendEmails.includes(email.email?.toLowerCase() || '')
            ) || false,
        }));

        setContacts(processedContacts);
        setViewState('contacts');
      } else {
        Alert.alert(
          'No Contacts Found',
          'No contacts with email addresses were found on your device.'
        );
        setViewState('empty');
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
      setViewState('empty');
    }
  };

  const handleContactSelect = (contact: Contacts.Contact) => {
    if (contact.emails && contact.emails[0]) {
      const email = contact.emails[0].email!;
      const name = contact.name || email;

      setSelectedContacts((prev) => ({
        ...prev,
        [email]: {
          name,
          selected: !prev[email]?.selected,
        },
      }));
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedContacts).filter((c) => c.selected).length;
  };

  const handleSendInvites = async () => {
    const selectedEmails = Object.entries(selectedContacts)
      .filter(([_, value]) => value.selected)
      .map(([email, value]) => ({ email, name: value.name }));

    if (selectedEmails.length === 0) return;

    setViewState('sending');

    try {
      const results = await sendBulkInvites(selectedEmails.map((c) => c.email));

      // Process results
      const successful: InviteResults['successful'] = [];
      const failed: InviteResults['failed'] = [];

      // Ensure results is an array
      if (!Array.isArray(results)) {
        console.error('Invalid response format:', results);
        throw new Error('Invalid response from server');
      }

      selectedEmails.forEach((contact, index) => {
        const result = results[index];
        // Check if result exists and has the expected structure
        if (!result || typeof result !== 'object') {
          failed.push({
            ...contact,
            reason: 'Failed to send invitation',
          });
        } else if (result.success === true) {
          successful.push(contact);
        } else {
          failed.push({
            ...contact,
            reason: result.reason || 'Failed to send invitation',
          });
        }
      });

      // Always show results, even if all failed
      setInviteResults({ successful, failed });
      setViewState('results');
    } catch (error) {
      console.error('Error sending invites:', error);
      // If we have some selected emails, show them all as failed
      if (selectedEmails.length > 0) {
        setInviteResults({
          successful: [],
          failed: selectedEmails.map((contact) => ({
            ...contact,
            reason: 'Failed to send invitation',
          })),
        });
        setViewState('results');
      } else {
        Alert.alert('Error', 'Failed to send invites. Please try again.');
        setViewState('contacts');
      }
    }
  };

  const handleManualInvite = async (emailToInvite?: string) => {
    const email = emailToInvite || manualEmail;
    if (!email.trim()) return;

    setViewState('sending');

    try {
      const results = await sendBulkInvites([email]);
      const result = results[0];

      if (result.success) {
        setInviteResults({
          successful: [{ email, name: email }],
          failed: [],
        });
      } else {
        setInviteResults({
          successful: [],
          failed: [
            {
              email,
              name: email,
              reason: result.reason || 'Unknown error',
            },
          ],
        });
      }

      setViewState('results');
    } catch (error) {
      console.error('Error sending invite:', error);
      Alert.alert('Error', 'Failed to send invite');
      setViewState('manual');
    }
  };

  const handleDone = () => {
    sheet.dismiss();
    // Reset state when modal closes
    setViewState('empty');
    setContacts([]);
    setSelectedContacts({});
    setSearchQuery('');
    setInviteResults(null);
    setManualEmail('');
  };

  const renderContent = () => {
    // Captured before the switch: inside `case 'manual'`, TS narrows
    // `viewState` to the literal `'manual'`, which makes a direct
    // `viewState === 'sending'` comparison in that branch a compile error
    // (pre-existing — see task report). Hoisting the comparison here keeps
    // the exact same (structurally always-false) runtime value without
    // fighting the narrowing.
    const isSendingManualInvite = viewState === 'sending';

    switch (viewState) {
      case 'empty':
        return (
          <EmptyContactsView
            onImportContacts={requestPermissionAndLoad}
            onManualAdd={() => setViewState('manual')}
          />
        );

      case 'permissions-denied':
        return (
          <PermissionDeniedView
            onEnablePermissions={requestPermissionAndLoad}
            onManualAdd={() => setViewState('manual')}
          />
        );

      case 'contacts':
        return (
          <ContactsList
            contacts={contacts}
            selectedContacts={selectedContacts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onContactSelect={handleContactSelect}
            onInvite={handleSendInvites}
            onManualAdd={() => setViewState('manual')}
            selectedCount={getSelectedCount()}
          />
        );

      case 'results':
        return inviteResults ? (
          <InviteResultsSummary results={inviteResults} onDone={handleDone} />
        ) : null;

      case 'manual':
        return (
          <ManualEmailView
            email={manualEmail}
            onEmailChange={setManualEmail}
            onSubmit={handleManualInvite}
            onBack={() =>
              setViewState(contacts.length > 0 ? 'contacts' : 'empty')
            }
            isSubmitting={isSendingManualInvite}
          />
        );

      case 'loading':
        return (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={styles.centerStateText}>Loading contacts...</Text>
          </View>
        );

      case 'sending':
        return (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={styles.centerStateText}>Sending invitations...</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <BottomSheet
      ref={sheet.ref}
      title={viewState === 'results' ? 'Invites Sent!' : 'Invite Friends'}
    >
      {renderContent()}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  centerStateText: {
    marginTop: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 18,
    color: colors.text.secondary,
  },
});
