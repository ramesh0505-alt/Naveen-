export type RoomStatus = 'WAITING' | 'ACTIVE' | 'EXPIRED' | 'CLOSED';
export type MemberRole = 'owner' | 'guest';
export type MessageType = 'TEXT' | 'VOICE' | 'IMAGE';
export type ViewMode = 'standard' | 'view_once' | 'timed_5' | 'timed_10' | 'timed_30' | 'timed_60';

export interface RoomInfo {
  id: string;
  roomCode: string;
  status: RoomStatus;
  maxMembers: number;
  currentMembers: number;
  expiresAt: number;
  createdAt: number;
  closedAt?: number;
  hasOwner: boolean;
  hasGuest: boolean;
  defaultMessageExpiration?: number; // 0 = room lifetime, -1 = burn-on-read, >0 = seconds (e.g. 10, 60, 300, 3600, 86400)
}

export interface SessionData {
  sessionId: string;
  roomCode: string;
  role: MemberRole;
  expiresAt: number;
  roomStatus: RoomStatus;
}

export interface ReplyPreview {
  messageId: string;
  senderRole: MemberRole;
  type: MessageType;
  previewText?: string;
  duration?: number;
  isUnavailable?: boolean;
}

export interface SendMessagePayload {
  type: MessageType;
  textContent?: string;
  mediaReference?: string;
  duration?: number;
  viewMode?: ViewMode;
  burnAfterSeconds?: number;
  burnOnRead?: boolean;
  replyToMessageId?: string;
}

export interface MessageItem {
  id: string;
  roomCode: string;
  senderRole: MemberRole;
  type: MessageType;
  textContent?: string;
  mediaReference?: string; // base64 or media url
  duration?: number; // audio duration in seconds
  viewMode?: ViewMode;
  burnAfterSeconds?: number; // expiration in seconds from creation or view
  burnOnRead?: boolean; // trigger burn timer when peer reveals/plays message
  expiresAt?: number; // absolute timestamp when message self-destructs
  isBurned?: boolean;
  viewedAt?: number;
  burnCountdownStartedAt?: number;
  createdAt: number;
  delivered: boolean;
  replyToMessageId?: string;
  replyPreview?: ReplyPreview;
}

export type CallState =
  | 'IDLE'
  | 'CALLING'
  | 'RINGING'
  | 'CONNECTED'
  | 'ENDING'
  | 'ENDED'
  | 'REJECTED'
  | 'BUSY'
  | 'TIMEOUT'
  | 'DISCONNECTED'
  | 'FAILED';

export interface CallSignalPayload {
  type:
    | 'call:initiate'
    | 'call:incoming'
    | 'call:accept'
    | 'call:reject'
    | 'call:offer'
    | 'call:answer'
    | 'call:ice_candidate'
    | 'call:end'
    | 'call:busy'
    | 'call:mute_status';
  roomCode: string;
  senderRole: MemberRole;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isMuted?: boolean;
  reason?: string;
}

export type SignalingStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export type WebSocketClientMessage =
  | { type: 'auth'; roomCode: string; sessionToken: string }
  | { type: 'typing'; roomCode: string; isTyping: boolean }
  | { type: 'signal'; payload: CallSignalPayload }
  | { type: 'visibility'; isVisible: boolean; activeScreen?: string }
  | { type: 'ping'; timestamp?: number };

export type VeloraNotificationType =
  | 'MESSAGE'
  | 'VOICE'
  | 'CALL'
  | 'MISSED_CALL'
  | 'ROOM_INVITATION'
  | 'ROOM_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'ROOM_EXPIRING'
  | 'ROOM_EXPIRED'
  | 'CONNECTION';

export interface VeloraNotification {
  id: string;
  type: VeloraNotificationType;
  title: string;
  body: string;
  roomCode: string;
  senderRole?: MemberRole;
  senderName?: string;
  messageId?: string;
  callId?: string;
  timestamp: number;
  expiresAt?: number;
  read: boolean;
  actionUrl?: string;
  tag?: string;
  duration?: number; // For voice notes
}

export interface NotificationPreferences {
  enabled: boolean;
  messagePreviews: boolean;
  voiceMessages: boolean;
  audioCalls: boolean;
  roomActivity: boolean;
  sound: boolean;
  vibration: boolean;
  permissionPromptDismissed?: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type WebSocketServerMessage =
  | { type: 'auth:success'; role: MemberRole; roomInfo: RoomInfo }
  | { type: 'auth:error'; message: string }
  | { type: 'presence'; otherUserOnline: boolean; otherUserRole: MemberRole | null; memberCount: number; roomStatus: RoomStatus }
  | { type: 'participant:left'; role: MemberRole; memberCount: number }
  | { type: 'session:revoked' }
  | { type: 'typing'; senderRole: MemberRole; isTyping: boolean }
  | { type: 'message:new'; message: MessageItem }
  | { type: 'message:cleared'; clearedBy: MemberRole }
  | { type: 'message:burned'; messageId: string }
  | { type: 'message:expired'; messageId: string }
  | { type: 'message:viewed'; messageId: string; viewedAt: number; burnAfterSeconds?: number; expiresAt?: number }
  | { type: 'room:timer_updated'; defaultMessageExpiration: number; updatedBy: MemberRole }
  | { type: 'signal'; payload: CallSignalPayload }
  | { type: 'room:expiring'; hoursRemaining?: number; minutesRemaining?: number; expiresAt: number }
  | { type: 'room:expired' }
  | { type: 'room:closed'; reason?: string }
  | { type: 'notification:event'; notification: VeloraNotification }
  | { type: 'error'; message: string }
  | { type: 'pong'; timestamp?: number };
