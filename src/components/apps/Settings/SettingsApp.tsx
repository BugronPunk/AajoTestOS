"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { WALLPAPERS, ACCENTS } from "@/lib/os/theme";
import type { PublicUser } from "@/lib/types";
import {
  Check,
  Loader2,
  Palette,
  User as UserIcon,
  Languages,
  Sun,
  Moon,
  Download,
  Upload,
  Database,
} from "lucide-react";

interface SettingsAppProps {
  user: PublicUser;
  onUpdateUser: (patch: Partial<PublicUser>) => void;
}

const AVATAR_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function SettingsApp({ user, onUpdateUser }: SettingsAppProps) {
  const { t, locale } = useI18n();
  const { setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportPreferences = () => {
    const prefs = {
      displayName: user.displayName,
      bio: user.bio,
      wallpaper: user.wallpaper,
      accent: user.accent,
      language: user.language,
      theme: user.theme,
      avatarColor: user.avatarColor,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(prefs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aajostest-preferences.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Preferences exported");
  };

  const importPreferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const prefs = JSON.parse(reader.result as string);
        const patchBody: Record<string, unknown> = {};
        if (typeof prefs.displayName === "string")
          patchBody.displayName = prefs.displayName;
        if (typeof prefs.bio === "string") patchBody.bio = prefs.bio;
        if (typeof prefs.wallpaper === "string")
          patchBody.wallpaper = prefs.wallpaper;
        if (typeof prefs.accent === "string") patchBody.accent = prefs.accent;
        if (
          typeof prefs.language === "string" &&
          ["en", "fr", "zh"].includes(prefs.language)
        )
          patchBody.language = prefs.language;
        if (
          typeof prefs.theme === "string" &&
          ["light", "dark"].includes(prefs.theme)
        )
          patchBody.theme = prefs.theme;
        if (typeof prefs.avatarColor === "string")
          patchBody.avatarColor = prefs.avatarColor;

        if (Object.keys(patchBody).length === 0) {
          toast.error(t("settings.error.noPrefs"));
          return;
        }
        await patch(patchBody);
        toast.success(t("settings.imported"));
      } catch {
        toast.error(t("settings.error.readFile"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(t(data.error ?? "settings.error.save"));
        return;
      }
      const updated = data.user;
      onUpdateUser({
        displayName: updated.displayName,
        bio: updated.bio,
        wallpaper: updated.wallpaper,
        accent: updated.accent,
        theme: updated.theme,
        language: updated.language,
        avatarColor: updated.avatarColor,
      });
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("settings.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () => patch({ displayName: displayName.trim(), bio });

  return (
    <div className="h-full overflow-y-auto bg-white/70 dark:bg-slate-950/40">
      <Tabs defaultValue="profile" className="h-full">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {t("settings.title")}
          </h2>
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/60">
            <TabsTrigger value="profile" className="text-xs">
              <UserIcon className="mr-1.5 h-3.5 w-3.5" />
              {t("settings.profile")}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="mr-1.5 h-3.5 w-3.5" />
              {t("settings.appearance")}
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              <Database className="mr-1.5 h-3.5 w-3.5" />
              Data
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="m-0 p-4">
          <div className="mx-auto max-w-md space-y-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white shadow-md"
                style={{ background: user.avatarColor }}
              >
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {t("settings.account")}
                </p>
                <p className="text-xs text-slate-500">@{user.username}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {t("settings.memberSince")}{" "}
                  {new Date(user.createdAt).toLocaleDateString(
                    locale === "zh"
                      ? "zh-CN"
                      : locale === "fr"
                        ? "fr-FR"
                        : "en-US",
                    { year: "numeric", month: "long" },
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.displayName")}
              </Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.bio")}
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={240}
                rows={3}
                className="resize-none rounded-xl"
              />
              <p className="text-right text-[11px] text-slate-400">
                {bio.length} / 240
              </p>
            </div>

            <div>
              <Label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.accent")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      patch({ avatarColor: color });
                    }}
                    className="relative h-8 w-8 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-slate-900"
                    style={{
                      background: color,
                      boxShadow:
                        user.avatarColor === color
                          ? "0 0 0 2px white"
                          : undefined,
                    }}
                  >
                    {user.avatarColor === color && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={saveProfile}
              disabled={saving}
              className="h-10 w-full rounded-xl"
              style={{
                background: "var(--accent-spot, #0ea5e9)",
                color: "white",
              }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.save")}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="m-0 p-4">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Languages className="h-3.5 w-3.5" />
                {t("settings.language")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["en", "fr", "zh"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => patch({ language: l })}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      user.language === l
                        ? "border-transparent text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                    style={
                      user.language === l
                        ? { background: "var(--accent-spot, #0ea5e9)" }
                        : undefined
                    }
                  >
                    {t("language." + l)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.theme")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setTheme("light");
                    patch({ theme: "light" });
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    user.theme === "light"
                      ? "border-transparent text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                  style={
                    user.theme === "light"
                      ? { background: "var(--accent-spot, #0ea5e9)" }
                      : undefined
                  }
                >
                  <Sun className="h-4 w-4" />
                  {t("settings.light")}
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    patch({ theme: "dark" });
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    user.theme === "dark"
                      ? "border-transparent text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                  style={
                    user.theme === "dark"
                      ? { background: "var(--accent-spot, #0ea5e9)" }
                      : undefined
                  }
                >
                  <Moon className="h-4 w-4" />
                  {t("settings.dark")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.wallpaper")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => patch({ wallpaper: w.id })}
                    className={`group relative h-20 overflow-hidden rounded-xl ring-2 transition ${
                      user.wallpaper === w.id
                        ? "ring-slate-900 dark:ring-white"
                        : "ring-transparent hover:ring-slate-300"
                    }`}
                    style={{ background: w.gradient }}
                    title={w.label[locale]}
                  >
                    <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/30 px-1 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                      {w.label[locale]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("settings.accent")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => patch({ accent: a.id })}
                    className="relative h-9 w-9 rounded-full transition hover:scale-110"
                    style={{ background: a.color }}
                    title={a.label[locale]}
                  >
                    {user.accent === a.id && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="m-0 p-4">
          <div className="mx-auto max-w-md space-y-5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Data and Preferences
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export your AajoTestOS preferences to a JSON file for backup, or
              import preferences from a previously exported file.
            </p>

            {/* Export */}
            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Export preferences
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Download display name, bio, wallpaper, accent, language, and
                    theme as a JSON file.
                  </p>
                </div>
                <Button
                  onClick={exportPreferences}
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>

            {/* Import */}
            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Import preferences
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Upload a previously exported JSON file to restore
                    preferences.
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Import
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={importPreferences}
                />
              </div>
            </div>

            {/* Account info */}
            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Account details
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Username</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    @{user.username}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Member since</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {new Date(user.createdAt).toLocaleDateString(
                      locale === "zh"
                        ? "zh-CN"
                        : locale === "fr"
                          ? "fr-FR"
                          : "en-US",
                      { year: "numeric", month: "long" },
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">User ID</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {user.id.slice(0, 20)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
