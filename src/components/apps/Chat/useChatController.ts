"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useLatestRef } from "@/lib/os/useLatestRef";
import { useSocket } from "@/lib/os/useSocket";
import { apiGet, apiSend, fileToDataUrl } from "@/lib/api/client";
import { play } from "@/lib/os/audio";
import { toast } from "sonner";
import {
  MAX_UPLOAD_BYTES,
  type Conversation,
  type Invite,
  type InviteScope,
  type Message,
  type Permission,
  type PublicUser,
  type Section,
} from "./types";

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Everything the Chat window does that is not drawing.
 *
 * The view used to hold all of this inline, which made ChatApp a 1400 line file
 * mixing server calls, socket wiring and markup in one component. Splitting the
 * controller out keeps the view declarative and makes the rules testable
 * without rendering anything.
 */
export function useChatController(userId: string, displayName: string) {
  const { t, locale } = useI18n();
  const { socket } = useSocket(userId);

  const [section, setSection] = useState<Section>("conversations");
  const [inviteScope, setInviteScope] = useState<InviteScope>("incoming");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<Invite[]>([]);
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [usersQuery, setUsersQuery] = useState("");
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);

  const [peerId, setPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Who is currently typing, so the indicator is derived rather than reset
  // by an effect on every conversation change.
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  const peer = useMemo<PublicUser | null>(() => {
    if (!peerId) return null;
    const fromConvo = conversations.find((c) => c.peer.id === peerId);
    if (fromConvo) return fromConvo.peer;
    const fromFriends = friends.find((f) => f.id === peerId);
    if (fromFriends) return fromFriends;
    const fromUsers = allUsers.find((u) => u.id === peerId);
    if (fromUsers) return fromUsers;
    const fromIncoming = incomingInvites.find((i) => i.user.id === peerId);
    if (fromIncoming) return fromIncoming.user;
    const fromSent = sentInvites.find((i) => i.user.id === peerId);
    if (fromSent) return fromSent.user;
    return null;
  }, [peerId, conversations, friends, allUsers, incomingInvites, sentInvites]);

  // True only when the person typing is the person whose thread is open.
  const peerTyping = typingFrom !== null && typingFrom === peerId;

  const peerIdRef = useLatestRef(peerId);
  const socketRef = useLatestRef(socket);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const localeStr =
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";

  const newInviteLabel =
    locale === "zh"
      ? "新邀请"
      : locale === "fr"
        ? "Nouvelle invitation"
        : "New invitation";

  const formatTime = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      const now = new Date();
      if (sameDay(d, now)) {
        return d.toLocaleTimeString(localeStr, {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return (
        d.toLocaleDateString(localeStr, { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" })
      );
    },
    [localeStr],
  );

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: Conversation[] };
      setConversations(data.conversations ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/friends", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { friends: PublicUser[] };
      setFriends(data.friends ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const refreshInvites = useCallback(async () => {
    try {
      const [inc, sent] = await Promise.all([
        fetch("/api/chat/invites?scope=incoming", { cache: "no-store" }),
        fetch("/api/chat/invites?scope=sent", { cache: "no-store" }),
      ]);
      if (inc.ok) {
        const data = (await inc.json()) as { invites: Invite[] };
        setIncomingInvites(data.invites ?? []);
      }
      if (sent.ok) {
        const data = (await sent.json()) as { invites: Invite[] };
        setSentInvites(data.invites ?? []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const refreshUsers = useCallback(async (q: string) => {
    try {
      const url = q ? `/api/users?q=${encodeURIComponent(q)}` : "/api/users";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { users: PublicUser[] };
      setAllUsers(data.users ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    const id = peerIdRef.current;
    if (!id) return;
    const result = await apiGet<{ messages: Message[] } & Permission>(
      `/api/chat/messages?peerId=${encodeURIComponent(id)}`,
    );
    if (!result.ok) return;
    const { messages: rows, ...permissionFields } = result.data;
    setMessages(rows ?? []);
    setPermission(permissionFields);
  }, []);

  const openConversation = useCallback(
    async (targetId: string) => {
      setPeerId(targetId);
      setDraft("");
      setMessages([]);
      setPermission(null);
      setLoadingMessages(true);
      const result = await apiGet<{ messages: Message[] } & Permission>(
        `/api/chat/messages?peerId=${encodeURIComponent(targetId)}`,
      );
      if (result.ok) {
        const { messages: rows, ...permissionFields } = result.data;
        setMessages(rows ?? []);
        setPermission(permissionFields);
      }
      setLoadingMessages(false);
      void refreshConversations();
    },
    [refreshConversations],
  );

  const closeConversation = useCallback(() => {
    setPeerId(null);
    setMessages([]);
    setPermission(null);
    setDraft("");
    setTypingFrom(null);
    typingSentRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  // Initial load. Inlined so nothing is written synchronously during the
  // effect, and guarded so a window closed mid flight writes nothing back.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [convos, friendRows, incoming, sent, users] = await Promise.all([
        apiGet<{ conversations: Conversation[] }>("/api/chat/conversations"),
        apiGet<{ friends: PublicUser[] }>("/api/chat/friends"),
        apiGet<{ invites: Invite[] }>("/api/chat/invites?scope=incoming"),
        apiGet<{ invites: Invite[] }>("/api/chat/invites?scope=sent"),
        apiGet<{ users: PublicUser[] }>("/api/users"),
      ]);
      if (cancelled) return;
      if (convos.ok) setConversations(convos.data.conversations ?? []);
      if (friendRows.ok) setFriends(friendRows.data.friends ?? []);
      if (incoming.ok) setIncomingInvites(incoming.data.invites ?? []);
      if (sent.ok) setSentInvites(sent.data.invites ?? []);
      if (users.ok) setAllUsers(users.data.users ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Debounced user search
  useEffect(() => {
    if (section !== "discover") return;
    const handle = setTimeout(() => {
      void refreshUsers(usersQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [usersQuery, section, refreshUsers]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onMessageIncoming = (payload: {
      fromUserId?: string;
      messageId?: string;
    }) => {
      const fromUserId = String(payload?.fromUserId ?? "");
      if (fromUserId === peerIdRef.current) {
        void refreshMessages();
      }
      void refreshConversations();
    };
    const onInviteIncoming = () => {
      void refreshInvites();
      toast(newInviteLabel);
    };
    const onInviteResolved = () => {
      void refreshFriends();
      void refreshConversations();
      void refreshInvites();
      if (peerIdRef.current) void refreshMessages();
    };
    const onTyping = (payload: { fromUserId?: string; isTyping?: boolean }) => {
      const fromUserId = String(payload?.fromUserId ?? "");
      if (fromUserId === peerIdRef.current) {
        setTypingFrom(payload?.isTyping ? fromUserId : null);
      }
    };
    const onPresence = (payload: { userId?: string; online?: boolean }) => {
      const id = String(payload?.userId ?? "");
      if (!id) return;
      setPresence((prev) => ({ ...prev, [id]: Boolean(payload?.online) }));
    };
    // Sent once on connect so the roster is correct immediately, instead of
    // staying blank until somebody else happens to connect or disconnect.
    const onPresenceSnapshot = (payload: { userIds?: string[] }) => {
      const ids = payload?.userIds ?? [];
      setPresence(Object.fromEntries(ids.map((id) => [id, true])));
    };
    socket.on("message:incoming", onMessageIncoming);
    socket.on("invite:incoming", onInviteIncoming);
    socket.on("invite:resolved", onInviteResolved);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);
    socket.on("presence:snapshot", onPresenceSnapshot);
    return () => {
      socket.off("message:incoming", onMessageIncoming);
      socket.off("invite:incoming", onInviteIncoming);
      socket.off("invite:resolved", onInviteResolved);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
      socket.off("presence:snapshot", onPresenceSnapshot);
    };
  }, [
    socket,
    refreshMessages,
    refreshConversations,
    refreshFriends,
    refreshInvites,
    newInviteLabel,
  ]);

  // Tells the previous peer we stopped typing when the conversation changes.
  useEffect(() => {
    return () => {
      if (peerId && typingSentRef.current) {
        const s = socketRef.current;
        if (s) s.emit("typing", { toUserId: peerId, isTyping: false });
      }
      typingSentRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [peerId]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, peerTyping]);

  const handleDraftChange = useCallback((value: string) => {
    setDraft(value);
    const id = peerIdRef.current;
    const s = socketRef.current;
    if (!id || !s) return;
    if (value.trim().length > 0 && !typingSentRef.current) {
      s.emit("typing", { toUserId: id, isTyping: true });
      typingSentRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (typingSentRef.current) {
        s.emit("typing", { toUserId: id, isTyping: false });
        typingSentRef.current = false;
      }
    }, 1500);
  }, []);

  const sendText = useCallback(async () => {
    const id = peerIdRef.current;
    if (!id) return;
    const content = draft.trim();
    if (!content) return;
    if (
      permission &&
      !permission.isFriend &&
      content.length > permission.strangerMaxChars
    ) {
      toast.error(t("chat.messageTooLong"));
      return;
    }
    setSending(true);
    try {
      const result = await apiSend<{ message?: Message }>(
        "/api/chat/send",
        "POST",
        { toUserId: id, content, kind: "text" },
        "chat.error.send",
      );
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      const sent = result.data.message;
      if (sent) setMessages((prev) => [...prev, sent]);
      play("messageSent");
      setDraft("");
      const s = socketRef.current;
      if (s) s.emit("typing", { toUserId: id, isTyping: false });
      typingSentRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      void refreshConversations();
      if (s && sent) {
        s.emit("message:new", { toUserId: id, messageId: sent.id });
      }
      // The stranger budget may have just run out, so permission is refreshed.
      void refreshMessages();
    } finally {
      setSending(false);
    }
  }, [draft, permission, t, refreshConversations, refreshMessages]);

  const sendMedia = useCallback(
    async (file: File) => {
      const id = peerIdRef.current;
      if (!id) return;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error(t("chat.error.mediaType"));
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(t("upload.error.tooLarge"));
        return;
      }
      const kind: "image" | "video" = isImage ? "image" : "video";
      setSending(true);
      try {
        let dataUrl: string;
        try {
          dataUrl = await fileToDataUrl(file);
        } catch {
          toast.error(t("chat.error.upload"));
          return;
        }

        // Upload first, then reference the stored asset by id. The base64 used
        // to be posted a second time as the message body, which wrote the whole
        // file into the message row as well as the media store.
        const upload = await apiSend<{ media: { id: string } }>(
          "/api/upload",
          "POST",
          { dataUrl, name: file.name },
          "chat.error.upload",
        );
        if (!upload.ok) {
          toast.error(t(upload.error));
          return;
        }

        const result = await apiSend<{ message?: Message }>(
          "/api/chat/send",
          "POST",
          { toUserId: id, kind, mediaId: upload.data.media.id },
          "chat.error.send",
        );
        if (!result.ok) {
          toast.error(t(result.error));
          return;
        }
        const sent = result.data.message;
        if (sent) setMessages((prev) => [...prev, sent]);
        void refreshConversations();
        const s = socketRef.current;
        if (s && sent) {
          s.emit("message:new", { toUserId: id, messageId: sent.id });
        }
      } finally {
        setSending(false);
      }
    },
    [t, refreshConversations],
  );

  const openFilePicker = useCallback((kind: "image" | "video") => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.kind = kind;
      fileInputRef.current.accept = kind === "image" ? "image/*" : "video/*";
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void sendMedia(file);
    },
    [sendMedia],
  );

  const sendInvite = useCallback(
    async (toUserId: string) => {
      const result = await apiSend<{ invite?: Invite }>(
        "/api/chat/invites",
        "POST",
        { toUserId },
        "chat.error.inviteSend",
      );
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      toast.success(t("chat.inviteSent"));
      void refreshInvites();
      const s = socketRef.current;
      if (s) s.emit("invite:new", { toUserId });
    },
    [refreshInvites, t],
  );

  const respondInvite = useCallback(
    async (inviteId: string, accept: boolean, otherUserId: string) => {
      const result = await apiSend<{ ok?: boolean; accepted?: boolean }>(
        "/api/chat/invites",
        "PATCH",
        { inviteId, accept },
        "chat.error.inviteRespond",
      );
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      toast.success(accept ? t("chat.accepted") : t("chat.rejected"));
      void refreshInvites();
      void refreshFriends();
      void refreshConversations();
      if (peerIdRef.current) void refreshMessages();
      const s = socketRef.current;
      if (s) s.emit("invite:responded", { toUserId: otherUserId });
    },
    [refreshInvites, refreshFriends, refreshConversations, refreshMessages, t],
  );

  // Counted per sender by the server. Deriving it from the message list here
  // counted the other person's replies against this user's own budget.
  const strangerRemaining =
    permission && !permission.isFriend ? permission.strangerRemaining : null;

  const canTypeMore =
    !!permission && (permission.isFriend || permission.canSend);

  const isFriendWithPeer =
    !!permission?.isFriend ||
    (peer ? friends.some((f) => f.id === peer.id) : false);

  const pendingInviteToPeer = peer
    ? sentInvites.find((i) => i.user.id === peer.id)
    : null;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canTypeMore && !sending && draft.trim()) {
          void sendText();
        }
      }
    },
    [canTypeMore, sending, draft, sendText],
  );

  return {
    allUsers,
    canTypeMore,
    closeConversation,
    conversations,
    draft,
    fileInputRef,
    formatTime,
    friends,
    handleDraftChange,
    handleFileChange,
    handleKeyDown,
    incomingInvites,
    inviteScope,
    isFriendWithPeer,
    loadingMessages,
    messages,
    messagesEndRef,
    openConversation,
    openFilePicker,
    peer,
    peerId,
    peerTyping,
    pendingInviteToPeer,
    permission,
    presence,
    respondInvite,
    section,
    sendInvite,
    sendText,
    sending,
    sentInvites,
    setInviteScope,
    setSection,
    setUsersQuery,
    strangerRemaining,
    usersQuery,
  };
}
