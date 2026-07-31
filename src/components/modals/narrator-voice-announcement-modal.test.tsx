import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useAnnouncementStore } from '@/store/announcement-store';

import { NarratorVoiceAnnouncementModal } from './narrator-voice-announcement-modal';

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockPosthogCapture,
  }),
}));

// Mock emberglow BottomSheet to properly forward refs in tests
jest.mock('@/components/emberglow', () => {
  const React = require('react');
  const RN = require('react-native');

  return {
    BottomSheet: React.forwardRef(({ children, title }: any, ref: any) => {
      // Ensure the ref passed in is properly exposed
      if (ref && ref.current) {
        // The ref.current already has dismiss, just ensure it's accessible
      }
      return (
        <RN.View>
          {title && <RN.Text>{title}</RN.Text>}
          {children}
        </RN.View>
      );
    }),
    Button: ({ label, onPress, variant }: any) => (
      <RN.TouchableOpacity onPress={onPress} testID={`button-${label}`}>
        <RN.Text>{label}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };
});

describe('NarratorVoiceAnnouncementModal', () => {
  let mockRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRef = { current: { dismiss: jest.fn() } };
    // Real store, reset per test — assertions below check resulting state,
    // not setter calls, per the repo's silent-pass trap list.
    useAnnouncementStore.setState({ hasSeenNarratorVoiceAnnouncement: false });
  });

  describe('Rendering', () => {
    it('renders the modal title', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);
      expect(screen.getByText('New: Narrator Voices')).toBeTruthy();
    });

    it('renders the main heading', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);
      expect(screen.getByText('Choose Who Tells Your Story')).toBeTruthy();
    });

    it('renders the description text', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);
      expect(
        screen.getByText(/quest in Vaedros can now be narrated/i)
      ).toBeTruthy();
    });

    it('renders both voices in the preview card with the new-voice badge', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);
      expect(screen.getByText('The Original Narrator')).toBeTruthy();
      expect(screen.getByText('The New Narrator')).toBeTruthy();
      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('renders the primary CTA and the maybe later option', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);
      expect(screen.getByText('Choose My Narrator')).toBeTruthy();
      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('accepted: marks seen in the store, captures the event, dismisses, and opens Settings', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);

      fireEvent.press(screen.getByText('Choose My Narrator'));

      expect(
        useAnnouncementStore.getState().hasSeenNarratorVoiceAnnouncement
      ).toBe(true);
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'narrator_voice_announcement_accepted'
      );
      expect(mockRef.current.dismiss).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/settings');
    });

    it('declined: marks seen in the store, captures the event, dismisses, does NOT navigate', () => {
      render(<NarratorVoiceAnnouncementModal ref={mockRef} />);

      fireEvent.press(screen.getByText('Maybe Later'));

      expect(
        useAnnouncementStore.getState().hasSeenNarratorVoiceAnnouncement
      ).toBe(true);
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'narrator_voice_announcement_declined'
      );
      expect(mockRef.current.dismiss).toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});
