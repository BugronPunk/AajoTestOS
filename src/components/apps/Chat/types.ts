/** Shapes the chat API returns. Shared by the controller and the view. */

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  wallpaper: string;
  accent: string;
  language: "en" | "fr" | "zh";
  theme: "light" | "dark";
  createdAt: string;
  lastSeenAt: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  kind: "text" | "image" | "video";
  mediaId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  peer: PublicUser;
  lastMessage: Message;
  unread: number;
  isFriend: boolean;
}

export interface Invite {
  id: string;
  status: string;
  createdAt: string;
  direction: "incoming" | "sent";
  user: PublicUser;
}

export interface Permission {
  isFriend: boolean;
  canSend: boolean;
  reason?: string;
  kind: "text" | "any";
  strangerMax: number;
  strangerMaxChars: number;
  strangerRemaining: number;
}

export type Section = "conversations" | "friends" | "invites" | "discover";
export type InviteScope = "incoming" | "sent";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
