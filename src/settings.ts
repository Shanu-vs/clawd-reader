// Central settings store: typed defaults, persisted to localStorage, with change listeners.

export type FontChoice = "serif" | "sans" | "mono" | "pixel";
export type WallpaperStyle = "starfield" | "fireflies" | "currents" | "rain" | "pixel" | "none";
export type ClickEffect = "ripple" | "warp" | "none";
export type TimeOfDay = "auto" | "cycle" | "dawn" | "day" | "sunset" | "night";

export interface Settings {
  // Appearance
  theme: string;
  lastLightTheme: string;
  lastDarkTheme: string;
  themePicks: Record<string, string>; // last colour variation chosen in each theme family
  font: FontChoice;
  fontSize: number; // px
  lineWidth: number; // characters (ch), used when fitWidth is off
  fitWidth: boolean; // reading column grows with the window
  pageWidth: number; // % of the window used when fitWidth is on
  limitLine: boolean; // when fitting the window, stop lines from growing past maxLineCh
  maxLineCh: number; // characters
  showAdvanced: boolean; // settings panel shows the fine-tuning controls
  lineHeight: number;

  // Reading column
  backdropOpacity: number; // 0..1
  backdropBlur: number; // px, 0 = off
  focusMode: boolean;

  // Wallpaper (shared by all effects)
  wallpaper: WallpaperStyle;
  wpPaused: boolean; // background frozen on its current frame
  wpDensity: number; // 1..10  how many particles / drops / stars
  wpSpeed: number; // 0..10
  wpDirection: number; // degrees, 0 = right, 90 = down
  wpSize: number; // 0.5..3 multiplier
  wpBrightness: number; // 0.2..1.5
  parallax: number; // 0..10
  mouseGlow: boolean;
  clickEffect: ClickEffect;
  palettes: Partial<Record<WallpaperStyle, string>>; // colour palette per wallpaper (see wallpaper/palettes.ts)
  wpColor: string; // hex, used by the "custom" palette
  dimBehindText: number; // 0..1 (how much the wallpaper fades behind the reading column)
  fpsCap: number; // 15 | 20 | 30 | 60
  respectReducedMotion: boolean;

  // Starfield only
  twinkle: number; // 0..1
  shootingStars: number; // per minute, 0 = off

  // Pixel world only
  pixelScale: number; // 2..8 screen pixels per art pixel
  timeOfDay: TimeOfDay;
  showCrab: boolean;
  location: string; // "rotate" or a location id (meadow, beach, snow, desert, autumn, sea)
  locationMinutes: number; // how often the location changes when rotating
}

export const DEFAULTS: Settings = {
  theme: "night",
  lastLightTheme: "paper",
  lastDarkTheme: "night",
  themePicks: {},
  font: "serif",
  fontSize: 18,
  lineWidth: 70,
  fitWidth: true,
  pageWidth: 82,
  limitLine: false,
  maxLineCh: 85,
  showAdvanced: false,
  lineHeight: 1.75,

  backdropOpacity: 0.72,
  backdropBlur: 0,
  focusMode: false,

  wallpaper: "starfield",
  wpPaused: false,
  wpDensity: 5,
  wpSpeed: 3,
  wpDirection: 100,
  wpSize: 1,
  wpBrightness: 1,
  parallax: 2,
  mouseGlow: true,
  clickEffect: "ripple",
  palettes: { fireflies: "warm" },
  wpColor: "#dfe4ff",
  dimBehindText: 0.6,
  fpsCap: 30,
  respectReducedMotion: true,

  twinkle: 0.6,
  shootingStars: 2,

  pixelScale: 4,
  timeOfDay: "auto",
  showCrab: true,
  location: "rotate",
  locationMinutes: 30,
};

const KEY = "mdreader.settings.v1";
type Listener = (s: Settings, changed: (keyof Settings)[]) => void;

// Older versions used starfield-specific names; carry those values over.
const RENAMED: Record<string, keyof Settings> = {
  starDensity: "wpDensity",
  starSpeed: "wpSpeed",
  starDirection: "wpDirection",
  starSize: "wpSize",
  starBrightness: "wpBrightness",
  useThemeStarColor: "useThemeColor" as keyof Settings,
  starColor: "wpColor",
  showTraveler: "showCrab",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      for (const [oldKey, newKey] of Object.entries(RENAMED)) {
        if (oldKey in saved && !(newKey in saved)) saved[newKey] = saved[oldKey];
        delete saved[oldKey];
      }
      // "Match theme colour: off" became the "custom" palette.
      if ("useThemeColor" in saved) {
        if (saved.useThemeColor === false && !saved.palettes) {
          saved.palettes = { starfield: "custom", fireflies: "custom", currents: "custom", rain: "custom" };
        }
        delete saved.useThemeColor;
      }
      return { ...DEFAULTS, ...saved } as Settings;
    }
  } catch {
    /* storage unavailable or corrupt: fall back to defaults */
  }
  return { ...DEFAULTS };
}

let current: Settings = load();
const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  const changed = (Object.keys(patch) as (keyof Settings)[]).filter(
    (k) => patch[k] !== current[k],
  );
  if (!changed.length) return;
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(current, changed));
}

export function resetSettings(keys?: (keyof Settings)[]): void {
  const patch: Partial<Settings> = {};
  for (const k of keys ?? (Object.keys(DEFAULTS) as (keyof Settings)[])) {
    (patch as Record<string, unknown>)[k] = DEFAULTS[k];
  }
  updateSettings(patch);
}

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
