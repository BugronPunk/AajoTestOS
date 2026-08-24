export interface WallpaperOption {
  id: string;
  label: { en: string; fr: string; zh: string };
  gradient: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: "aurora",
    label: { en: "Aurora", fr: "Aurore", zh: "极光" },
    gradient:
      "radial-gradient(1200px 800px at 15% 10%, #bae6fd 0%, transparent 55%), radial-gradient(1000px 700px at 85% 20%, #ddd6fe 0%, transparent 50%), radial-gradient(1200px 900px at 50% 100%, #a7f3d0 0%, transparent 55%), linear-gradient(135deg, #f0f9ff, #f5f3ff 60%, #ecfdf5)",
  },
  {
    id: "mist",
    label: { en: "Morning Mist", fr: "Brume du matin", zh: "晨雾" },
    gradient:
      "radial-gradient(1000px 800px at 20% 30%, #e2e8f0 0%, transparent 60%), radial-gradient(900px 700px at 80% 70%, #f1f5f9 0%, transparent 55%), linear-gradient(160deg, #f8fafc, #eef2f7 70%, #e2e8f0)",
  },
  {
    id: "dawn",
    label: { en: "Soft Dawn", fr: "Aube douce", zh: "晨曦" },
    gradient:
      "radial-gradient(1000px 700px at 20% 20%, #fde68a 0%, transparent 55%), radial-gradient(900px 700px at 80% 80%, #fbcfe8 0%, transparent 50%), linear-gradient(140deg, #fffbeb, #fdf2f8 60%, #fff7ed)",
  },
  {
    id: "forest",
    label: { en: "Deep Forest", fr: "Forêt profonde", zh: "深林" },
    gradient:
      "radial-gradient(1000px 700px at 25% 25%, #bbf7d0 0%, transparent 55%), radial-gradient(900px 700px at 80% 75%, #a7f3d0 0%, transparent 50%), linear-gradient(150deg, #f0fdf4, #ecfdf5 60%, #f7fee7)",
  },
  {
    id: "peach",
    label: { en: "Peach", fr: "Pêche", zh: "蜜桃" },
    gradient:
      "radial-gradient(1000px 700px at 25% 25%, #fed7aa 0%, transparent 55%), radial-gradient(900px 700px at 80% 75%, #fecaca 0%, transparent 50%), linear-gradient(150deg, #fff7ed, #ffedd5 60%, #ffe4e6)",
  },
  {
    id: "graphite",
    label: { en: "Graphite", fr: "Graphite", zh: "石墨" },
    gradient:
      "radial-gradient(1000px 800px at 20% 20%, #334155 0%, transparent 55%), radial-gradient(900px 700px at 80% 80%, #1e293b 0%, transparent 50%), linear-gradient(160deg, #0f172a, #111827 70%, #0b1120)",
  },
];

export interface AccentOption {
  id: string;
  label: { en: string; fr: string; zh: string };
  color: string;
  soft: string;
}

export const ACCENTS: AccentOption[] = [
  {
    id: "sky",
    label: { en: "Sky", fr: "Ciel", zh: "天蓝" },
    color: "#0ea5e9",
    soft: "rgba(14,165,233,0.16)",
  },
  {
    id: "emerald",
    label: { en: "Emerald", fr: "Émeraude", zh: "翠绿" },
    color: "#10b981",
    soft: "rgba(16,185,129,0.16)",
  },
  {
    id: "amber",
    label: { en: "Amber", fr: "Ambre", zh: "琥珀" },
    color: "#f59e0b",
    soft: "rgba(245,158,11,0.16)",
  },
  {
    id: "rose",
    label: { en: "Rose", fr: "Rose", zh: "玫红" },
    color: "#f43f5e",
    soft: "rgba(244,63,94,0.16)",
  },
  {
    id: "violet",
    label: { en: "Violet", fr: "Violet", zh: "紫罗兰" },
    color: "#8b5cf6",
    soft: "rgba(139,92,246,0.16)",
  },
  {
    id: "teal",
    label: { en: "Teal", fr: "Sarcelle", zh: "青色" },
    color: "#14b8a6",
    soft: "rgba(20,184,166,0.16)",
  },
];

/** Allowlists the API validates incoming preferences against. */
export const WALLPAPER_IDS: string[] = WALLPAPERS.map((w) => w.id);
export const ACCENT_IDS: string[] = ACCENTS.map((a) => a.id);

export function wallpaperGradient(id: string): string {
  return (
    WALLPAPERS.find((w) => w.id === id)?.gradient ?? WALLPAPERS[0].gradient
  );
}

export function accentColor(id: string): AccentOption {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}
