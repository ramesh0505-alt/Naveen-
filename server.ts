import express from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import type {
  RoomStatus,
  MemberRole,
  RoomInfo,
  MessageItem,
  ReplyPreview,
  CallSignalPayload,
  WebSocketClientMessage,
  WebSocketServerMessage,
  VeloraNotification,
} from "./src/types";

// Initialize VAPID Keys for Web Push
const envVapidPublic = process.env.VAPID_PUBLIC_KEY;
const envVapidPrivate = process.env.VAPID_PRIVATE_KEY;
const envVapidSubject = process.env.VAPID_SUBJECT || "mailto:notifications@velora.chat";

let vapidKeys: { publicKey: string; privateKey: string };
if (envVapidPublic && envVapidPrivate) {
  vapidKeys = { publicKey: envVapidPublic, privateKey: envVapidPrivate };
} else {
  vapidKeys = webpush.generateVAPIDKeys();
}

webpush.setVapidDetails(
  envVapidSubject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

interface StoredRoom {
  id: string;
  roomCode: string;
  pinHash: string;
  pinSalt: string;
  status: RoomStatus;
  maxMembers: number;
  ownerSessionId: string | null;
  guestSessionId: string | null;
  createdAt: number;
  expiresAt: number;
  closedAt?: number;
  defaultMessageExpiration: number; // 0 = room lifetime, -1 = burn-on-read, >0 = seconds
  reminder1hSent?: boolean;
  reminder10mSent?: boolean;
}

interface StoredSession {
  sessionId: string;
  roomCode: string;
  role: MemberRole;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
  revokedAt?: number;
}

interface SocketClient {
  ws: WebSocket;
  roomCode: string;
  role: MemberRole;
  sessionId: string;
  isAlive: boolean;
  isVisible: boolean;
  activeScreen: string;
}

interface StoredPushSubscription {
  id: string;
  sessionId: string;
  roomCode: string;
  role: MemberRole;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  subscription: webpush.PushSubscription;
  createdAt: number;
  lastUsedAt: number;
  revokedAt?: number;
  preferences?: {
    enabled?: boolean;
    messagePreviews?: boolean;
    voiceMessages?: boolean;
    audioCalls?: boolean;
    roomActivity?: boolean;
  };
}

// In-memory data storage
const rooms = new Map<string, StoredRoom>(); // keyed by roomCode
const sessions = new Map<string, StoredSession>(); // keyed by sessionId
const messages = new Map<string, MessageItem[]>(); // keyed by roomCode
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>(); // keyed by ip_roomCode
const activeSockets = new Map<WebSocket, SocketClient>();
const pushSubscriptions = new Map<string, StoredPushSubscription>(); // keyed by subscription endpoint

// Helper to determine if recipient is actively in the chat view with visible window
function isRecipientActivelyViewing(roomCode: string, recipientRole: MemberRole): boolean {
  const normalizedCode = normalizeRoomCode(roomCode);
  for (const [ws, client] of activeSockets.entries()) {
    if (
      normalizeRoomCode(client.roomCode) === normalizedCode &&
      client.role === recipientRole &&
      ws.readyState === WebSocket.OPEN &&
      client.isVisible &&
      client.activeScreen === "CHAT"
    ) {
      return true;
    }
  }
  return false;
}

// Notification Dispatcher
async function sendVeloraNotification(
  roomCode: string,
  senderRole: MemberRole | null,
  notification: VeloraNotification,
  excludeSessionId?: string,
  options?: {
    previewText?: string;
    forcePush?: boolean;
  }
) {
  const normalizedCode = normalizeRoomCode(roomCode);
  const room = findRoom(normalizedCode);
  if (!room || room.status === "EXPIRED" || room.status === "CLOSED") {
    return;
  }

  const now = Date.now();
  const eventId = notification.id || `evt_${now}_${crypto.randomBytes(4).toString("hex")}`;
  const enrichedNotification: VeloraNotification = {
    ...notification,
    id: eventId,
  };

  // 1. Broadcast over WebSocket to any active connections
  broadcastToRoom(normalizedCode, {
    type: "notification:event",
    notification: enrichedNotification,
  });

  // Determine recipient role
  const recipientRole: MemberRole | null =
    senderRole === "owner" ? "guest" : senderRole === "guest" ? "owner" : null;

  // 2. Check if recipient is actively in foreground chat view
  const isViewingForeground = recipientRole ? isRecipientActivelyViewing(normalizedCode, recipientRole) : false;

  // If actively viewing chat in foreground, skip background system push
  if (isViewingForeground && !options?.forcePush) {
    return;
  }

  // 3. Dispatch Web Push to backgrounded/closed devices
  for (const [endpointKey, subRecord] of pushSubscriptions.entries()) {
    if (
      normalizeRoomCode(subRecord.roomCode) === normalizedCode &&
      (!excludeSessionId || subRecord.sessionId !== excludeSessionId) &&
      (!recipientRole || subRecord.role === recipientRole) &&
      !subRecord.revokedAt
    ) {
      // Check user preferences
      const prefs = subRecord.preferences;
      if (prefs) {
        if (prefs.enabled === false) continue;
        if (notification.type === "VOICE" && prefs.voiceMessages === false) continue;
        if ((notification.type === "CALL" || notification.type === "MISSED_CALL") && prefs.audioCalls === false) continue;
        if ((notification.type === "ROOM_JOINED" || notification.type === "PARTICIPANT_LEFT" || notification.type === "ROOM_EXPIRING") && prefs.roomActivity === false) continue;
      }

      // Privacy-first title & body construction
      let pushTitle = "VELORA";
      let pushBody = "New message\nPrivate Space";

      if (notification.type === "MESSAGE") {
        if (prefs?.messagePreviews && options?.previewText) {
          const cleanSnippet = options.previewText.replace(/\n+/g, " ").trim();
          pushBody = `New message\n"${cleanSnippet.length > 60 ? cleanSnippet.slice(0, 60) + '...' : cleanSnippet}"`;
        } else {
          pushBody = "New message\nPrivate Space";
        }
      } else if (notification.type === "VOICE") {
        if (prefs?.messagePreviews && notification.duration) {
          const mins = Math.floor(notification.duration / 60);
          const secs = Math.floor(notification.duration % 60);
          pushBody = `New voice message · ${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
          pushBody = "New voice message\nPrivate Space";
        }
      } else if (notification.type === "CALL") {
        pushBody = "Incoming private audio call";
      } else if (notification.type === "MISSED_CALL") {
        pushBody = "Missed audio call\nPrivate Space";
      } else if (notification.type === "ROOM_JOINED") {
        pushBody = "Private Space · Your private room is now connected.";
      } else if (notification.type === "PARTICIPANT_LEFT") {
        pushBody = "Private Space · The other participant has left the room.";
      } else if (notification.type === "ROOM_EXPIRING") {
        pushBody = notification.body || "Private Space is expiring soon.";
      } else {
        pushBody = notification.body || "New update in your private space";
      }

      const pushPayload = JSON.stringify({
        eventId,
        type: notification.type,
        title: pushTitle,
        body: pushBody,
        roomCode: normalizedCode,
        messageId: notification.messageId,
        callId: notification.callId,
        expiresAt: notification.expiresAt,
        timestamp: notification.timestamp || now,
        actionUrl: `/?room=${encodeURIComponent(normalizedCode)}${notification.messageId ? `&msgId=${encodeURIComponent(notification.messageId)}` : ""}${notification.type === "CALL" ? "&call=incoming" : ""}`,
      });

      try {
        subRecord.lastUsedAt = now;
        await webpush.sendNotification(subRecord.subscription, pushPayload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription revoked/expired -> drop from registry
          pushSubscriptions.delete(endpointKey);
        } else {
          console.warn("Web push delivery notice:", err.message || err);
        }
      }
    }
  }
}

// Cryptographic helpers
function normalizeRoomCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

function findRoom(rawCode: string): StoredRoom | undefined {
  if (!rawCode) return undefined;
  const normalized = normalizeRoomCode(rawCode);
  const direct = rooms.get(rawCode) || rooms.get(normalized);
  if (direct) return direct;
  for (const [key, room] of rooms.entries()) {
    if (key.toUpperCase() === normalized) {
      return room;
    }
  }
  return undefined;
}

function generateRoomCode(): string {
  // Use clear, unambiguous uppercase alphanumeric characters (no 0/O, 1/I, l)
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

function generatePin(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

function hashPin(pin: string, salt: string): string {
  return crypto.createHash("sha256").update(pin + salt).digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function cleanupExpiredData() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    // Check 1h & 10m expiration reminders
    if (room.status === "ACTIVE" || room.status === "WAITING") {
      const remainingMs = room.expiresAt - now;
      if (remainingMs > 0 && remainingMs <= 60 * 60 * 1000 && !room.reminder1hSent) {
        room.reminder1hSent = true;
        const minutes = Math.round(remainingMs / 60000);
        sendVeloraNotification(code, null, {
          id: `exp-1h-${code}`,
          type: "ROOM_EXPIRING",
          title: "VELORA",
          body: `Private Space expires in ${minutes} minutes.`,
          roomCode: code,
          timestamp: now,
          expiresAt: room.expiresAt,
          read: false,
        });
        broadcastToRoom(code, {
          type: "room:expiring",
          minutesRemaining: minutes,
          expiresAt: room.expiresAt,
        });
      } else if (remainingMs > 0 && remainingMs <= 10 * 60 * 1000 && !room.reminder10mSent) {
        room.reminder10mSent = true;
        const minutes = Math.round(remainingMs / 60000);
        sendVeloraNotification(code, null, {
          id: `exp-10m-${code}`,
          type: "ROOM_EXPIRING",
          title: "VELORA",
          body: `Private Space expires in ${minutes} minutes.`,
          roomCode: code,
          timestamp: now,
          expiresAt: room.expiresAt,
          read: false,
        });
        broadcastToRoom(code, {
          type: "room:expiring",
          minutesRemaining: minutes,
          expiresAt: room.expiresAt,
        });
      }
    }

    if (room.expiresAt <= now && room.status !== "EXPIRED" && room.status !== "CLOSED") {
      room.status = "EXPIRED";
      room.closedAt = now;

      // Broadcast and push expiry
      sendVeloraNotification(code, null, {
        id: `expired-${code}`,
        type: "ROOM_EXPIRED",
        title: "VELORA",
        body: "Private Space expired · This room is no longer available.",
        roomCode: code,
        timestamp: now,
        read: false,
      });

      broadcastToRoom(code, { type: "room:expired" });

      // Clean up messages and media
      messages.delete(code);

      // Invalidate and remove all push subscriptions for this expired room
      for (const [subKey, sub] of pushSubscriptions.entries()) {
        if (sub.roomCode.toUpperCase() === code.toUpperCase()) {
          pushSubscriptions.delete(subKey);
        }
      }
    }
  }
}

// Helper to check if a message is expired according to current time
function isMessageExpiredServer(msg: MessageItem, now = Date.now()): boolean {
  if (msg.isBurned) return true;
  if (typeof msg.expiresAt === "number" && msg.expiresAt <= now) return true;
  if (
    msg.burnOnRead &&
    msg.viewedAt &&
    typeof msg.burnAfterSeconds === "number" &&
    msg.burnAfterSeconds > 0 &&
    msg.viewedAt + msg.burnAfterSeconds * 1000 <= now
  ) {
    return true;
  }
  if (
    !msg.burnOnRead &&
    typeof msg.burnAfterSeconds === "number" &&
    msg.burnAfterSeconds > 0 &&
    msg.createdAt + msg.burnAfterSeconds * 1000 <= now
  ) {
    return true;
  }
  return false;
}

// Compute safe reply preview that never leaks expired content
function resolveSafeReplyPreview(
  roomCode: string,
  replyToMessageId: string,
  now = Date.now()
): ReplyPreview {
  const roomMessages = messages.get(roomCode) || [];
  const target = roomMessages.find((m) => m.id === replyToMessageId);

  if (!target || isMessageExpiredServer(target, now)) {
    return {
      messageId: replyToMessageId,
      senderRole: 'owner',
      type: 'TEXT',
      previewText: 'Original message expired',
      isUnavailable: true,
    };
  }

  let previewText: string | undefined = undefined;
  if (target.type === 'TEXT') {
    // Truncate to maximum 120 chars for quoted preview
    previewText = target.textContent ? target.textContent.slice(0, 120) : undefined;
  } else if (target.type === 'VOICE') {
    previewText = 'Voice message';
  } else if (target.type === 'IMAGE') {
    previewText = 'Photo';
  }

  return {
    messageId: target.id,
    senderRole: target.senderRole,
    type: target.type,
    previewText,
    duration: target.duration,
    isUnavailable: false,
  };
}

// Clean up expired messages for a specific room
function cleanupRoomMessages(roomCode: string, now = Date.now()): boolean {
  const roomMessages = messages.get(roomCode);
  if (!roomMessages || roomMessages.length === 0) return false;

  let hasChanges = false;
  for (const msg of roomMessages) {
    if (msg.isBurned) continue;

    let shouldBurn = false;

    // 1. Check fixed absolute expiration timestamp
    if (msg.expiresAt && msg.expiresAt <= now) {
      shouldBurn = true;
    }

    // 2. Check burn-after-reading timer (calculated from when viewed)
    if (
      msg.burnOnRead &&
      msg.viewedAt &&
      typeof msg.burnAfterSeconds === "number" &&
      msg.burnAfterSeconds > 0 &&
      msg.viewedAt + msg.burnAfterSeconds * 1000 <= now
    ) {
      shouldBurn = true;
    }

    // 3. Fallback: if burnAfterSeconds was set on non-burn-on-read message
    if (
      !msg.burnOnRead &&
      typeof msg.burnAfterSeconds === "number" &&
      msg.burnAfterSeconds > 0 &&
      msg.createdAt + msg.burnAfterSeconds * 1000 <= now
    ) {
      shouldBurn = true;
    }

    if (shouldBurn) {
      msg.isBurned = true;
      msg.textContent = undefined;
      msg.mediaReference = undefined;
      hasChanges = true;

      broadcastToRoom(roomCode, {
        type: "message:expired",
        messageId: msg.id,
      });
      broadcastToRoom(roomCode, {
        type: "message:burned",
        messageId: msg.id,
      });
    }
  }

  if (hasChanges) {
    // Keep only active non-expired messages in memory
    const activeMessages = roomMessages.filter((m) => !m.isBurned);
    messages.set(roomCode, activeMessages);
  }
  return hasChanges;
}

// Check and auto-burn/delete individual messages with expiration timers
function cleanupExpiredMessages() {
  const now = Date.now();
  for (const roomCode of messages.keys()) {
    cleanupRoomMessages(roomCode, now);
  }
}

// Run room cleanup every 15 seconds, and message expiration cleaner every 1 second
setInterval(cleanupExpiredData, 15000);
setInterval(cleanupExpiredMessages, 1000);

function getRoomInfo(room: StoredRoom): RoomInfo {
  let currentMembers = 0;
  if (room.ownerSessionId) currentMembers++;
  if (room.guestSessionId) currentMembers++;

  return {
    id: room.id,
    roomCode: room.roomCode,
    status: room.status,
    maxMembers: room.maxMembers,
    currentMembers,
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
    closedAt: room.closedAt,
    hasOwner: Boolean(room.ownerSessionId),
    hasGuest: Boolean(room.guestSessionId),
    defaultMessageExpiration: room.defaultMessageExpiration ?? 0,
  };
}

function broadcastToRoom(roomCode: string, message: WebSocketServerMessage, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, client] of activeSockets.entries()) {
    if (client.roomCode === roomCode && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function updatePresence(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const connectedClients = Array.from(activeSockets.values()).filter(
    (c) => c.roomCode === roomCode && c.ws.readyState === WebSocket.OPEN
  );

  const hasOwnerOnline = connectedClients.some((c) => c.role === "owner");
  const hasGuestOnline = connectedClients.some((c) => c.role === "guest");

  for (const [ws, client] of activeSockets.entries()) {
    if (client.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      const isOwner = client.role === "owner";
      const otherUserOnline = isOwner ? hasGuestOnline : hasOwnerOnline;
      const otherUserRole: MemberRole | null = isOwner
        ? (room.guestSessionId ? "guest" : null)
        : "owner";

      const presenceMsg: WebSocketServerMessage = {
        type: "presence",
        otherUserOnline,
        otherUserRole,
        memberCount: (room.ownerSessionId ? 1 : 0) + (room.guestSessionId ? 1 : 0),
        roomStatus: room.status,
      };

      ws.send(JSON.stringify(presenceMsg));
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Helper middleware to validate session
  const requireSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: "Missing session token" });
    }

    const session = sessions.get(token);
    if (!session || session.revokedAt) {
      return res.status(401).json({ error: "Invalid or revoked session" });
    }

    if (session.expiresAt <= Date.now()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const room = findRoom(session.roomCode);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.status === "CLOSED" || room.status === "EXPIRED" || room.expiresAt <= Date.now()) {
      return res.status(410).json({ error: "Room is expired or closed", status: room.status });
    }

    session.lastSeenAt = Date.now();
    (req as any).session = session;
    (req as any).room = room;
    next();
  };

  // 1. Notification Subscriptions & VAPID Public Key
  app.get("/api/notifications/vapid-public-key", (req, res) => {
    return res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/notifications/subscribe", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;
    const { subscription, deviceId, preferences } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ error: "Invalid push subscription object" });
    }

    const endpointKey = subscription.endpoint;
    const now = Date.now();

    pushSubscriptions.set(endpointKey, {
      id: crypto.randomUUID(),
      sessionId: session.sessionId,
      roomCode: room.roomCode,
      role: session.role,
      deviceId: deviceId || crypto.randomUUID(),
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      subscription,
      createdAt: now,
      lastUsedAt: now,
      preferences: preferences || undefined,
    });

    return res.json({ success: true, subscribed: true });
  });

  app.post("/api/notifications/preferences", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const { preferences } = req.body;

    for (const [key, sub] of pushSubscriptions.entries()) {
      if (sub.sessionId === session.sessionId) {
        sub.preferences = preferences;
      }
    }

    return res.json({ success: true });
  });

  app.post("/api/notifications/unsubscribe", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const { deviceId } = req.body;

    for (const [key, sub] of pushSubscriptions.entries()) {
      if (sub.sessionId === session.sessionId && (!deviceId || sub.deviceId === deviceId)) {
        pushSubscriptions.delete(key);
      }
    }
    return res.json({ success: true });
  });

  app.post("/api/notifications/test", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;

    sendVeloraNotification(
      room.roomCode,
      session.role,
      {
        id: "test-" + Date.now(),
        type: "MESSAGE",
        title: "VELORA",
        body: "New message from your private space",
        roomCode: room.roomCode,
        senderRole: session.role,
        timestamp: Date.now(),
        read: false,
      },
      undefined,
      { forcePush: true, previewText: "Hey, are you free?" }
    );

    return res.json({ success: true });
  });

  // 2. Create Room
  app.post("/api/rooms", (req, res) => {
    try {
      const durationHours = req.body.durationHours !== undefined ? Number(req.body.durationHours) : undefined;
      const durationMinutes = req.body.durationMinutes !== undefined ? Number(req.body.durationMinutes) : undefined;
      const defaultMessageExpiration = Number(req.body.defaultMessageExpiration) || 0; // default 0 (room lifetime)
      const now = Date.now();
      const durationMs = durationMinutes ? durationMinutes * 60 * 1000 : (durationHours ? durationHours * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
      const expiresAt = now + durationMs;

      let roomCode = generateRoomCode();
      while (findRoom(roomCode)) {
        roomCode = generateRoomCode();
      }

      const pin = generatePin();
      const pinSalt = crypto.randomBytes(16).toString("hex");
      const pinHash = hashPin(pin, pinSalt);

      const ownerSessionId = generateSessionToken();

      const newRoom: StoredRoom = {
        id: crypto.randomUUID(),
        roomCode,
        pinHash,
        pinSalt,
        status: "WAITING",
        maxMembers: 2,
        ownerSessionId,
        guestSessionId: null,
        createdAt: now,
        expiresAt,
        defaultMessageExpiration,
      };

      const ownerSession: StoredSession = {
        sessionId: ownerSessionId,
        roomCode,
        role: "owner",
        createdAt: now,
        expiresAt,
        lastSeenAt: now,
      };

      rooms.set(roomCode, newRoom);
      sessions.set(ownerSessionId, ownerSession);
      messages.set(roomCode, []);

      return res.status(201).json({
        success: true,
        roomCode,
        pin, // Returned only upon creation to the room owner
        sessionToken: ownerSessionId,
        role: "owner",
        expiresAt,
        status: newRoom.status,
        defaultMessageExpiration,
      });
    } catch (err: any) {
      console.error("Error creating room:", err);
      return res.status(500).json({ error: "Failed to create private room" });
    }
  });

  // 2. Public Room Info
  app.get("/api/rooms/:roomCode/info", (req, res) => {
    const { roomCode } = req.params;
    const room = findRoom(roomCode);

    if (!room) {
      return res.status(404).json({ exists: false, error: "Room not found or expired." });
    }

    const now = Date.now();
    if (room.expiresAt <= now || room.status === "EXPIRED") {
      room.status = "EXPIRED";
      return res.json({
        exists: true,
        status: "EXPIRED",
        error: "This room has expired.",
      });
    }

    if (room.status === "CLOSED") {
      return res.json({
        exists: true,
        status: "CLOSED",
        error: "This room is no longer available.",
      });
    }

    return res.json({
      exists: true,
      roomInfo: getRoomInfo(room),
    });
  });

  // 3. Join Room with PIN
  app.post("/api/rooms/:roomCode/join", (req, res) => {
    const { roomCode } = req.params;
    const { pin } = req.body;

    const room = findRoom(roomCode);
    if (!room) {
      return res.status(404).json({ error: "Room not found or expired. Check room code." });
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const rateLimitKey = `${ip}_${room.roomCode}`;
    const attemptRecord = pinAttempts.get(rateLimitKey);

    const now = Date.now();
    if (attemptRecord && attemptRecord.lockedUntil > now) {
      const waitSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed attempts. Please wait ${waitSeconds}s before trying again.`,
      });
    }

    if (room.expiresAt <= now || room.status === "EXPIRED") {
      room.status = "EXPIRED";
      return res.status(410).json({ error: "This room has expired." });
    }

    if (room.status === "CLOSED") {
      return res.status(410).json({ error: "This room is no longer available." });
    }

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ error: "6-digit PIN is required." });
    }

    // Verify PIN
    const enteredHash = hashPin(pin.trim(), room.pinSalt);
    if (enteredHash !== room.pinHash) {
      const count = (attemptRecord?.count || 0) + 1;
      const lockedUntil = count >= 5 ? now + 2 * 60 * 1000 : 0;
      pinAttempts.set(rateLimitKey, { count, lockedUntil });

      const attemptsRemaining = 5 - count;
      return res.status(401).json({
        error: "Incorrect PIN. Please double-check the 6-digit code.",
        attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0,
      });
    }

    // PIN is correct - clear rate limiting
    pinAttempts.delete(rateLimitKey);

    // Reuse existing guest session or create new one (allowing seamless re-entry)
    let guestSessionId = room.guestSessionId;
    if (!guestSessionId || !sessions.has(guestSessionId)) {
      guestSessionId = generateSessionToken();
      room.guestSessionId = guestSessionId;
    }

    room.status = "ACTIVE";

    const guestSession: StoredSession = {
      sessionId: guestSessionId,
      roomCode: room.roomCode,
      role: "guest",
      createdAt: now,
      expiresAt: room.expiresAt,
      lastSeenAt: now,
    };

    sessions.set(guestSessionId, guestSession);

    // Notify room of active state
    updatePresence(room.roomCode);

    // Send notification to room owner that guest has joined
    sendVeloraNotification(
      room.roomCode,
      "guest",
      {
        id: "joined-" + Date.now(),
        type: "ROOM_JOINED",
        title: "VELORA",
        body: "Private Space · Your private room is now connected.",
        roomCode: room.roomCode,
        senderRole: "guest",
        timestamp: now,
        read: false,
      },
      guestSessionId
    );

    return res.json({
      success: true,
      roomCode: room.roomCode,
      sessionToken: guestSessionId,
      role: "guest",
      expiresAt: room.expiresAt,
      roomInfo: getRoomInfo(room),
    });
  });

  // 4. Validate Session & Get Current State
  app.get("/api/rooms/:roomCode/session", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;
    const now = Date.now();
    cleanupRoomMessages(room.roomCode, now);

    const roomMessages = (messages.get(room.roomCode) || [])
      .filter((m) => !m.isBurned)
      .map((m) => {
        let effectiveExpiresAt = m.expiresAt;
        if (typeof effectiveExpiresAt !== 'number') {
          if (m.burnOnRead) {
            if (m.viewedAt && typeof m.burnAfterSeconds === 'number' && m.burnAfterSeconds > 0) {
              effectiveExpiresAt = m.viewedAt + m.burnAfterSeconds * 1000;
            }
          } else if (typeof m.burnAfterSeconds === 'number' && m.burnAfterSeconds > 0) {
            effectiveExpiresAt = m.createdAt + m.burnAfterSeconds * 1000;
          } else {
            effectiveExpiresAt = room.expiresAt;
          }
        }

        // Dynamically compute safe reply preview to ensure expired messages are never resurrected
        let replyPreview = m.replyPreview;
        if (m.replyToMessageId) {
          replyPreview = resolveSafeReplyPreview(room.roomCode, m.replyToMessageId, now);
        }

        return {
          ...m,
          expiresAt: effectiveExpiresAt,
          replyPreview,
        };
      })
      .filter((m) => !m.expiresAt || m.expiresAt > now);

    return res.json({
      success: true,
      role: session.role,
      roomInfo: getRoomInfo(room),
      expiresAt: room.expiresAt,
      serverTime: now,
      messages: roomMessages,
    });
  });

  // 5. Update Room Message Expiration Timer
  app.post("/api/rooms/:roomCode/timer", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;
    const { defaultMessageExpiration } = req.body;

    const expirationValue = Number(defaultMessageExpiration);
    if (isNaN(expirationValue)) {
      return res.status(400).json({ error: "Invalid defaultMessageExpiration value" });
    }

    room.defaultMessageExpiration = expirationValue;

    // Broadcast room timer update to both participants
    broadcastToRoom(room.roomCode, {
      type: "room:timer_updated",
      defaultMessageExpiration: room.defaultMessageExpiration,
      updatedBy: session.role,
    });

    return res.json({
      success: true,
      defaultMessageExpiration: room.defaultMessageExpiration,
      roomInfo: getRoomInfo(room),
    });
  });

  // 6. Send Message with configurable expiration timer & burn-on-read & reply support
  app.post("/api/rooms/:roomCode/messages", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;
    const {
      type,
      textContent,
      mediaReference,
      duration,
      viewMode,
      burnAfterSeconds,
      burnOnRead,
      replyToMessageId,
    } = req.body;

    const normalizedType = (type || "").toString().toUpperCase() as "TEXT" | "VOICE" | "IMAGE";
    if (!["TEXT", "VOICE", "IMAGE"].includes(normalizedType)) {
      return res.status(400).json({ error: "Invalid message type" });
    }

    const now = Date.now();
    const roomMessages = messages.get(room.roomCode) || [];

    // Validate replyToMessageId if provided
    let validatedReplyToMessageId: string | undefined = undefined;
    let validatedReplyPreview: ReplyPreview | undefined = undefined;

    if (replyToMessageId && typeof replyToMessageId === "string") {
      const targetMsg = roomMessages.find((m) => m.id === replyToMessageId.trim());
      if (!targetMsg || isMessageExpiredServer(targetMsg, now)) {
        return res.status(400).json({ error: "This message is no longer available." });
      }
      validatedReplyToMessageId = targetMsg.id;
      validatedReplyPreview = resolveSafeReplyPreview(room.roomCode, targetMsg.id, now);
    }

    let computedBurnAfter = typeof burnAfterSeconds === "number" ? burnAfterSeconds : undefined;
    let computedBurnOnRead = Boolean(burnOnRead);

    // Apply room default if not explicitly provided
    if (computedBurnAfter === undefined && computedBurnOnRead === false) {
      if (room.defaultMessageExpiration === -1) {
        computedBurnOnRead = true;
        computedBurnAfter = 10; // 10s countdown once viewed/listened
      } else if (room.defaultMessageExpiration > 0) {
        computedBurnAfter = room.defaultMessageExpiration;
      }
    }

    // If image with viewMode specified
    if (normalizedType === "IMAGE" && viewMode && viewMode !== "standard") {
      computedBurnOnRead = true;
      if (viewMode === "timed_5") computedBurnAfter = 5;
      else if (viewMode === "timed_10") computedBurnAfter = 10;
      else if (viewMode === "timed_30") computedBurnAfter = 30;
      else if (viewMode === "timed_60") computedBurnAfter = 60;
      else if (viewMode === "view_once") computedBurnAfter = 0; // immediate upon close
    }

    let calculatedExpiresAt: number | undefined = undefined;
    if (computedBurnAfter && computedBurnAfter > 0 && !computedBurnOnRead) {
      calculatedExpiresAt = now + computedBurnAfter * 1000;
    } else if (!computedBurnOnRead) {
      calculatedExpiresAt = room.expiresAt;
    }

    const newMessage: MessageItem = {
      id: crypto.randomUUID(),
      roomCode: room.roomCode,
      senderRole: session.role,
      type: normalizedType,
      textContent: textContent ? String(textContent).slice(0, 5000) : undefined,
      mediaReference: mediaReference || undefined,
      duration: typeof duration === "number" ? duration : undefined,
      viewMode: viewMode || "standard",
      burnAfterSeconds: computedBurnAfter,
      burnOnRead: computedBurnOnRead,
      expiresAt: calculatedExpiresAt,
      isBurned: false,
      createdAt: now,
      delivered: true,
      replyToMessageId: validatedReplyToMessageId,
      replyPreview: validatedReplyPreview,
    };

    roomMessages.push(newMessage);
    messages.set(room.roomCode, roomMessages);

    // Broadcast to WebSocket connections in the room
    broadcastToRoom(room.roomCode, {
      type: "message:new",
      message: newMessage,
    });

    // Send push / background notification to peer
    const notifType = normalizedType === "VOICE" ? "VOICE" : "MESSAGE";
    const notifBody = validatedReplyToMessageId
      ? notifType === "VOICE"
        ? "New voice reply in your private space"
        : "Replied to a message in your private space"
      : notifType === "VOICE"
      ? "New voice message"
      : "New message from your private space";

    sendVeloraNotification(
      room.roomCode,
      session.role,
      {
        id: "msg-" + newMessage.id,
        type: notifType,
        title: "VELORA",
        body: notifBody,
        roomCode: room.roomCode,
        senderRole: session.role,
        messageId: newMessage.id,
        timestamp: now,
        expiresAt: newMessage.expiresAt,
        duration: newMessage.duration,
        read: false,
      },
      session.sessionId,
      { previewText: textContent }
    );

    return res.status(201).json({ success: true, message: newMessage });
  });

  // 7. Mark Message as Viewed / Trigger Self-Destruct Countdown
  app.post("/api/rooms/:roomCode/messages/:messageId/view", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;
    const { messageId } = req.params;

    const roomMessages = messages.get(room.roomCode) || [];
    const targetMsg = roomMessages.find((m) => m.id === messageId);
    if (!targetMsg) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (targetMsg.isBurned) {
      return res.json({ success: true, isBurned: true });
    }

    // Only recipient viewing triggers view timestamp for burn-on-read
    const now = Date.now();
    if (!targetMsg.viewedAt) {
      targetMsg.viewedAt = now;
      targetMsg.burnCountdownStartedAt = now;

      if (targetMsg.burnOnRead && targetMsg.burnAfterSeconds && targetMsg.burnAfterSeconds > 0) {
        targetMsg.expiresAt = now + targetMsg.burnAfterSeconds * 1000;
      }

      broadcastToRoom(room.roomCode, {
        type: "message:viewed",
        messageId,
        viewedAt: now,
        burnAfterSeconds: targetMsg.burnAfterSeconds,
        expiresAt: targetMsg.expiresAt,
      });
    }

    return res.json({
      success: true,
      messageId,
      viewedAt: targetMsg.viewedAt,
      expiresAt: targetMsg.expiresAt,
    });
  });

  // 8. Burn / Expire Disappearing Photo or Message
  app.post("/api/rooms/:roomCode/burn-photo", requireSession, (req, res) => {
    const room = (req as any).room as StoredRoom;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: "messageId is required" });
    }

    const roomMessages = messages.get(room.roomCode) || [];
    const targetMsg = roomMessages.find((m) => m.id === messageId);
    if (targetMsg) {
      targetMsg.isBurned = true;
      targetMsg.textContent = undefined;
      targetMsg.mediaReference = undefined; // Wipe media
      targetMsg.viewedAt = Date.now();

      broadcastToRoom(room.roomCode, {
        type: "message:burned",
        messageId,
      });
    }

    return res.json({ success: true });
  });

  // 9. Burn any message manually or on immediate destruction
  app.post("/api/rooms/:roomCode/burn-message", requireSession, (req, res) => {
    const room = (req as any).room as StoredRoom;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: "messageId is required" });
    }

    const roomMessages = messages.get(room.roomCode) || [];
    const targetMsg = roomMessages.find((m) => m.id === messageId);
    if (targetMsg) {
      targetMsg.isBurned = true;
      targetMsg.textContent = undefined;
      targetMsg.mediaReference = undefined;
      targetMsg.viewedAt = Date.now();

      broadcastToRoom(room.roomCode, {
        type: "message:burned",
        messageId,
      });
    }

    return res.json({ success: true });
  });

  // 7. Clear Entire Conversation
  app.post("/api/rooms/:roomCode/clear", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;

    messages.set(room.roomCode, []);

    broadcastToRoom(room.roomCode, {
      type: "message:cleared",
      clearedBy: session.role,
    });

    return res.json({ success: true, message: "Conversation cleared for both participants." });
  });

  // 8. Leave Room (Revoke this participant's session)
  app.post("/api/rooms/:roomCode/leave", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;

    session.revokedAt = Date.now();
    sessions.delete(session.sessionId);

    // Remove push subscriptions for this participant
    for (const [key, sub] of pushSubscriptions.entries()) {
      if (
        sub.sessionId === session.sessionId ||
        (sub.roomCode.toUpperCase() === room.roomCode.toUpperCase() && sub.role === session.role)
      ) {
        pushSubscriptions.delete(key);
      }
    }

    if (session.role === "owner" && room.ownerSessionId === session.sessionId) {
      room.ownerSessionId = null;
    } else if (session.role === "guest" && room.guestSessionId === session.sessionId) {
      room.guestSessionId = null;
    }

    // Close active WebSocket for this leaving session
    for (const [ws, client] of activeSockets.entries()) {
      if (client.sessionId === session.sessionId) {
        try {
          ws.send(JSON.stringify({ type: "session:revoked" }));
          ws.close();
        } catch {}
        activeSockets.delete(ws);
      }
    }

    const currentMemberCount = (room.ownerSessionId ? 1 : 0) + (room.guestSessionId ? 1 : 0);
    broadcastToRoom(room.roomCode, {
      type: "participant:left",
      role: session.role,
      memberCount: currentMemberCount,
    });
    updatePresence(room.roomCode);

    sendVeloraNotification(
      room.roomCode,
      session.role,
      {
        id: "left-" + Date.now(),
        type: "PARTICIPANT_LEFT",
        title: "VELORA",
        body: "Private Space · The other participant has left the room.",
        roomCode: room.roomCode,
        senderRole: session.role,
        timestamp: Date.now(),
        read: false,
      },
      session.sessionId
    );

    return res.json({ success: true, message: "Participant left private space." });
  });

  // 9. Close / Burn Room for Everyone
  app.post("/api/rooms/:roomCode/close", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;

    room.status = "CLOSED";
    room.closedAt = Date.now();

    // Wipe messages
    messages.delete(room.roomCode);

    // Invalidate and remove all push subscriptions for this room
    for (const [key, sub] of pushSubscriptions.entries()) {
      if (sub.roomCode.toUpperCase() === room.roomCode.toUpperCase()) {
        pushSubscriptions.delete(key);
      }
    }

    broadcastToRoom(room.roomCode, {
      type: "room:closed",
      reason: `${session.role === "owner" ? "Owner" : "Guest"} ended the private room.`,
    });

    return res.json({ success: true });
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Attach WebSocket Server
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    let clientInfo: SocketClient | null = null;

    ws.on("pong", () => {
      if (clientInfo) {
        clientInfo.isAlive = true;
      }
    });

    ws.on("message", (raw) => {
      try {
        if (clientInfo) {
          clientInfo.isAlive = true;
        }

        const msg = JSON.parse(raw.toString()) as WebSocketClientMessage;

        if (msg.type === "ping") {
          if (clientInfo) clientInfo.isAlive = true;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pong", timestamp: (msg as any).timestamp }));
          }
          return;
        }

        if (msg.type === "auth") {
          const { roomCode, sessionToken } = msg;
          const session = sessions.get(sessionToken);
          const room = findRoom(roomCode);

          if (!session || !room || session.roomCode.toUpperCase() !== room.roomCode.toUpperCase() || session.expiresAt <= Date.now()) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "auth:error", message: "Invalid or expired session" }));
            }
            ws.close();
            return;
          }

          if (room.status === "CLOSED" || room.status === "EXPIRED") {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "auth:error", message: "Room is no longer active" }));
            }
            ws.close();
            return;
          }

          // Clean up any stale sockets for this session
          for (const [oldWs, oldClient] of activeSockets.entries()) {
            if (oldClient.sessionId === sessionToken && oldWs !== ws) {
              activeSockets.delete(oldWs);
              try {
                oldWs.close();
              } catch {}
            }
          }

          clientInfo = {
            ws,
            roomCode,
            role: session.role,
            sessionId: sessionToken,
            isAlive: true,
            isVisible: true,
            activeScreen: "CHAT",
          };

          activeSockets.set(ws, clientInfo);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "auth:success",
                role: session.role,
                roomInfo: getRoomInfo(room),
              })
            );
          }

          updatePresence(roomCode);
          return;
        }

        if (!clientInfo) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
          }
          return;
        }

        if (msg.type === "visibility") {
          clientInfo.isVisible = Boolean(msg.isVisible);
          if (msg.activeScreen) {
            clientInfo.activeScreen = String(msg.activeScreen);
          }
          return;
        }

        if (msg.type === "typing") {
          broadcastToRoom(
            clientInfo.roomCode,
            {
              type: "typing",
              senderRole: clientInfo.role,
              isTyping: Boolean(msg.isTyping),
            },
            ws
          );
          return;
        }

        if (msg.type === "signal") {
          const payload = msg.payload;
          // Forward WebRTC signal to the other participant in the same room
          broadcastToRoom(
            clientInfo.roomCode,
            {
              type: "signal",
              payload: {
                ...payload,
                senderRole: clientInfo.role,
                roomCode: clientInfo.roomCode,
              },
            },
            ws
          );

          if (payload.type === "call:initiate" || payload.type === "call:offer") {
            sendVeloraNotification(
              clientInfo.roomCode,
              clientInfo.role,
              {
                id: "call-" + Date.now(),
                type: "CALL",
                title: "VELORA",
                body: "Incoming audio call · Tap to answer",
                roomCode: clientInfo.roomCode,
                senderRole: clientInfo.role,
                timestamp: Date.now(),
                read: false,
              },
              clientInfo.sessionId,
              { forcePush: true }
            );
          } else if (payload.type === "call:end" || payload.type === "call:busy" || payload.type === "call:reject") {
            if ((payload as any).wasMissed) {
              sendVeloraNotification(
                clientInfo.roomCode,
                clientInfo.role,
                {
                  id: "missed-" + Date.now(),
                  type: "MISSED_CALL",
                  title: "VELORA",
                  body: "Missed audio call · Private Space",
                  roomCode: clientInfo.roomCode,
                  senderRole: clientInfo.role,
                  timestamp: Date.now(),
                  read: false,
                },
                clientInfo.sessionId
              );
            }
          }
          return;
        }
      } catch (e) {
        console.error("Error processing websocket message:", e);
      }
    });

    ws.on("close", () => {
      if (clientInfo) {
        const roomCode = clientInfo.roomCode;
        activeSockets.delete(ws);
        updatePresence(roomCode);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket client error:", err);
    });
  });

  // WebSocket Heartbeat / Keep-alive (30s check interval)
  const interval = setInterval(() => {
    for (const [ws, client] of activeSockets.entries()) {
      if (!client.isAlive) {
        activeSockets.delete(ws);
        try {
          ws.terminate();
        } catch {}
        updatePresence(client.roomCode);
        continue;
      }
      client.isAlive = false;
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          activeSockets.delete(ws);
        }
      } catch {
        activeSockets.delete(ws);
      }
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  // Mount Vite middleware for dev or serve static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Private Two-Person Messenger server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
