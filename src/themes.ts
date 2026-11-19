// Theme definitions. Each theme sets CSS variables for the UI and the colors the wallpaper uses.
import type { WallpaperStyle } from "./settings";

export type ThemeFamily = "plain" | "paper" | "night" | "pixel" | "contrast";

// ---- Paper textures, drawn with CSS gradients and tiny inline SVG noise (no image files). ----

/** An inline SVG as a CSS url(). */
const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

/** Tileable noise in one colour. `freq` like "0.8" or "0.04 0.6" (x y, stretched = fibres). */
function noise(freq: string, octaves: number, rgb: [number, number, number], alpha: number, size = 220): string {
  const [r, g, b] = rgb.map((c) => (c / 255).toFixed(3));
  return svg(
    size,
    size,
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/>` +
      `<feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/></filter>` +
      `<rect width='100%' height='100%' filter='url(#n)'/>`,
  );
}

/** Background layers and their sizes (same order). */
type Layer = [image: string, size: string];
const paper = (...layers: Layer[]) => ({
  image: layers.map((l) => l[0]).join(", "),
  size: layers.map((l) => l[1]).join(", "),
});

const ruled = (line: string, gap = 32): Layer => [
  `repeating-linear-gradient(180deg, transparent 0 ${gap - 1}px, ${line} ${gap - 1}px ${gap}px)`,
  "100% 100%",
];
const margin = (color: string, x = 72, double = false): Layer => [
  `linear-gradient(90deg, transparent ${x}px, ${color} ${x}px ${x + 1.5}px, transparent ${x + 1.5}px` +
    (double ? `, transparent ${x + 5}px, ${color} ${x + 5}px ${x + 6.5}px, transparent ${x + 6.5}px)` : ")"),
  "100% 100%",
];
const grid = (color: string, step: number): Layer[] => [
  [`linear-gradient(180deg, ${color} 1px, transparent 1px)`, `${step}px ${step}px`],
  [`linear-gradient(90deg, ${color} 1px, transparent 1px)`, `${step}px ${step}px`],
];
const grain = (rgb: [number, number, number], alpha: number): Layer => [noise("0.9", 2, rgb, alpha, 180), "180px 180px"];
const vignette = (color: string, from = 50): Layer => [
  `radial-gradient(ellipse at center, transparent ${from}%, ${color} 100%)`,
  "100% 100%",
];

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
  /** Paper texture shown behind the page when the live wallpaper is off. */
  paper?: { image: string; size: string };
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
    name: "Plain",
    family: "plain",
    variant: "White",
    mode: "light",
    wallpaper: "none",
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
    family: "plain",
    variant: "Sepia",
    mode: "light",
    wallpaper: "none",
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
    family: "plain",
    variant: "Sage",
    mode: "light",
    wallpaper: "none",
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
    family: "plain",
    variant: "Rose",
    mode: "light",
    wallpaper: "none",
    vars: {
      bg: "#f1e4e4", text: "#3a2a2d", muted: "#7e686c", heading: "#2a1b1e", link: "#a8406a",
      accent: "#c0587a", border: "rgba(60,20,30,0.13)", panel: "rgba(250,243,243,0.88)",
      backdrop: "252, 246, 246", codeBg: "rgba(60,20,30,0.05)", quoteBar: "#dcbcc3",
      star: "#a88690", starGlow: "#d0648a",
    },
  },
  {
    id: "sky",
    name: "Sky",
    family: "plain",
    variant: "Sky",
    mode: "light",
    wallpaper: "none",
    vars: {
      bg: "#e3ebf4", text: "#1f2a36", muted: "#5f6e80", heading: "#142030", link: "#2563a8",
      accent: "#3b7bc4", border: "rgba(20,40,70,0.13)", panel: "rgba(244,248,252,0.9)",
      backdrop: "248, 251, 254", codeBg: "rgba(20,40,70,0.05)", quoteBar: "#b9cbe0",
      star: "#7a93b3", starGlow: "#3b7bc4",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    family: "plain",
    variant: "Lavender",
    mode: "light",
    wallpaper: "none",
    vars: {
      bg: "#ebe6f3", text: "#2c2638", muted: "#6f6880", heading: "#1d1828", link: "#6b46c1",
      accent: "#7c5cd6", border: "rgba(40,20,70,0.13)", panel: "rgba(247,244,251,0.9)",
      backdrop: "250, 248, 253", codeBg: "rgba(40,20,70,0.05)", quoteBar: "#cfc3e3",
      star: "#9a8cb8", starGlow: "#7c5cd6",
    },
  },
  {
    id: "peach",
    name: "Peach",
    family: "plain",
    variant: "Peach",
    mode: "light",
    wallpaper: "none",
    vars: {
      bg: "#f5e7da", text: "#3a2c22", muted: "#806b5c", heading: "#2a1d14", link: "#b04f26",
      accent: "#d06a3a", border: "rgba(70,40,20,0.13)", panel: "rgba(252,245,239,0.9)",
      backdrop: "253, 248, 243", codeBg: "rgba(70,40,20,0.05)", quoteBar: "#e2c5ad",
      star: "#b08a70", starGlow: "#d06a3a",
    },
  },
  {
    id: "stone",
    name: "Stone",
    family: "plain",
    variant: "Stone",
    mode: "light",
    wallpaper: "none",
    vars: {
      bg: "#e6e6e3", text: "#262626", muted: "#6b6b6b", heading: "#141414", link: "#365687",
      accent: "#4a6a9c", border: "rgba(0,0,0,0.12)", panel: "rgba(246,246,245,0.9)",
      backdrop: "250, 250, 249", codeBg: "rgba(0,0,0,0.05)", quoteBar: "#c8c8c4",
      star: "#8a8a8a", starGlow: "#4a6a9c",
    },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    family: "plain",
    variant: "Charcoal",
    mode: "dark",
    wallpaper: "none",
    vars: {
      bg: "#1f2023", text: "#d8d8d8", muted: "#959599", heading: "#f0f0f0", link: "#9cbcf2",
      accent: "#8fb0e6", border: "rgba(255,255,255,0.10)", panel: "rgba(36,37,41,0.92)",
      backdrop: "40, 41, 45", codeBg: "rgba(255,255,255,0.06)", quoteBar: "#4a4c52",
      star: "#e0e0e0", starGlow: "#9cbcf2",
    },
  },

  // ---- Paper: real paper looks. The texture shows while the live wallpaper is off. ----
  {
    id: "notebook",
    name: "Notebook",
    family: "paper",
    variant: "Notebook",
    mode: "light",
    wallpaper: "none",
    paper: paper(margin("rgba(214,88,88,0.55)"), ruled("rgba(96,140,200,0.30)"), grain([60, 60, 80], 0.05)),
    vars: {
      bg: "#fbfbf6", text: "#262a33", muted: "#69707f", heading: "#1b2a4a", link: "#2b59a8",
      accent: "#2b59a8", border: "rgba(30,40,70,0.13)", panel: "rgba(251,251,246,0.92)",
      backdrop: "252, 252, 248", codeBg: "rgba(30,40,70,0.05)", quoteBar: "#b7c7e2",
      star: "#7d8aa8", starGlow: "#2b59a8",
    },
  },
  {
    id: "legal",
    name: "Legal pad",
    family: "paper",
    variant: "Legal pad",
    mode: "light",
    wallpaper: "none",
    paper: paper(margin("rgba(200,70,70,0.55)", 80, true), ruled("rgba(90,135,190,0.32)"), grain([110, 90, 20], 0.06)),
    vars: {
      bg: "#fbf3b5", text: "#2b2a20", muted: "#6e6a4c", heading: "#1e1d12", link: "#2a55a0",
      accent: "#b0452f", border: "rgba(80,70,20,0.16)", panel: "rgba(252,246,196,0.93)",
      backdrop: "253, 248, 200", codeBg: "rgba(80,70,20,0.07)", quoteBar: "#dccf7c",
      star: "#a09650", starGlow: "#b0452f",
    },
  },
  {
    id: "graph",
    name: "Graph paper",
    family: "paper",
    variant: "Graph",
    mode: "light",
    wallpaper: "none",
    paper: paper(...grid("rgba(60,140,110,0.30)", 100), ...grid("rgba(60,140,110,0.14)", 20), grain([40, 70, 60], 0.04)),
    vars: {
      bg: "#f6faf6", text: "#24302b", muted: "#62736b", heading: "#15211c", link: "#23735a",
      accent: "#2f7a5c", border: "rgba(20,60,40,0.14)", panel: "rgba(246,250,246,0.92)",
      backdrop: "248, 252, 248", codeBg: "rgba(20,60,40,0.05)", quoteBar: "#a9cfbf",
      star: "#7c9a86", starGlow: "#2f7a5c",
    },
  },
  {
    id: "dotgrid",
    name: "Dot grid",
    family: "paper",
    variant: "Dot grid",
    mode: "light",
    wallpaper: "none",
    paper: paper(
      ["radial-gradient(circle at 1px 1px, rgba(60,60,70,0.30) 1.1px, transparent 1.7px)", "22px 22px"],
      grain([60, 60, 60], 0.04),
    ),
    vars: {
      bg: "#faf9f5", text: "#2a2a2e", muted: "#6c6c74", heading: "#1a1a1e", link: "#b03a4c",
      accent: "#d1495b", border: "rgba(30,30,40,0.12)", panel: "rgba(250,249,245,0.92)",
      backdrop: "251, 250, 247", codeBg: "rgba(30,30,40,0.05)", quoteBar: "#e5bcc3",
      star: "#9a8c90", starGlow: "#d1495b",
    },
  },
  {
    id: "parchment",
    name: "Parchment",
    family: "paper",
    variant: "Parchment",
    mode: "light",
    wallpaper: "none",
    paper: paper(
      vignette("rgba(120,72,20,0.30)", 45),
      [noise("0.012", 3, [130, 85, 30], 0.32, 600), "600px 600px"],
      grain([110, 70, 25], 0.10),
    ),
    vars: {
      bg: "#efdfb9", text: "#3b2a14", muted: "#7a6243", heading: "#2a1a08", link: "#8a3b12",
      accent: "#9a5a1c", border: "rgba(90,60,20,0.18)", panel: "rgba(240,226,192,0.93)",
      backdrop: "243, 230, 199", codeBg: "rgba(90,60,20,0.07)", quoteBar: "#c9a66b",
      star: "#a0815a", starGlow: "#9a5a1c",
    },
  },
  {
    id: "kraft",
    name: "Kraft",
    family: "paper",
    variant: "Kraft",
    mode: "light",
    wallpaper: "none",
    paper: paper(
      [noise("0.03 0.5", 2, [90, 60, 30], 0.22, 300), "300px 300px"],
      [noise("0.012", 2, [120, 80, 40], 0.20, 500), "500px 500px"],
      grain([60, 40, 20], 0.12),
    ),
    vars: {
      bg: "#c9a67b", text: "#2e2214", muted: "#5c4830", heading: "#1f160b", link: "#6b2a0c",
      accent: "#7a3b14", border: "rgba(60,40,15,0.22)", panel: "rgba(206,174,134,0.94)",
      backdrop: "212, 182, 142", codeBg: "rgba(60,40,15,0.09)", quoteBar: "#9c7a4f",
      star: "#7a5a36", starGlow: "#7a3b14",
    },
  },
  {
    id: "newsprint",
    name: "Newsprint",
    family: "paper",
    variant: "Newsprint",
    mode: "light",
    wallpaper: "none",
    paper: paper([noise("0.02", 2, [90, 85, 70], 0.12, 400), "400px 400px"], grain([40, 40, 40], 0.14)),
    vars: {
      bg: "#e6e2d6", text: "#222220", muted: "#5f5c55", heading: "#111110", link: "#1f4e8c",
      accent: "#8a2b2b", border: "rgba(20,20,20,0.15)", panel: "rgba(232,228,218,0.93)",
      backdrop: "236, 233, 224", codeBg: "rgba(20,20,20,0.06)", quoteBar: "#b9b4a6",
      star: "#7a776e", starGlow: "#8a2b2b",
    },
  },
  {
    id: "watercolor",
    name: "Watercolour",
    family: "paper",
    variant: "Watercolour",
    mode: "light",
    wallpaper: "none",
    paper: paper(
      ["radial-gradient(circle at 10% 15%, rgba(110,165,210,0.20), transparent 38%)", "100% 100%"],
      ["radial-gradient(circle at 90% 85%, rgba(230,140,165,0.18), transparent 40%)", "100% 100%"],
      ["radial-gradient(circle at 85% 10%, rgba(240,200,120,0.14), transparent 30%)", "100% 100%"],
      [noise("0.045", 4, [120, 110, 95], 0.14, 260), "260px 260px"],
    ),
    vars: {
      bg: "#fbf8f1", text: "#2b2e33", muted: "#6c707a", heading: "#1c2026", link: "#2d6a8a",
      accent: "#3c7d9e", border: "rgba(30,40,50,0.12)", panel: "rgba(251,248,241,0.92)",
      backdrop: "252, 250, 245", codeBg: "rgba(30,40,50,0.05)", quoteBar: "#bcd3df",
      star: "#8aa0b0", starGlow: "#3c7d9e",
    },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    family: "paper",
    variant: "Blueprint",
    mode: "dark",
    wallpaper: "none",
    paper: paper(
      ...grid("rgba(255,255,255,0.16)", 100),
      ...grid("rgba(255,255,255,0.07)", 20),
      vignette("rgba(5,20,50,0.35)", 55),
      grain([255, 255, 255], 0.04),
    ),
    vars: {
      bg: "#1c4a88", text: "#e8f0fb", muted: "#a9bfdc", heading: "#ffffff", link: "#ffd479",
      accent: "#ffd479", border: "rgba(255,255,255,0.18)", panel: "rgba(22,60,112,0.93)",
      backdrop: "26, 70, 130", codeBg: "rgba(255,255,255,0.09)", quoteBar: "#7fa6d6",
      star: "#dbe8ff", starGlow: "#ffd479",
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
  { id: "plain", name: "Plain", fallback: "paper" },
  { id: "paper", name: "Paper", fallback: "notebook" },
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
  set("--paper-image", theme.paper?.image ?? "none");
  set("--paper-size", theme.paper?.size ?? "auto");
  root.style.colorScheme = theme.mode;
}
