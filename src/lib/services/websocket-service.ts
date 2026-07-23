import { io, type Socket } from 'socket.io-client';

import { getApiUrl } from '@/api/common/get-api-url';
import { getProvisionalAccessToken } from '@/api/token';
import { getToken } from '@/lib/auth/utils';

import { type TypedWebSocketEvents } from './websocket-events.types';

// Re-export the typed events for backward compatibility
export type WebSocketEvents = TypedWebSocketEvents;

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;

  constructor() {
    // Bind methods to ensure correct context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    // Get token from the auth store
    const tokenData = getToken();
    const provisionalToken = getProvisionalAccessToken();
    const accessToken = tokenData?.access || provisionalToken;

    if (!accessToken) {
      console.warn(
        '[WebSocket] No access token available, skipping connection'
      );
      return;
    }

    // Extract base URL from API_URL (remove /v1 path)
    const apiUrl = getApiUrl();
    const baseUrl = apiUrl.replace('/v1', '');

    this.socket = io(baseUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'], // Add polling as fallback
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      // Add timeout options
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      if (__DEV__) {
        console.log('[WebSocket] Disconnected:', reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);

      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Emit a WebSocket event. Returns true if the event was sent, false if not connected.
   * Callers should check the return value and handle disconnected state appropriately.
   */
  emit(event: string, data?: any): boolean {
    if (!this.socket || !this.isConnected) {
      console.warn('[WebSocket] Cannot emit - not connected:', event);
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  on<K extends keyof TypedWebSocketEvents>(
    event: K,
    handler: TypedWebSocketEvents[K]
  ): void;
  on(event: string, handler: (...args: any[]) => void): void;
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn(
        '[WebSocket] Cannot subscribe to events, socket not initialized'
      );
      return;
    }

    this.socket.on(event, handler);
  }

  off<K extends keyof TypedWebSocketEvents>(
    event: K,
    handler?: TypedWebSocketEvents[K]
  ): void;
  off(event: string, handler?: (...args: any[]) => void): void;
  off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
  }

  joinQuestRoom(questRunId: string): void {
    this.emit('joinQuestRoom', { questRunId });
  }

  leaveQuestRoom(questRunId: string): void {
    this.emit('leaveQuestRoom', { questRunId });
  }

  updateParticipantStatus(questRunId: string, status: any): void {
    this.emit('updateParticipantStatus', { questRunId, status });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Force a reconnection by disconnecting and reconnecting.
   */
  forceReconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => {
      this.connect();
    }, 100);
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
