// Colour palettes for the particle wallpapers. Each wallpaper remembers its own choice,
// and particles pick a tone from the list so the scene has gentle variety.
import type { Settings, WallpaperStyle } from "../settings";
import type { Theme } from "../themes";

export interface Palette {
  id: string;
  name: string;
  colors: string[]; // empty = computed (theme / custom)
}

export const PALETTES: Palette[] = [
  { id: "theme", name: "Match theme", colors: [] },
  { id: "warm", name: "Warm white", colors: ["#fffaf0", "#fff3dc", "#f8e8c8", "#f1dcb4", "#e9d09e", "#fff7ea"] },
  { id: "moon", name: "Moonlight", colors: ["#ffffff", "#e8eefc", "#d2ddf5", "#bfcdef"] },
  { id: "aurora", name: "Aurora", colors: ["#7cf5c4", "#5fd6ef", "#9be7ff", "#a98bff", "#c8ffe4"] },
  { id: "ocean", name: "Deep sea", colors: ["#5fd6ef", "#3fa9f5", "#9ee8ff", "#2dd4bf", "#c3f4ff"] },
  { id: "sunset", name: "Sunset", colors: ["#ffb38a", "#ff8fa3", "#ffd480", "#f0a1ff", "#ffc6a8"] },
  { id: "ember", name: "Ember", colors: ["#ffd88a", "#ffab66", "#ff8a5c", "#ffe7b0"] },
  { id: "lavender", name: "Lavender", colors: ["#e2d4ff", "#c3abff", "#f3ecff", "#a991ff"] },
  { id: "meadow", name: "Meadow", colors: ["#d9f5a6", "#a7e08a", "#f4f7c4", "#7fd1a0"] },
  { id: "custom", name: "My colour", colors: [] },
];

export const paletteId = (s: Settings, style: WallpaperStyle = s.wallpaper): string => s.palettes[style] ?? "theme";
export const getPalette = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** Mix a hex colour toward another (t = 0..1). */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** The colours a wallpaper should draw with: [tones...], plus a main and a highlight colour. */
export function resolvePalette(s: Settings, theme: Theme): { tones: string[]; primary: string; glow: string } {
  const id = paletteId(s);
  if (id === "theme") return { tones: [theme.vars.star], primary: theme.vars.star, glow: theme.vars.starGlow };
  if (id === "custom") return { tones: [s.wpColor], primary: s.wpColor, glow: mix(s.wpColor, "#ffffff", 0.35) };
  let tones = getPalette(id).colors;
  // Light themes: pale colours would vanish on a pale background, so deepen them.
  if (theme.mode === "light") tones = tones.map((c) => mix(c, "#2b2f3a", 0.5));
  return { tones, primary: tones[0], glow: tones[1] ?? tones[0] };
}

/** A small swatch background showing the palette's tones. */
export function paletteSwatch(id: string, s: Settings, theme: Theme): string {
  const { tones, primary, glow } = resolvePalette({ ...s, palettes: { ...s.palettes, [s.wallpaper]: id } }, theme);
  const list = tones.length > 1 ? tones : [primary, glow];
  return `linear-gradient(135deg, ${list.join(", ")})`;
}
