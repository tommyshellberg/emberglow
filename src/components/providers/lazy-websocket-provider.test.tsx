import { act, render } from '@testing-library/react-native';
import React from 'react';

import { webSocketService } from '@/lib/services/websocket-service';

import {
  LazyWebSocketProvider,
  useLazyWebSocket,
} from './lazy-websocket-provider';

jest.mock('@/lib/services/websocket-service', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    forceReconnect: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  useAuth: (selector: any) => selector({ status: 'signIn' }),
}));

jest.mock('@/api/token', () => ({
  getProvisionalAccessToken: jest.fn(() => null),
}));

describe('LazyWebSocketProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Screens key their socket effects on emit/on/off. If the provider hands
  // out new identities on re-render (e.g. connection status flips), every
  // consumer effect re-runs its cleanup — which historically emitted
  // lobby:leave and killed cooperative lobbies.
  it('provides referentially stable emit/on/off across re-renders', () => {
    const captured: any[] = [];
    function Probe() {
      captured.push(useLazyWebSocket());
      return null;
    }

    render(
      <LazyWebSocketProvider>
        <Probe />
      </LazyWebSocketProvider>
    );

    // Fire the provider's own 'connect' listener to flip isConnected and
    // force a provider re-render.
    const connectHandler = (webSocketService.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'connect'
    )?.[1];
    expect(connectHandler).toBeTruthy();

    act(() => {
      connectHandler();
    });

    expect(captured.length).toBeGreaterThan(1);
    const first = captured[0];
    const last = captured[captured.length - 1];

    expect(last.isConnected).toBe(true);
    expect(last.emit).toBe(first.emit);
    expect(last.on).toBe(first.on);
    expect(last.off).toBe(first.off);
    expect(last.joinQuestRoom).toBe(first.joinQuestRoom);
    expect(last.leaveQuestRoom).toBe(first.leaveQuestRoom);
  });
});
