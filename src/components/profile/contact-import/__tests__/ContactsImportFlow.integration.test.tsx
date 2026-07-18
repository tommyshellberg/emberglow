import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ContactsImportModal,
  ContactsImportModalRef,
} from '../ContactsImportModal';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-contacts');
// react-native's index re-exports Alert as `require('.../Alert').default`
// (Alert.js is `export default Alert`), so the mock needs a `default` key -
// a bare `{ alert: jest.fn() }` resolves to `Alert === undefined` under RN 0.79.
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  default: {
    alert: jest.fn(),
  },
}));

describe('ContactsImportModal Integration Tests', () => {
  let queryClient: QueryClient;
  const mockSendBulkInvites = jest.fn();
  const userEmail = 'currentuser@example.com';

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Complete User Flows', () => {
    it('should handle complete flow: permissions → select contacts → mixed results', async () => {
      // Setup: Start with no permissions
      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockResolvedValueOnce({
        data: [
          { id: '1', name: 'Alice', emails: [{ email: 'alice@example.com' }] },
          { id: '2', name: 'Bob', emails: [{ email: 'bob@example.com' }] },
          {
            id: '3',
            name: 'Charlie',
            emails: [{ email: 'charlie@example.com' }],
          },
        ],
      });

      mockSendBulkInvites.mockResolvedValueOnce([
        { email: 'alice@example.com', success: true },
        {
          email: 'bob@example.com',
          success: false,
          reason: 'Email already taken',
        },
        { email: 'charlie@example.com', success: true },
      ]);

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText, getAllByTestId } = render(
        <ContactsImportModal
          ref={ref}
          sendBulkInvites={mockSendBulkInvites}
          friends={[]}
          userEmail={userEmail}
        />,
        { wrapper }
      );

      // Step 1: Open modal
      await waitFor(() => ref.current?.present());

      // Step 2: See empty state and click import
      expect(getByText(/play cooperative quests together/i)).toBeTruthy();
      fireEvent.press(getByText(/import contacts/i));

      // Step 3: Wait for contacts to load
      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
        expect(getByText('Bob')).toBeTruthy();
        expect(getByText('Charlie')).toBeTruthy();
      });

      // Step 4: Select all contacts
      const contacts = getAllByTestId(/contact-item-/);
      contacts.forEach((contact) => fireEvent.press(contact));

      // Step 5: Send invites
      fireEvent.press(getByText(/invite 3 contacts/i));

      // Step 6: View results
      await waitFor(() => {
        expect(getByText(/invitations sent with some failures/i)).toBeTruthy();
        expect(getByText(/2 successful/i)).toBeTruthy();
        expect(getByText(/1 failed/i)).toBeTruthy();
        expect(getByText('alice@example.com')).toBeTruthy();
        expect(getByText('charlie@example.com')).toBeTruthy();
        expect(getByText(/email already taken/i)).toBeTruthy();
      });
    });

    it('should handle flow with existing friends filtered out', async () => {
      const existingFriends = [
        { _id: '1', email: 'alice@example.com' },
        { _id: '2', email: 'bob@example.com' },
      ];

      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockResolvedValueOnce({
        data: [
          { id: '1', name: 'Alice', emails: [{ email: 'alice@example.com' }] },
          { id: '2', name: 'Bob', emails: [{ email: 'bob@example.com' }] },
          {
            id: '3',
            name: 'Charlie',
            emails: [{ email: 'charlie@example.com' }],
          },
        ],
      });

      mockSendBulkInvites.mockResolvedValueOnce([
        { email: 'charlie@example.com', success: true },
      ]);

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText, getByTestId, getAllByText, getAllByTestId } = render(
        <ContactsImportModal
          ref={ref}
          sendBulkInvites={mockSendBulkInvites}
          friends={existingFriends}
          userEmail={userEmail}
        />,
        { wrapper }
      );

      await waitFor(() => ref.current?.present());

      // Should see existing friends marked
      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
        expect(getByText('Bob')).toBeTruthy();
        expect(getByText('Charlie')).toBeTruthy();
        expect(getAllByText(/already invited/i)).toHaveLength(2);
      });

      // Can only select non-friends - just Charlie since David doesn't appear
      const contactCharlie = getByTestId('contact-item-3');
      fireEvent.press(contactCharlie);

      fireEvent.press(getByText(/invite 1 contact/i));

      await waitFor(() => {
        expect(getByText(/all invitations sent successfully!/i)).toBeTruthy();
        expect(mockSendBulkInvites).toHaveBeenCalledWith([
          'charlie@example.com',
        ]);
      });
    });

    it('should handle permission denied → manual entry flow', async () => {
      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      mockSendBulkInvites.mockResolvedValueOnce([
        { email: 'manual@example.com', success: true },
      ]);

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText, getByPlaceholderText } = render(
        <ContactsImportModal
          ref={ref}
          sendBulkInvites={mockSendBulkInvites}
          friends={[]}
          userEmail={userEmail}
        />,
        { wrapper }
      );

      await waitFor(() => ref.current?.present());

      // Should see permission denied view
      expect(getByText(/contact access required/i)).toBeTruthy();

      // Use manual add instead
      fireEvent.press(getByText(/add contact manually/i));

      // Enter email
      const input = getByPlaceholderText('friend@example.com');
      fireEvent.changeText(input, 'manual@example.com');

      // Send invite
      fireEvent.press(getByText(/send invite/i));

      // See success
      await waitFor(() => {
        expect(getByText(/all invitations sent successfully!/i)).toBeTruthy();
        expect(getByText(/1 successful/i)).toBeTruthy();
      });
    });

    it('should handle search and selective invitation', async () => {
      // Clear any previous mocks
      mockSendBulkInvites.mockClear();
      (Contacts.getPermissionsAsync as jest.Mock).mockClear();
      (Contacts.getContactsAsync as jest.Mock).mockClear();

      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockResolvedValueOnce({
        data: [
          {
            id: '1',
            name: 'John Smith',
            emails: [{ email: 'john@example.com' }],
          },
          {
            id: '2',
            name: 'John Doe',
            emails: [{ email: 'johndoe@example.com' }],
          },
          {
            id: '3',
            name: 'Jane Smith',
            emails: [{ email: 'jane@example.com' }],
          },
          {
            id: '4',
            name: 'Bob Wilson',
            emails: [{ email: 'bob@example.com' }],
          },
        ],
      });

      mockSendBulkInvites.mockResolvedValueOnce([
        { email: 'john@example.com', success: true },
        { email: 'johndoe@example.com', success: true },
      ]);

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText, getByPlaceholderText, getByTestId, queryByText } =
        render(
          <ContactsImportModal
            ref={ref}
            sendBulkInvites={mockSendBulkInvites}
            friends={[]}
            userEmail={userEmail}
          />,
          { wrapper }
        );

      await waitFor(() => ref.current?.present());

      await waitFor(
        () => {
          expect(getByText(/john smith/i)).toBeTruthy();
        },
        { timeout: 3000 }
      );

      // Search for "John"
      const searchInput = getByPlaceholderText('Search contacts');
      fireEvent.changeText(searchInput, 'John');

      // Should only see Johns
      expect(getByText(/john smith/i)).toBeTruthy();
      expect(getByText(/john doe/i)).toBeTruthy();
      expect(queryByText(/jane smith/i)).toBeNull();
      expect(queryByText(/bob wilson/i)).toBeNull();

      // Select both Johns
      fireEvent.press(getByTestId('contact-item-1'));
      fireEvent.press(getByTestId('contact-item-2'));

      // Send invites
      fireEvent.press(getByText(/invite 2 contacts/i));

      await waitFor(() => {
        expect(getByText(/all invitations sent successfully!/i)).toBeTruthy();
      });

      expect(mockSendBulkInvites).toHaveBeenCalledWith([
        'john@example.com',
        'johndoe@example.com',
      ]);
    });

    it('should handle empty contacts gracefully', async () => {
      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockResolvedValueOnce({
        data: [],
      });

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText } = render(
        <ContactsImportModal
          ref={ref}
          sendBulkInvites={mockSendBulkInvites}
          friends={[]}
          userEmail={userEmail}
        />,
        { wrapper }
      );

      await waitFor(() => ref.current?.present());

      // Click import to trigger loading
      fireEvent.press(getByText(/import contacts/i));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'No Contacts Found',
          'No contacts with email addresses were found on your device.'
        );
      });

      // Should go back to empty view with manual option
      expect(getByText(/add manual contact/i)).toBeTruthy();
    });

    it('should handle all failures with detailed reasons', async () => {
      // Clear any previous mocks
      mockSendBulkInvites.mockClear();
      (Contacts.getPermissionsAsync as jest.Mock).mockClear();
      (Contacts.getContactsAsync as jest.Mock).mockClear();

      (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockResolvedValueOnce({
        data: [
          {
            id: '1',
            name: 'User One',
            emails: [{ email: 'user1@blocked.com' }],
          },
          { id: '2', name: 'User Two', emails: [{ email: 'user2@invalid' }] },
          {
            id: '3',
            name: 'User Three',
            emails: [{ email: 'user3@taken.com' }],
          },
        ],
      });

      mockSendBulkInvites.mockResolvedValueOnce([
        {
          email: 'user1@blocked.com',
          success: false,
          reason: 'Domain blocked',
        },
        {
          email: 'user2@invalid',
          success: false,
          reason: 'Invalid email format',
        },
        {
          email: 'user3@taken.com',
          success: false,
          reason: 'Email already taken',
        },
      ]);

      const ref = React.createRef<ContactsImportModalRef>();
      const { getByText, getAllByTestId } = render(
        <ContactsImportModal
          ref={ref}
          sendBulkInvites={mockSendBulkInvites}
          friends={[]}
          userEmail={userEmail}
        />,
        { wrapper }
      );

      await waitFor(() => ref.current?.present());

      await waitFor(
        () => {
          expect(getByText(/user one/i)).toBeTruthy();
        },
        { timeout: 3000 }
      );

      // Select all
      const contacts = getAllByTestId(/contact-item-/);
      contacts.forEach((contact) => fireEvent.press(contact));

      fireEvent.press(getByText(/invite 3 contacts/i));

      await waitFor(() => {
        expect(getByText(/failed to send invitations/i)).toBeTruthy();
        expect(getByText(/3 failed/i)).toBeTruthy();
        expect(getByText(/domain blocked/i)).toBeTruthy();
        expect(getByText(/invalid email format/i)).toBeTruthy();
        expect(getByText(/email already taken/i)).toBeTruthy();
      });
    });
  });
});
