"use client";

import { useEffect, useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Connection to the realtime gateway.
 *
 * Identity is never announced by the browser. The gateway reads the session
 * cookie during the handshake, so a client can only ever be the user it is
 * actually signed in as.
 *
 * The endpoint is the page's own origin. It used to be hardcoded to
 * http://localhost:3003, which meant a visitor reaching the app through a
 * tunnel or a deployed URL was told to open a socket against their own machine.
 * Same origin also keeps the session cookie same site, so the handshake carries
 * it without any CORS configuration.
 *
 * The override exists only for the unusual case of running the gateway on a
 * separate host; leave it unset and everything resolves relative to the page.
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

// A bounded retry budget. `Infinity` meant a browser left open against a dead
// service reconnected forever, which showed up as an endless request loop.
const RECONNECTION_ATTEMPTS = 8;

interface SocketState {
  socket: Socket | null;
  connected: boolean;
}

let state: SocketState = { socket: null, connected: false };
let ownerUserId: string | null = null;
const listeners = new Set<() => void>();

const SERVER_STATE: SocketState = { socket: null, connected: false };

function emitChange() {
  for (const listener of listeners) listener();
}

function setState(next: SocketState) {
  state = next;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SocketState {
  return state;
}

function getServerSnapshot(): SocketState {
  return SERVER_STATE;
}

/**
 * Tears the connection down. Called on sign out, because the socket used to be
 * a module singleton that was never closed: the next person to sign in on the
 * same browser inherited a live connection still bound to the previous account.
 */
export function closeSocket() {
  if (state.socket) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
  }
  ownerUserId = null;
  setState({ socket: null, connected: false });
}

function openSocket(userId: string) {
  if (ownerUserId === userId && state.socket) return;
  closeSocket();
  ownerUserId = userId;

  const socket = io(SOCKET_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionAttempts: RECONNECTION_ATTEMPTS,
    timeout: 10000,
  });

  socket.on("connect", () => setState({ socket, connected: true }));
  socket.on("disconnect", () => setState({ socket, connected: false }));
  socket.on("connect_error", () => setState({ socket, connected: false }));

  setState({ socket, connected: socket.connected });
}

export function useSocket(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      closeSocket();
      return;
    }
    openSocket(userId);
    // The connection deliberately outlives individual app windows so opening
    // and closing Chat does not churn the socket. Sign out closes it.
  }, [userId]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
