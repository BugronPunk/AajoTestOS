"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { useClock } from "@/lib/os/useClock";
import { apiGet } from "@/lib/api/client";
import { useOsStore } from "@/lib/os/store";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, MessageCircle, UserPlus, Trophy, X, Check } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import type { Locale } from "@/lib/i18n/dictionaries";

interface Conversation {
  peer: PublicUser;
  lastMessage: {
    content: string;
    createdAt: string;
    kind: string;
  };
  unread: number;
  isFriend: boolean;
}

interface Invite {
  id: string;
  status: string;
  createdAt: string;
  direction: string;
  user: PublicUser;
}

interface Score {
  id: string;
  difficulty: "beginner" | "intermediate" | "expert";
  seconds: number;
  won: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  user: PublicUser;
}

function localeString(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";
}

function formatRelativeTime(
  iso: string | null | undefined,
  localeStr: string,
  nowLabel: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return nowLabel;
  if (diffMin < 60) return diffMin + "m";
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + "h";
  return d.toLocaleDateString(localeStr, { month: "short", day: "numeric" });
}

export function NotificationCenter({ user }: NotificationCenterProps) {
  const { t, locale } = useI18n();
  const open = useOsStore((s) => s.notificationCenterOpen);
  const setNotificationCenter = useOsStore((s) => s.setNotificationCenter);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [clearing, setClearing] = useState(false);

  const localeStr = localeString(locale);
  // Relative stamps only need minute resolution.
  const now = useClock(60_000);

  const reload = useCallback(async () => {
    const [conv, inv, sco] = await Promise.all([
      apiGet<{ conversations?: Conversation[] }>("/api/chat/conversations"),
      apiGet<{ invites?: Invite[] }>("/api/chat/invites?scope=incoming"),
      apiGet<{ scores?: Score[] }>("/api/minesweeper/scores"),
    ]);
    if (conv.ok) setConversations(conv.data.conversations ?? []);
    if (inv.ok) setInvites(inv.data.invites ?? []);
    if (sco.ok) setScores(sco.data.scores ?? []);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Guarded so a panel closed mid request does not write stale rows back in.
    let cancelled = false;
    void (async () => {
      const [conv, inv, sco] = await Promise.all([
        apiGet<{ conversations?: Conversation[] }>("/api/chat/conversations"),
        apiGet<{ invites?: Invite[] }>("/api/chat/invites?scope=incoming"),
        apiGet<{ scores?: Score[] }>("/api/minesweeper/scores"),
      ]);
      if (cancelled) return;
      if (conv.ok) setConversations(conv.data.conversations ?? []);
      if (inv.ok) setInvites(inv.data.invites ?? []);
      if (sco.ok) setScores(sco.data.scores ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotificationCenter(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setNotificationCenter]);

  const unreadConversations = conversations.filter((c) => c.unread > 0);
  const unreadTotal = unreadConversations.reduce(
    (sum, c) => sum + (c.unread > 0 ? c.unread : 0),
    0,
  );
  const latestUnread = unreadConversations[0];
  const recentScores = scores.slice(0, 3);
  const latestInvite = invites[0];
  const latestScore = recentScores[0];

  const hasContent =
    unreadTotal > 0 || invites.length > 0 || recentScores.length > 0;

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/chat/conversations", { method: "PATCH" });
      if (res.ok) {
        toast.success(t("notifications.clear"));
        await reload();
      }
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  };

  // Render user avatar initial dot is overkill; keep simple.
  void user;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-[9100] bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotificationCenter(false)}
          />
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute right-3 top-11 z-[9200] flex max-h-[calc(100vh-3.5rem)] w-[340px] flex-col rounded-2xl border border-white/50 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
            role="dialog"
            aria-label={t("notifications.title")}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("notifications.title")}
              </h3>
              <button
                onClick={() => setNotificationCenter(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mb-3 rounded-xl p-3"
              style={{
                background: "var(--accent-soft, rgba(14,165,233,0.16))",
              }}
            >
              <div className="text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {now
                  ? now.toLocaleTimeString(localeStr, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {now
                  ? now.toLocaleDateString(localeStr, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </div>
            </div>

            <ScrollArea className="-mx-1 flex-1 px-1">
              {!hasContent ? (
                <div className="px-3 py-10 text-center text-sm text-slate-400">
                  {t("notifications.empty")}
                </div>
              ) : (
                <div className="space-y-2">
                  {unreadTotal > 0 && latestUnread && (
                    <NotifCard
                      icon={<MessageCircle className="h-4 w-4" />}
                      title={t("dock.chat")}
                      description={
                        latestUnread.lastMessage
                          ? `${latestUnread.peer.displayName}: ${latestUnread.lastMessage.content.slice(0, 48)}`
                          : latestUnread.peer.displayName
                      }
                      meta={`${unreadTotal} ${t("notifications.unreadMessages")}`}
                      time={formatRelativeTime(
                        latestUnread.lastMessage?.createdAt,
                        localeStr,
                        t("notifications.now"),
                      )}
                      accent
                    />
                  )}

                  {invites.length > 0 && latestInvite && (
                    <NotifCard
                      icon={<UserPlus className="h-4 w-4" />}
                      title={t("chat.invites")}
                      description={`${latestInvite.user.displayName} · ${t("chat.invite")}`}
                      meta={`${invites.length} ${t("notifications.pendingInvites")}`}
                      time={formatRelativeTime(
                        latestInvite.createdAt,
                        localeStr,
                        t("notifications.now"),
                      )}
                    />
                  )}

                  {recentScores.length > 0 && (
                    <div className="rounded-xl bg-slate-100/60 p-3 dark:bg-slate-800/50">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                            style={{
                              background: "var(--accent-spot, #0ea5e9)",
                            }}
                          >
                            <Trophy className="h-3.5 w-3.5" />
                          </span>
                          {t("notifications.recentScores")}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatRelativeTime(
                            latestScore?.createdAt,
                            localeStr,
                            t("notifications.now"),
                          )}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {recentScores.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                          >
                            <span className="flex items-center gap-1.5">
                              {s.won ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <X className="h-3 w-3 text-rose-400" />
                              )}
                              {t("minesweeper." + s.difficulty)}
                            </span>
                            <span className="tabular-nums">{s.seconds}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {unreadTotal > 0 && (
              <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={handleClear}
                  disabled={clearing}
                >
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  {t("notifications.clear")}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface NotifCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  time: string;
  accent?: boolean;
}

function NotifCard({
  icon,
  title,
  description,
  meta,
  time,
  accent,
}: NotifCardProps) {
  return (
    <div
      className={`rounded-xl p-3 transition ${
        accent
          ? "bg-slate-100/60 dark:bg-slate-800/50"
          : "bg-slate-100/40 dark:bg-slate-800/40"
      }`}
      style={
        accent
          ? { background: "var(--accent-soft, rgba(14,165,233,0.16))" }
          : undefined
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--accent-spot, #0ea5e9)" }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </span>
            <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
              {time}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
            {description}
          </p>
          <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
