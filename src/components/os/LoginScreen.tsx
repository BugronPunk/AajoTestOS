"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  User,
  Lock,
} from "lucide-react";
import type { Locale, PublicUser } from "@/lib/types";

interface LoginScreenProps {
  onAuthSuccess: (user: PublicUser, locale: Locale) => void;
  locale: Locale;
  isDark: boolean;
}

export function LoginScreen({
  onAuthSuccess,
  locale,
  isDark,
}: LoginScreenProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  void isDark;

  // Inline validation hints for signup
  const usernameHint = useMemo(() => {
    if (mode !== "signup" || !username) return null;
    const clean = username.trim().toLowerCase();
    if (clean.length < 3) return { ok: false, msg: "At least 3 characters" };
    if (clean.length > 20) return { ok: false, msg: "At most 20 characters" };
    if (!/^[a-z0-9_.]+$/.test(clean))
      return { ok: false, msg: "Only letters, numbers, dot, underscore" };
    return { ok: true, msg: "Looks good" };
  }, [username, mode]);

  const passwordHint = useMemo(() => {
    if (mode !== "signup" || !password) return null;
    if (password.length < 4) return { ok: false, msg: "At least 4 characters" };
    return { ok: true, msg: "Strong enough" };
  }, [password, mode]);

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    (mode === "login" || (usernameHint?.ok && passwordHint?.ok));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          username,
          password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // The API answers with a translation key, never a sentence.
        setError(
          data.error
            ? t(data.error)
            : mode === "login"
              ? t("login.error")
              : t("signup.error"),
        );
        return;
      }
      onAuthSuccess(data.user, data.locale as Locale);
    } catch {
      setError(mode === "login" ? t("login.error") : t("signup.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/60">
          {/* Logo and title */}
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-spot, #0ea5e9), color-mix(in srgb, var(--accent-spot, #0ea5e9) 55%, white))",
              }}
            >
              <span className="text-2xl font-light text-white">A</span>
            </motion.div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {mode === "login" ? t("login.welcome") : t("signup.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {mode === "login" ? t("login.subtitle") : t("signup.subtitle")}
            </p>
          </div>

          {/* Mode toggle tabs */}
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                mode === "login"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {t("login.signin")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                mode === "signup"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {t("login.create")}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Username field */}
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                {t("login.username")}
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="h-11 rounded-xl border-slate-200/80 bg-white/80 pl-10 pr-10 dark:border-slate-700 dark:bg-slate-800/60"
                  placeholder={
                    mode === "signup" ? "e.g. alex" : "your username"
                  }
                  autoFocus
                />
                {usernameHint && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameHint.ok ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    )}
                  </span>
                )}
              </div>
              {usernameHint && (
                <p
                  className={`flex items-center gap-1 text-[11px] ${
                    usernameHint.ok ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {usernameHint.msg}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                {t("login.password")}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="h-11 rounded-xl border-slate-200/80 bg-white/80 pl-10 pr-10 dark:border-slate-700 dark:bg-slate-800/60"
                  placeholder={
                    mode === "signup" ? "min 4 characters" : "your password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordHint && (
                <p
                  className={`flex items-center gap-1 text-[11px] ${
                    passwordHint.ok ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {passwordHint.msg}
                </p>
              )}
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading || !canSubmit}
              className="h-11 w-full rounded-xl text-sm font-medium shadow-sm transition active:scale-[0.98]"
              style={{
                background: "var(--accent-spot, #0ea5e9)",
                color: "white",
                opacity: loading || !canSubmit ? 0.5 : 1,
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? t("login.signin") : t("signup.confirm")}
            </Button>
          </form>

          {/* Switch mode link */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === "login" ? t("login.noAccount") : t("login.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: "var(--accent-spot, #0ea5e9)" }}
            >
              {mode === "login" ? t("login.create") : t("signup.back")}
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-500/80 dark:text-slate-400/80">
          {t("app.tagline")}
        </p>
      </motion.div>
    </div>
  );
}
