import React, { createContext, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient } from '@/api/common';
import { useAuth } from '@/lib/auth';
import { type TypedWebSocketEvents } from '@/lib/services/websocket-events.types';
import { webSocketService } from '@/lib/services/websocket-service';
import { getItem } from '@/lib/storage';
import { useQuestStore } from '@/store/quest-store';

interface WebSocketContextValue {
  isConnected: boolean;
  on: {
    <K extends keyof TypedWebSocketEvents>(
      event: K,
      handler: TypedWebSocketEvents[K]
    ): void;
    (event: string, handler: (...args: any[]) => void): void;
  };
  off: {
    <K extends keyof TypedWebSocketEvents>(
      event: K,
      handler?: TypedWebSocketEvents[K]
    ): void;
    (event: string, handler?: (...args: any[]) => void): void;
  };
  emit: (event: string, data?: any) => void;
  joinQuestRoom: (questRunId: string) => void;
  leaveQuestRoom: (questRunId: string) => void;
  forceReconnect: () => void;
  // Alias methods for compatibility
  addListener: {
    <K extends keyof TypedWebSocketEvents>(
      event: K,
      handler: TypedWebSocketEvents[K]
    ): void;
    (event: string, handler: (...args: any[]) => void): void;
  };
  removeListener: {
    <K extends keyof TypedWebSocketEvents>(
      event: K,
      handler?: TypedWebSocketEvents[K]
    ): void;
    (event: string, handler?: (...args: any[]) => void): void;
  };
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Re-export from lazy provider for compatibility
export { useWebSocket } from './lazy-websocket-provider';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const authStatus = useAuth((state) => state.status);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const setPendingInvitations = useQuestStore(
    (state) => state.setPendingInvitations
  );

  // Check if provisional user has a token
  const [hasProvisionalToken, setHasProvisionalToken] = React.useState(false);

  // Check for token changes on auth status changes and component renders
  React.useEffect(() => {
    const provisionalToken = getItem('provisionalAccessToken');
    setHasProvisionalToken(!!provisionalToken);
  }, [authStatus]);

  // Also check for token changes on every render to catch mock changes in tests
  React.useEffect(() => {
    const provisionalToken = getItem('provisionalAccessToken');
    const hasToken = !!provisionalToken;
    if (hasToken !== hasProvisionalToken) {
      setHasProvisionalToken(hasToken);
    }
  });

  useEffect(() => {
    console.log(
      '[WebSocketProvider] Auth status changed:',
      authStatus,
      'Provisional token:',
      hasProvisionalToken
    );

    // Connect when authenticated (either full auth or provisional)
    if (authStatus === 'signIn' || hasProvisionalToken) {
      console.log(
        '[WebSocketProvider] User authenticated, attempting WebSocket connection...'
      );
      webSocketService.connect();
    } else {
      console.log(
        '[WebSocketProvider] User not authenticated, disconnecting WebSocket...'
      );
      webSocketService.disconnect();
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [authStatus, hasProvisionalToken]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        (appStateRef.current === 'inactive' ||
          appStateRef.current === 'background') &&
        nextAppState === 'active' &&
        (authStatus === 'signIn' || hasProvisionalToken)
      ) {
        // App has come to foreground, reconnect
        console.log('[WebSocket] App foregrounded, reconnecting...');
        webSocketService.connect();

        // DO NOT check for quest activation here
        // If the app is in foreground, the phone is unlocked
        // Quests should only be active while the phone is locked
      } else if (
        appStateRef.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App going to background
        console.log('[WebSocket] App backgrounded');
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [authStatus, hasProvisionalToken]);

  // Set up global event listeners
  useEffect(() => {
    if (authStatus !== 'signIn' && !hasProvisionalToken) return;

    // Handle new quest invitations
    const handleQuestInvitation = (data: any) => {
      console.log('[WebSocket] New quest invitation:', data);
      try {
        // Invalidate invitations query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['invitations', 'pending'] });
        // TODO: Show push notification or in-app notification
      } catch (error) {
        console.error('Error handling quest invitation:', error);
      }
    };

    // Handle invitation status changes
    const handleInvitationAccepted = (data: any) => {
      console.log('========================================');
      console.log('[WebSocket] INVITATION ACCEPTED EVENT RECEIVED');
      console.log('Event data:', JSON.stringify(data, null, 2));
      console.log('InvitationId:', data.invitationId);
      console.log('Timestamp:', new Date().toISOString());
      console.log('Invalidating query key:', [
        'invitation',
        data.invitationId,
        'status',
      ]);
      console.log('========================================');
      try {
        queryClient.invalidateQueries({
          queryKey: ['invitation', data.invitationId, 'status'],
        });
      } catch (error) {
        console.error('Error handling invitation accepted:', error);
      }
    };

    const handleInvitationDeclined = (data: any) => {
      console.log('========================================');
      console.log('[WebSocket] INVITATION DECLINED EVENT RECEIVED');
      console.log('Event data:', JSON.stringify(data, null, 2));
      console.log('InvitationId:', data.invitationId);
      console.log('Timestamp:', new Date().toISOString());
      console.log('Invalidating query key:', [
        'invitation',
        data.invitationId,
        'status',
      ]);
      console.log('========================================');
      try {
        queryClient.invalidateQueries({
          queryKey: ['invitation', data.invitationId, 'status'],
        });
      } catch (error) {
        console.error('Error handling invitation declined:', error);
      }
    };

    // Handle quest status changes
    const handleQuestStarted = (data: any) => {
      console.log('[WebSocket] Quest started:', data);
      try {
        const questStore = useQuestStore.getState();
        const cooperativeQuestRun = questStore.cooperativeQuestRun;

        if (cooperativeQuestRun && cooperativeQuestRun.id === data.questRunId) {
          // Update the cooperative quest run status
          questStore.setCooperativeQuestRun({
            ...cooperativeQuestRun,
            status: 'active',
            actualStartTime: data.actualStartTime,
          });

          // DO NOT start the quest here - the app is in foreground which means phone is unlocked
          // The quest timer will handle starting the quest when appropriate (while phone is locked)
          console.log(
            '[WebSocket] Quest activated by server, quest timer will handle local activation'
          );
        }
      } catch (error) {
        console.error('Error handling quest started:', error);
      }
    };

    const handleParticipantReady = (data: any) => {
      console.log('[WebSocket] Participant ready:', data);
      try {
        useQuestStore
          .getState()
          .updateParticipantReady(data.userId, data.ready);
        // Also invalidate quest run query to get latest data
        if (data.questRunId) {
          queryClient.invalidateQueries({
            queryKey: ['questRun', data.questRunId],
          });
        }
      } catch (error) {
        console.error('Error handling participant ready:', error);
      }
    };

    const handleParticipantJoined = (data: any) => {
      console.log('[WebSocket] Participant joined:', data);
      try {
        // Invalidate quest run query to get latest participant list
        if (data.questRunId) {
          queryClient.invalidateQueries({
            queryKey: ['questRun', data.questRunId],
          });
        }
      } catch (error) {
        console.error('Error handling participant joined:', error);
      }
    };

    // Subscribe to events
    console.log('[WebSocket Provider] Setting up event listeners...');
    webSocketService.on('questInvitation', handleQuestInvitation);
    webSocketService.on('invitationAccepted', handleInvitationAccepted);
    webSocketService.on('invitationDeclined', handleInvitationDeclined);
    webSocketService.on('questStarted', handleQuestStarted);
    webSocketService.on('participantReady', handleParticipantReady);
    webSocketService.on('participantJoined', handleParticipantJoined);
    console.log('[WebSocket Provider] Event listeners set up complete');

    return () => {
      // Unsubscribe from events
      webSocketService.off('questInvitation', handleQuestInvitation);
      webSocketService.off('invitationAccepted', handleInvitationAccepted);
      webSocketService.off('invitationDeclined', handleInvitationDeclined);
      webSocketService.off('questStarted', handleQuestStarted);
      webSocketService.off('participantReady', handleParticipantReady);
      webSocketService.off('participantJoined', handleParticipantJoined);
    };
  }, [authStatus, hasProvisionalToken]);

  const contextValue: WebSocketContextValue = {
    isConnected: webSocketService.getConnectionStatus(),
    on: (event: string, handler: (...args: any[]) => void) =>
      webSocketService.on(event, handler),
    off: (event: string, handler?: (...args: any[]) => void) =>
      webSocketService.off(event, handler),
    emit: (event, data) => webSocketService.emit(event, data),
    joinQuestRoom: (questRunId) => webSocketService.joinQuestRoom(questRunId),
    leaveQuestRoom: (questRunId) => webSocketService.leaveQuestRoom(questRunId),
    forceReconnect: () => webSocketService.forceReconnect(),
    // Alias methods for compatibility
    addListener: (event: string, handler: (...args: any[]) => void) =>
      webSocketService.on(event, handler),
    removeListener: (event: string, handler?: (...args: any[]) => void) =>
      webSocketService.off(event, handler),
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
