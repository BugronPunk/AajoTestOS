import { readFile } from "node:fs/promises";
import path from "node:path";
import { Server as SocketServer } from "socket.io";

/**
 * Realtime chat gateway.
 *
 * This used to be a separate process listening on its own port, which is what
 * broke every tunnelled or hosted deployment: a browser that loaded the app
 * from a public tunnel address was told to open a socket to
 * http://localhost:3003, meaning the visitor's own machine. It attaches to the
 * same origin as the app now, so one tunnel and one hosting port are enough.
 *
 * Sessions are read straight from the store. The gateway only ever reads, so it
 * cannot corrupt what the app writes, and the app commits with an atomic rename
 * so a reader never observes a half written file.
 */

const SESSION_COOKIE = "aajostest_session";

function dataDir() {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

/** @returns {Promise<Array<{token: string, userId: string, expiresAt: string}>>} */
async function readSessions() {
  try {
    const raw = await readFile(path.join(dataDir(), "sessions.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @returns {string | undefined} */
function parseSessionCookie(header) {
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** @returns {Promise<string | null>} */
async function userIdForHandshake(socket) {
  const token = parseSessionCookie(socket.handshake.headers.cookie ?? "");
  if (!token) return null;
  const session = (await readSessions()).find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session.userId;
}

/**
 * Attaches the gateway to an existing HTTP server.
 *
 * @param {import("node:http").Server} httpServer
 * @returns {SocketServer}
 */
export function attachChatGateway(httpServer) {
  // No CORS block. Same origin as the app, so there is no cross origin request
  // to permit and no allowlist to keep in step with the deployment URL.
  const io = new SocketServer(httpServer, {
    path: "/socket.io",
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /**
   * Identity is established once, from the signed in session, before any event
   * handler is attached.
   *
   * This replaces an `auth` event where the browser simply announced which user
   * it was. Anyone could send that event with somebody else's id, join their
   * private room and receive every message notification addressed to them.
   */
  io.use(async (socket, next) => {
    const userId = await userIdForHandshake(socket);
    if (!userId) return next(new Error("unauthorized"));
    socket.data.userId = userId;
    next();
  });

  /** @type {Map<string, Set<string>>} */
  const online = new Map();

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    socket.join(`user:${userId}`);
    io.emit("presence", { userId, online: true });

    // Sends the newcomer the current roster instead of leaving them blank until
    // somebody else happens to connect or disconnect.
    socket.emit("presence:snapshot", { userIds: [...online.keys()] });

    socket.on("message:new", (payload) => {
      const toUserId = String(payload?.toUserId ?? "");
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("message:incoming", {
        fromUserId: userId,
        messageId: payload?.messageId,
      });
    });

    socket.on("invite:new", (payload) => {
      const toUserId = String(payload?.toUserId ?? "");
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("invite:incoming", { fromUserId: userId });
    });

    socket.on("invite:responded", (payload) => {
      const toUserId = String(payload?.toUserId ?? "");
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("invite:resolved", { fromUserId: userId });
    });

    socket.on("typing", (payload) => {
      const toUserId = String(payload?.toUserId ?? "");
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("typing", {
        fromUserId: userId,
        isTyping: Boolean(payload?.isTyping),
      });
    });

    socket.on("disconnect", () => {
      const sockets = online.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        online.delete(userId);
        io.emit("presence", { userId, online: false });
      }
    });
  });

  return io;
}
