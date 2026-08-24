"use client";

import { useI18n } from "@/lib/i18n/context";
import { mediaUrl } from "@/lib/api/client";
import { useChatController } from "./useChatController";
import type { Message, PublicUser, Section } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Image as ImageIcon,
  Film,
  Search,
  UserPlus,
  Check,
  X,
  MessageCircle,
  Clock,
  Users,
  MailOpen,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function previewText(
  message: Message | undefined,
  t: (k: string) => string,
): string {
  if (!message) return "";
  if (message.kind === "text") return message.content;
  if (message.kind === "image") return t("chat.uploadImage");
  return t("chat.uploadVideo");
}

export function ChatApp({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const { t, locale } = useI18n();
  const {
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
  } = useChatController(userId, displayName);

  return (
    <div className="flex h-full bg-white/70 dark:bg-slate-950/40">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex w-full flex-col border-r border-slate-200/70 dark:border-slate-800 md:w-72 md:shrink-0",
          peer ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-slate-200/70 p-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("chat.title")}
            </h2>
          </div>
          <Tabs
            value={section}
            onValueChange={(v) => setSection(v as Section)}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-4 gap-1">
              <TabsTrigger
                value="conversations"
                className="flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium"
                title={t("chat.conversations")}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {t("chat.conversations")}
                </span>
                <span className="sr-only lg:hidden">
                  {t("chat.conversations")}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium"
                title={t("chat.friends")}
              >
                <Users className="h-4 w-4" />
                <span className="hidden lg:inline">{t("chat.friends")}</span>
                <span className="sr-only lg:hidden">{t("chat.friends")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="invites"
                className="relative flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium"
                title={t("chat.invites")}
              >
                <MailOpen className="h-4 w-4" />
                {incomingInvites.length > 0 ? (
                  <span
                    className="absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ background: "var(--accent-spot, #0ea5e9)" }}
                  >
                    {incomingInvites.length}
                  </span>
                ) : null}
                <span className="hidden lg:inline">{t("chat.invites")}</span>
                <span className="sr-only lg:hidden">{t("chat.invites")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="discover"
                className="flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium"
                title={t("chat.discover")}
              >
                <Compass className="h-4 w-4" />
                <span className="hidden lg:inline">{t("chat.discover")}</span>
                <span className="sr-only lg:hidden">{t("chat.discover")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {section === "conversations" ? (
              conversations.length === 0 ? (
                <EmptyHint
                  icon={<MessageCircle className="h-7 w-7" />}
                  text={t("chat.noConversations")}
                />
              ) : (
                <ul className="space-y-1">
                  {conversations.map((c) => (
                    <ConversationRow
                      key={c.peer.id}
                      peer={c.peer}
                      preview={previewText(c.lastMessage, t)}
                      time={formatTime(c.lastMessage.createdAt)}
                      unread={c.unread}
                      isFriend={c.isFriend}
                      active={c.peer.id === peerId}
                      online={Boolean(presence[c.peer.id])}
                      onClick={() => void openConversation(c.peer.id)}
                    />
                  ))}
                </ul>
              )
            ) : null}

            {section === "friends" ? (
              friends.length === 0 ? (
                <EmptyHint
                  icon={<Users className="h-7 w-7" />}
                  text={t("chat.noFriends")}
                />
              ) : (
                <ul className="space-y-1">
                  {friends.map((f) => (
                    <ConversationRow
                      key={f.id}
                      peer={f}
                      preview={f.bio || "@" + f.username}
                      time=""
                      unread={0}
                      isFriend
                      active={f.id === peerId}
                      online={Boolean(presence[f.id])}
                      onClick={() => void openConversation(f.id)}
                    />
                  ))}
                </ul>
              )
            ) : null}

            {section === "invites" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setInviteScope("incoming")}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 font-medium transition",
                      inviteScope === "incoming"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                  >
                    {t("chat.invites")} ({incomingInvites.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteScope("sent")}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 font-medium transition",
                      inviteScope === "sent"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                  >
                    {locale === "zh"
                      ? "已发送"
                      : locale === "fr"
                        ? "Envoyees"
                        : "Sent"}{" "}
                    ({sentInvites.length})
                  </button>
                </div>

                {inviteScope === "incoming" ? (
                  incomingInvites.length === 0 ? (
                    <EmptyHint
                      icon={<MailOpen className="h-7 w-7" />}
                      text={t("chat.noInvites")}
                    />
                  ) : (
                    <ul className="space-y-1">
                      {incomingInvites.map((inv) => (
                        <li
                          key={inv.id}
                          className="rounded-xl border border-slate-200/70 p-2.5 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="size-9">
                              <AvatarFallback
                                style={{ background: inv.user.avatarColor }}
                                className="text-xs font-semibold text-white"
                              >
                                {initials(inv.user.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {inv.user.displayName}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                @{inv.user.username}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 flex-1 gap-1 text-xs"
                              style={{
                                background: "var(--accent-spot, #0ea5e9)",
                                color: "white",
                              }}
                              onClick={() =>
                                void respondInvite(inv.id, true, inv.user.id)
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t("chat.accept")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 gap-1 text-xs"
                              onClick={() =>
                                void respondInvite(inv.id, false, inv.user.id)
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                              {t("chat.reject")}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : sentInvites.length === 0 ? (
                  <EmptyHint
                    icon={<MailOpen className="h-7 w-7" />}
                    text={t("chat.noInvites")}
                  />
                ) : (
                  <ul className="space-y-1">
                    {sentInvites.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-200/70 p-2.5 dark:border-slate-800"
                      >
                        <Avatar className="size-9">
                          <AvatarFallback
                            style={{ background: inv.user.avatarColor }}
                            className="text-xs font-semibold text-white"
                          >
                            {initials(inv.user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {inv.user.displayName}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            @{inv.user.username}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px]"
                        >
                          <Clock className="h-3 w-3" />
                          {locale === "zh"
                            ? "待处理"
                            : locale === "fr"
                              ? "En attente"
                              : "Pending"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {section === "discover" ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={usersQuery}
                    onChange={(e) => setUsersQuery(e.target.value)}
                    placeholder={t("chat.searchUsers")}
                    className="h-9 pl-8"
                  />
                </div>
                {allUsers.length === 0 ? (
                  <EmptyHint
                    icon={<Search className="h-7 w-7" />}
                    text={t("chat.noUsers")}
                  />
                ) : (
                  <ul className="space-y-1">
                    {allUsers.map((u) => {
                      const isFriend = friends.some((f) => f.id === u.id);
                      const pending = sentInvites.some(
                        (i) => i.user.id === u.id,
                      );
                      const hasConvo = conversations.some(
                        (c) => c.peer.id === u.id,
                      );
                      return (
                        <li
                          key={u.id}
                          className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 hover:bg-white/60 dark:hover:bg-slate-900/40"
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            onClick={() => void openConversation(u.id)}
                          >
                            <Avatar className="size-9">
                              <AvatarFallback
                                style={{ background: u.avatarColor }}
                                className="text-xs font-semibold text-white"
                              >
                                {initials(u.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {u.displayName}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                @{u.username}
                              </p>
                            </div>
                          </button>
                          {isFriend ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px]"
                            >
                              <Check className="h-3 w-3" />
                              {locale === "zh"
                                ? "好友"
                                : locale === "fr"
                                  ? "Ami"
                                  : "Friend"}
                            </Badge>
                          ) : pending ? (
                            <Badge
                              variant="outline"
                              className="gap-1 text-[10px]"
                            >
                              <Clock className="h-3 w-3" />
                              {locale === "zh"
                                ? "待处理"
                                : locale === "fr"
                                  ? "En attente"
                                  : "Pending"}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={() => void sendInvite(u.id)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              {t("chat.invite")}
                            </Button>
                          )}
                          {hasConvo ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => void openConversation(u.id)}
                              title={t("chat.conversations")}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="border-t border-slate-200/70 px-3 py-2 dark:border-slate-800">
          <p className="truncate text-[11px] text-slate-400">
            {locale === "zh"
              ? "当前用户:"
              : locale === "fr"
                ? "Utilisateur:"
                : "Signed in:"}{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {displayName}
            </span>
          </p>
        </div>
      </aside>

      {/* Main conversation */}
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          peer ? "flex" : "hidden md:flex",
        )}
      >
        {peer ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/70 p-3 dark:border-slate-800">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={closeConversation}
                aria-label={t("chat.conversations")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Avatar className="size-10">
                  <AvatarFallback
                    style={{ background: peer.avatarColor }}
                    className="text-sm font-semibold text-white"
                  >
                    {initials(peer.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-950",
                    presence[peer.id]
                      ? "bg-emerald-500"
                      : "bg-slate-300 dark:bg-slate-600",
                  )}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {peer.displayName}
                  </p>
                  {isFriendWithPeer ? (
                    <Badge
                      className="gap-1 text-[10px]"
                      style={{
                        background: "var(--accent-spot, #0ea5e9)",
                        color: "white",
                      }}
                    >
                      <Check className="h-3 w-3" />
                      {t("chat.friends")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      {locale === "zh"
                        ? "陌生人"
                        : locale === "fr"
                          ? "Inconnu"
                          : "Stranger"}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-slate-400">
                  @{peer.username}
                  {presence[peer.id]
                    ? " · " + t("chat.online")
                    : " · " + t("chat.offline")}
                </p>
              </div>
              {!isFriendWithPeer && !pendingInviteToPeer ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => void sendInvite(peer.id)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("chat.addFriend")}
                </Button>
              ) : null}
              {pendingInviteToPeer ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-3 w-3" />
                  {locale === "zh"
                    ? "待处理"
                    : locale === "fr"
                      ? "En attente"
                      : "Pending"}
                </Badge>
              ) : null}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="mx-auto flex max-w-2xl flex-col gap-2">
                {loadingMessages ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-10 w-1/2 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60",
                          i % 2 === 0 ? "self-start" : "self-end",
                        )}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
                    <MessageCircle className="h-8 w-8 opacity-40" />
                    <p className="text-sm">{t("chat.empty")}</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.fromUserId === userId;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col gap-0.5",
                          mine ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            mine
                              ? "rounded-br-sm text-white"
                              : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                          )}
                          style={
                            mine
                              ? {
                                  background: "var(--accent-spot, #0ea5e9)",
                                  color: "white",
                                }
                              : undefined
                          }
                        >
                          {m.kind === "text" ? (
                            <p className="whitespace-pre-wrap break-words">
                              {m.content}
                            </p>
                          ) : m.kind === "image" ? (
                            <img
                              src={m.mediaId ? mediaUrl(m.mediaId) : ""}
                              alt={t("chat.uploadImage")}
                              className="max-h-80 w-auto max-w-[260px] rounded-lg"
                            />
                          ) : (
                            <video
                              src={m.mediaId ? mediaUrl(m.mediaId) : ""}
                              controls
                              className="max-h-80 w-auto max-w-[280px] rounded-lg"
                            />
                          )}
                        </div>
                        <span className="px-1 text-[10px] text-slate-400">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                {peerTyping ? (
                  <div className="flex items-center gap-1.5 self-start px-1 text-xs text-slate-400">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    </span>
                    {locale === "zh"
                      ? "正在输入..."
                      : locale === "fr"
                        ? "ecrit..."
                        : "typing..."}
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Footer / input */}
            <div className="border-t border-slate-200/70 p-3 dark:border-slate-800">
              <div className="mx-auto max-w-2xl space-y-2">
                {permission && !permission.isFriend ? (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <p>{t("chat.strangerInfo")}</p>
                    {!permission.canSend ? (
                      <p className="mt-1 font-medium">
                        {t("chat.strangerLimit")}
                      </p>
                    ) : strangerRemaining !== null ? (
                      <p className="mt-1 font-medium">
                        {strangerRemaining} {t("chat.remaining")}
                      </p>
                    ) : null}
                  </div>
                ) : permission && permission.isFriend ? (
                  <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {t("chat.friendsCanShareMedia")}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  {permission && permission.isFriend ? (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 text-slate-500"
                        onClick={() => openFilePicker("image")}
                        disabled={sending}
                        title={t("chat.uploadImage")}
                        aria-label={t("chat.uploadImage")}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 text-slate-500"
                        onClick={() => openFilePicker("video")}
                        disabled={sending}
                        title={t("chat.uploadVideo")}
                        aria-label={t("chat.uploadVideo")}
                      >
                        <Film className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Textarea
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("chat.type")}
                    disabled={!canTypeMore || sending}
                    maxLength={
                      permission && !permission.isFriend
                        ? permission.strangerMaxChars
                        : undefined
                    }
                    className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className="size-9 shrink-0"
                    style={{
                      background: "var(--accent-spot, #0ea5e9)",
                      color: "white",
                    }}
                    onClick={() => void sendText()}
                    disabled={
                      sending || !canTypeMore || draft.trim().length === 0
                    }
                    aria-label={t("chat.send")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t("chat.empty")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-slate-400">
      <div className="opacity-40">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ConversationRow({
  peer,
  preview,
  time,
  unread,
  isFriend,
  active,
  online,
  onClick,
}: {
  peer: PublicUser;
  preview: string;
  time: string;
  unread: number;
  isFriend: boolean;
  active: boolean;
  online: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition",
          active
            ? "border-slate-300/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            : "border-transparent hover:bg-white/60 dark:hover:bg-slate-900/40",
        )}
      >
        <div className="relative">
          <Avatar className="size-9">
            <AvatarFallback
              style={{ background: peer.avatarColor }}
              className="text-xs font-semibold text-white"
            >
              {initials(peer.displayName)}
            </AvatarFallback>
          </Avatar>
          {online ? (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {peer.displayName}
            </span>
            {time ? (
              <span className="shrink-0 text-[10px] text-slate-400">
                {time}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {preview}
            </p>
            {isFriend ? (
              <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            ) : null}
          </div>
        </div>
        {unread > 0 ? (
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "var(--accent-spot, #0ea5e9)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </li>
  );
}
