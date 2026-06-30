import { type CharacterType } from '@/store/types';

// Lobby Event Payloads
export interface LobbyJoinPayload {
  lobbyId: string;
}

export interface LobbyLeavePayload {
  lobbyId: string;
}

// Matches the server's actual emit shape (unquest-server
// src/websocket/handlers/lobby.js) — a flat userId/username/characterName
// for the joining participant, plus the lobby's full participant list.
export interface LobbyParticipantJoinedPayload {
  userId: string;
  username: string;
  characterName?: string;
  participants: any[];
}

export interface LobbyParticipantUpdatedPayload {
  userId: string;
  updates: {
    invitationStatus?: 'pending' | 'accepted' | 'declined';
    isReady?: boolean;
    characterType?: CharacterType;
  };
}

export interface LobbyInvitationResponsePayload {
  userId: string;
  status?: 'accepted' | 'declined';
  action?: 'accepted' | 'declined'; // Server might use 'action' instead of 'status'
  username?: string;
  characterName?: string;
  invitationId?: string;
  lobbyId?: string;
}

export interface LobbyReadyStatusPayload {
  userId: string;
  isReady: boolean;
}

export interface LobbyAllRespondedPayload {
  lobbyId: string;
  allResponded: boolean;
}

export interface LobbyReadyPayload {
  lobbyId: string;
}

export interface LobbyUnreadyPayload {
  lobbyId: string;
}

export interface LobbyQuestCreatedPayload {
  questRun: {
    id: string;
    questId: string;
    title: string;
    durationMinutes: number;
    reward: {
      xp: number;
    };
    hostId: string;
    participants: {
      userId: string;
      ready: boolean;
      status:
        | 'pending'
        | 'accepted'
        | 'declined'
        | 'active'
        | 'completed'
        | 'failed';
      userName?: string;
      characterType?: CharacterType;
    }[];
    status: 'pending' | 'active' | 'completed' | 'failed';
    actualStartTime?: number;
    scheduledEndTime?: number;
    createdAt: number;
    updatedAt: number;
  };
}

// Quest Event Payloads (existing events that are already typed with 'any')
export interface QuestInvitationPayload {
  invitation: {
    id: string;
    questRunId: string;
    questTitle: string;
    questDuration: number;
    hostId: string;
    hostName: string;
    inviteeId: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
  };
}

export interface QuestStartedPayload {
  questRunId: string;
  questId: string;
  startTime: number;
  endTime: number;
  participants: string[];
}

export interface QuestCompletedPayload {
  questRunId: string;
  questId: string;
  completedAt: number;
  xpGained: number;
  participantResults: {
    userId: string;
    status: 'completed' | 'failed';
    xpGained: number;
  }[];
}

export interface QuestFailedPayload {
  questRunId: string;
  questId: string;
  failedAt: number;
  reason: string;
  participantResults: {
    userId: string;
    status: 'completed' | 'failed';
  }[];
}

export interface ParticipantJoinedPayload {
  questRunId: string;
  userId: string;
  userName: string;
  characterType?: CharacterType;
  joinedAt: number;
}

export interface ParticipantLeftPayload {
  questRunId: string;
  userId: string;
  leftAt: number;
  reason?: string;
}

export interface ParticipantReadyPayload {
  questRunId: string;
  userId: string;
  isReady: boolean;
  readyAt?: number;
}

export interface ParticipantProgressPayload {
  questRunId: string;
  userId: string;
  progress: number; // 0-100
  milestone?: string;
  timestamp: number;
}

export interface InvitationAcceptedPayload {
  invitationId: string;
  userId: string;
  acceptedAt: number;
}

export interface InvitationDeclinedPayload {
  invitationId: string;
  userId: string;
  declinedAt: number;
}

export interface InvitationExpiredPayload {
  invitationId: string;
  expiredAt: number;
}

// Complete WebSocket Events Interface
export interface TypedWebSocketEvents {
  // Lobby events
  'lobby:join': (data: LobbyJoinPayload) => void;
  'lobby:leave': (data: LobbyLeavePayload) => void;
  'lobby:participant-joined': (data: LobbyParticipantJoinedPayload) => void;
  'lobby:participant-updated': (data: LobbyParticipantUpdatedPayload) => void;
  'lobby:invitation-response': (data: LobbyInvitationResponsePayload) => void;
  'lobby:ready-status': (data: LobbyReadyStatusPayload) => void;
  'lobby:ready': (data: LobbyReadyPayload) => void;
  'lobby:unready': (data: LobbyUnreadyPayload) => void;
  'lobby:quest-created': (data: LobbyQuestCreatedPayload) => void;

  // Quest events
  questInvitation: (data: QuestInvitationPayload) => void;
  questStarted: (data: QuestStartedPayload) => void;
  questCompleted: (data: QuestCompletedPayload) => void;
  questFailed: (data: QuestFailedPayload) => void;

  // Participant events
  participantJoined: (data: ParticipantJoinedPayload) => void;
  participantLeft: (data: ParticipantLeftPayload) => void;
  participantReady: (data: ParticipantReadyPayload) => void;
  participantProgress: (data: ParticipantProgressPayload) => void;

  // Invitation events
  invitationAccepted: (data: InvitationAcceptedPayload) => void;
  invitationDeclined: (data: InvitationDeclinedPayload) => void;
  invitationExpired: (data: InvitationExpiredPayload) => void;
}
