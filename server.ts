import express from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import type {
  RoomStatus,
  MemberRole,
  RoomInfo,
  MessageItem,
  CallSignalPayload,
  WebSocketClientMessage,
  WebSocketServerMessage,
} from "./src/types";

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
}

interface StoredSession {
  sessionId: string;
  roomCode: string;
  role: MemberRole;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
}

interface SocketClient {
  ws: WebSocket;
  roomCode: string;
  role: MemberRole;
  sessionId: string;
  isAlive: boolean;
}

// In-memory data storage
const rooms = new Map<string, StoredRoom>(); // keyed by roomCode
const sessions = new Map<string, StoredSession>(); // keyed by sessionId
const messages = new Map<string, MessageItem[]>(); // keyed by roomCode
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>(); // keyed by ip_roomCode
const activeSockets = new Map<WebSocket, SocketClient>();

// Cryptographic helpers
function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
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
    if (room.expiresAt <= now && room.status !== "EXPIRED" && room.status !== "CLOSED") {
      room.status = "EXPIRED";
      room.closedAt = now;

      // Broadcast to sockets
      broadcastToRoom(code, { type: "room:expired" });

      // Clean up messages and media
      messages.delete(code);
    }
  }
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
        type: "message:burned",
        messageId: msg.id,
      });
    }
  }

  if (hasChanges) {
    messages.set(roomCode, [...roomMessages]);
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
    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    if (session.expiresAt <= Date.now()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const room = rooms.get(session.roomCode);
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

  // 1. Create Room
  app.post("/api/rooms", (req, res) => {
    try {
      const durationHours = Number(req.body.durationHours) || 24; // default 24 hours
      const defaultMessageExpiration = Number(req.body.defaultMessageExpiration) || 0; // default 0 (room lifetime)
      const now = Date.now();
      const expiresAt = now + durationHours * 60 * 60 * 1000;

      let roomCode = generateRoomCode();
      while (rooms.has(roomCode)) {
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
    const room = rooms.get(roomCode);

    if (!room) {
      return res.status(404).json({ exists: false, error: "Room not found" });
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

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const rateLimitKey = `${ip}_${roomCode}`;
    const attemptRecord = pinAttempts.get(rateLimitKey);

    const now = Date.now();
    if (attemptRecord && attemptRecord.lockedUntil > now) {
      const waitSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed attempts. Please wait ${waitSeconds}s before trying again.`,
      });
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.expiresAt <= now || room.status === "EXPIRED") {
      room.status = "EXPIRED";
      return res.status(410).json({ error: "This room has expired." });
    }

    if (room.status === "CLOSED") {
      return res.status(410).json({ error: "This room is no longer available." });
    }

    if (room.guestSessionId && room.ownerSessionId) {
      return res.status(403).json({ error: "This private room is already full." });
    }

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ error: "PIN is required." });
    }

    // Verify PIN
    const enteredHash = hashPin(pin.trim(), room.pinSalt);
    if (enteredHash !== room.pinHash) {
      const count = (attemptRecord?.count || 0) + 1;
      const lockedUntil = count >= 5 ? now + 2 * 60 * 1000 : 0;
      pinAttempts.set(rateLimitKey, { count, lockedUntil });

      const attemptsRemaining = 5 - count;
      return res.status(401).json({
        error: "Incorrect PIN.",
        attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0,
      });
    }

    // PIN is correct - clear rate limiting
    pinAttempts.delete(rateLimitKey);

    // Create guest session
    const guestSessionId = generateSessionToken();
    room.guestSessionId = guestSessionId;
    room.status = "ACTIVE";

    const guestSession: StoredSession = {
      sessionId: guestSessionId,
      roomCode,
      role: "guest",
      createdAt: now,
      expiresAt: room.expiresAt,
      lastSeenAt: now,
    };

    sessions.set(guestSessionId, guestSession);

    // Notify room of active state
    updatePresence(roomCode);

    return res.json({
      success: true,
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
    cleanupRoomMessages(room.roomCode);
    const roomMessages = messages.get(room.roomCode) || [];

    return res.json({
      success: true,
      role: session.role,
      roomInfo: getRoomInfo(room),
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

  // 6. Send Message with configurable expiration timer & burn-on-read
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
    } = req.body;

    const normalizedType = (type || "").toString().toUpperCase() as "TEXT" | "VOICE" | "IMAGE";
    if (!["TEXT", "VOICE", "IMAGE"].includes(normalizedType)) {
      return res.status(400).json({ error: "Invalid message type" });
    }

    const now = Date.now();
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
    };

    const roomMessages = messages.get(room.roomCode) || [];
    roomMessages.push(newMessage);
    messages.set(room.roomCode, roomMessages);

    // Broadcast to WebSocket connections in the room
    broadcastToRoom(room.roomCode, {
      type: "message:new",
      message: newMessage,
    });

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

  // 8. Close / Leave Room
  app.post("/api/rooms/:roomCode/close", requireSession, (req, res) => {
    const session = (req as any).session as StoredSession;
    const room = (req as any).room as StoredRoom;

    room.status = "CLOSED";
    room.closedAt = Date.now();

    // Wipe messages
    messages.delete(room.roomCode);

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
          const room = rooms.get(roomCode);

          if (!session || !room || session.roomCode !== roomCode || session.expiresAt <= Date.now()) {
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
