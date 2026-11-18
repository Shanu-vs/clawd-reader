// Theme definitions. Each theme sets CSS variables for the UI and the colors the wallpaper uses.
import type { WallpaperStyle } from "./settings";

export type ThemeFamily = "paper" | "night" | "pixel" | "contrast";

export interface Theme {
  id: string;
  name: string;
  /** Group shown as one card in settings; its members are the colour variations. */
  family: ThemeFamily;
  /** Short name inside the family's colour row. */
  variant: string;
  mode: "light" | "dark";
  /** Wallpaper that goes with this theme; picking the theme switches to it. */
  wallpaper?: WallpaperStyle;
  vars: {
    bg: string; // wallpaper background
    text: string;
    muted: string;
    heading: string;
    link: string;
    accent: string;
    border: string;
    panel: string; // toolbar / panels
    backdrop: string; // reading column color as "r, g, b" (opacity comes from settings)
    codeBg: string;
    quoteBar: string;
    star: string; // default star color
    starGlow: string; // glow / shooting star color
  };
}

export const THEMES: Theme[] = [
  {
    id: "paper",
    name: "Paper",
    family: "paper",
    variant: "White",
    mode: "light",
    vars: {
      bg: "#eef0f4", text: "#24262b", muted: "#686c76", heading: "#14161a", link: "#2a5db0",
      accent: "#2a5db0", border: "rgba(20,22,26,0.12)", panel: "rgba(250,251,253,0.86)",
      backdrop: "255, 255, 255", codeBg: "rgba(20,22,26,0.05)", quoteBar: "#c5cad4",
      star: "#7d8aa8", starGlow: "#4a6cc2",
    },
  },
  {
    id: "sepia",
    name: "Sepia",
    family: "paper",
    variant: "Sepia",
    mode: "light",
    vars: {
      bg: "#e9dfcb", text: "#3d3224", muted: "#7a6a55", heading: "#2b2217", link: "#8a4b1c",
      accent: "#a0612b", border: "rgba(60,40,20,0.15)", panel: "rgba(246,239,225,0.88)",
      backdrop: "248, 241, 227", codeBg: "rgba(60,40,20,0.06)", quoteBar: "#cdb994",
      star: "#a0815a", starGlow: "#c27a2e",
    },
  },
  {
    id: "sage",
    name: "Sage",
    family: "paper",
    variant: "Sage",
    mode: "light",
    vars: {
      bg: "#e3eae1", text: "#25302a", muted: "#64726a", heading: "#17201b", link: "#2f7a52",
      accent: "#3a8a5f", border: "rgba(20,40,28,0.13)", panel: "rgba(242,247,241,0.88)",
      backdrop: "246, 250, 244", codeBg: "rgba(20,40,28,0.05)", quoteBar: "#b8cbbd",
      star: "#7c9a86", starGlow: "#3f9a68",
    },
  },
  {
    id: "rose",
    name: "Rose",
    family: "paper",
    variant: "Rose",
    mode: "light",
    vars: {
      bg: "#f1e4e4", text: "#3a2a2d", muted: "#7e686c", heading: "#2a1b1e", link: "#a8406a",
      accent: "#c0587a", border: "rgba(60,20,30,0.13)", panel: "rgba(250,243,243,0.88)",
      backdrop: "252, 246, 246", codeBg: "rgba(60,20,30,0.05)", quoteBar: "#dcbcc3",
      star: "#a88690", starGlow: "#d0648a",
    },
  },
  {
    id: "night",
    name: "Night",
    family: "night",
    variant: "Indigo",
    mode: "dark",
    vars: {
      bg: "#0b0e17", text: "#d9dce6", muted: "#8d93a5", heading: "#f1f3f9", link: "#8fb4ff",
      accent: "#8fb4ff", border: "rgba(255,255,255,0.10)", panel: "rgba(16,20,32,0.82)",
      backdrop: "13, 17, 28", codeBg: "rgba(255,255,255,0.06)", quoteBar: "#3a4258",
      star: "#dfe4ff", starGlow: "#9fc0ff",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    family: "night",
    variant: "Ocean",
    mode: "dark",
    vars: {
      bg: "#061722", text: "#d3e6ef", muted: "#86a5b5", heading: "#eef8fc", link: "#6fd3e8",
      accent: "#4cc3dc", border: "rgba(160,220,240,0.12)", panel: "rgba(6,28,40,0.84)",
      backdrop: "7, 27, 39", codeBg: "rgba(160,220,240,0.07)", quoteBar: "#21495c",
      star: "#bfeeff", starGlow: "#5fd6ef",
    },
  },
  {
    id: "forest",
    name: "Forest",
    family: "night",
    variant: "Forest",
    mode: "dark",
    vars: {
      bg: "#0b1510", text: "#d6e4da", muted: "#8aa293", heading: "#eef6f0", link: "#93d6a6",
      accent: "#6fc58a", border: "rgba(180,230,190,0.11)", panel: "rgba(12,26,18,0.84)",
      backdrop: "13, 26, 19", codeBg: "rgba(180,230,190,0.07)", quoteBar: "#2c4a36",
      star: "#e6f6d8", starGlow: "#b9eb8f",
    },
  },
  {
    id: "midnight",
    name: "Midnight Purple",
    family: "night",
    variant: "Purple",
    mode: "dark",
    vars: {
      bg: "#100b1d", text: "#e0dbef", muted: "#9b92b5", heading: "#f5f1ff", link: "#c3a6ff",
      accent: "#a986ff", border: "rgba(210,190,255,0.11)", panel: "rgba(24,16,42,0.84)",
      backdrop: "22, 15, 38", codeBg: "rgba(210,190,255,0.07)", quoteBar: "#43365f",
      star: "#efe6ff", starGlow: "#c9a6ff",
    },
  },
  {
    id: "ember",
    name: "Ember",
    family: "night",
    variant: "Ember",
    mode: "dark",
    vars: {
      bg: "#16100c", text: "#eadccd", muted: "#a8927d", heading: "#fbefe2", link: "#ffb47a",
      accent: "#f0a060", border: "rgba(255,210,170,0.11)", panel: "rgba(32,22,16,0.86)",
      backdrop: "30, 21, 15", codeBg: "rgba(255,210,170,0.07)", quoteBar: "#5a4130",
      star: "#ffe2c4", starGlow: "#ffb070",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    family: "night",
    variant: "Graphite",
    mode: "dark",
    vars: {
      bg: "#141516", text: "#dcdcdc", muted: "#9a9a9a", heading: "#f4f4f4", link: "#a8c7fa",
      accent: "#9ab4d8", border: "rgba(255,255,255,0.10)", panel: "rgba(28,29,31,0.86)",
      backdrop: "26, 27, 29", codeBg: "rgba(255,255,255,0.06)", quoteBar: "#44474c",
      star: "#e8e8e8", starGlow: "#bcd0f0",
    },
  },
  {
    // True black for OLED screens: black pixels are switched off, so this saves battery and
    // has no glow at night. Text is soft grey (not pure white) to avoid smearing and glare.
    id: "oled",
    name: "OLED Black",
    family: "night",
    variant: "OLED",
    mode: "dark",
    vars: {
      bg: "#000000", text: "#c4c7cf", muted: "#7b808c", heading: "#e2e4ea", link: "#8fa8d8",
      accent: "#7f9ccf", border: "rgba(255,255,255,0.08)", panel: "rgba(0,0,0,0.94)",
      backdrop: "0, 0, 0", codeBg: "rgba(255,255,255,0.05)", quoteBar: "#2c3038",
      star: "#8e96a8", starGlow: "#7f9ccf",
    },
  },
  {
    id: "pixel",
    name: "Pixel Quest",
    family: "pixel",
    variant: "Pixel Quest",
    mode: "dark",
    wallpaper: "pixel",
    vars: {
      bg: "#1a1c3a", text: "#efe6cf", muted: "#b3a88c", heading: "#ffe08a", link: "#7fd3ff",
      accent: "#ffcf5c", border: "rgba(255,226,160,0.28)", panel: "rgba(24,22,48,0.94)",
      backdrop: "26, 24, 50", codeBg: "rgba(255,226,160,0.10)", quoteBar: "#ffcf5c",
      star: "#fff3c4", starGlow: "#ffcf5c",
    },
  },
  {
    id: "contrast",
    name: "High Contrast",
    family: "contrast",
    variant: "High Contrast",
    mode: "dark",
    vars: {
      bg: "#000000", text: "#ffffff", muted: "#cfcfcf", heading: "#ffffff", link: "#ffe066",
      accent: "#ffe066", border: "rgba(255,255,255,0.35)", panel: "rgba(0,0,0,0.92)",
      backdrop: "0, 0, 0", codeBg: "rgba(255,255,255,0.12)", quoteBar: "#ffffff",
      star: "#ffffff", starGlow: "#ffe066",
    },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === "night")!;
}

export const FAMILIES: { id: ThemeFamily; name: string; fallback: string }[] = [
  { id: "paper", name: "Paper", fallback: "paper" },
  { id: "night", name: "Night", fallback: "night" },
  { id: "pixel", name: "Pixel Quest", fallback: "pixel" },
  { id: "contrast", name: "High Contrast", fallback: "contrast" },
];

export const familyMembers = (f: ThemeFamily) => THEMES.filter((t) => t.family === f);

/** "Night · Ocean", or just "Paper" for a family's first variation. */
export function themeLabel(t: Theme): string {
  const fam = FAMILIES.find((f) => f.id === t.family)!;
  return familyMembers(t.family).length > 1 && fam.fallback !== t.id ? `${fam.name} · ${t.variant}` : fam.name;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  const v = theme.vars;
  const set = (k: string, val: string) => root.style.setProperty(k, val);
  set("--bg", v.bg);
  set("--text", v.text);
  set("--muted", v.muted);
  set("--heading", v.heading);
  set("--link", v.link);
  set("--accent", v.accent);
  set("--border", v.border);
  set("--panel", v.panel);
  set("--backdrop-rgb", v.backdrop);
  set("--code-bg", v.codeBg);
  set("--quote-bar", v.quoteBar);
  root.style.colorScheme = theme.mode;
}
