// Settings panel built from a small declarative schema, so adding a control is one line.
// Wallpaper controls declare which effects they apply to and are hidden for the others.
import { DEFAULTS, getSettings, onSettingsChange, resetSettings, updateSettings, type Settings, type WallpaperStyle } from "../settings";
import { THEMES, getTheme } from "../themes";
import { BIOMES } from "../wallpaper/pixel/biomes";

type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type Only = { only?: WallpaperStyle[] };
type Label = string | Partial<Record<WallpaperStyle, string>> & { default: string };

type Control =
  | ({ kind: "section"; label: string } & Only)
  | { kind: "themes" }
  | ({ kind: "range"; key: NumKey; label: Label; min: number; max: number; step: number; fmt?: (v: number) => string } & Only)
  | ({ kind: "toggle"; key: BoolKey; label: Label } & Only)
  | ({ kind: "select"; key: keyof Settings; label: Label; options: [string, string][]; numeric?: boolean } & Only)
  | ({ kind: "color"; key: "wpColor"; label: string } & Only)
  | ({ kind: "hint"; text: string } & Only);

const pct = (v: number) => `${Math.round(v * 100)}%`;
const directions: Record<number, string> = { 0: "right", 45: "down-right", 90: "down", 135: "down-left", 180: "left", 225: "up-left", 270: "up", 315: "up-right", 360: "right" };
const dirLabel = (v: number) => {
  const nearest = Object.keys(directions).map(Number).reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  return `${v}° (${directions[nearest]})`;
};

const PARTICLES: WallpaperStyle[] = ["starfield", "fireflies", "currents", "rain"];
const ANIMATED: WallpaperStyle[] = [...PARTICLES, "pixel"];

const SCHEMA: Control[] = [
  { kind: "section", label: "Theme" },
  { kind: "themes" },

  { kind: "section", label: "Reading" },
  { kind: "select", key: "font", label: "Font", options: [["serif", "Serif"], ["sans", "Sans"], ["mono", "Mono"], ["pixel", "Pixel"]] },
  { kind: "range", key: "fontSize", label: "Text size", min: 13, max: 28, step: 1, fmt: (v) => `${v}px` },
  { kind: "range", key: "lineWidth", label: "Line width", min: 45, max: 110, step: 1, fmt: (v) => `${v} ch` },
  { kind: "range", key: "lineHeight", label: "Line spacing", min: 1.3, max: 2.2, step: 0.05, fmt: (v) => v.toFixed(2) },
  { kind: "range", key: "backdropOpacity", label: "Text backdrop", min: 0, max: 1, step: 0.01, fmt: pct },
  { kind: "range", key: "backdropBlur", label: "Backdrop blur", min: 0, max: 20, step: 1, fmt: (v) => (v ? `${v}px` : "off") },
  { kind: "hint", text: "Blur looks lovely but costs a little more GPU." },

  { kind: "section", label: "Live wallpaper" },
  {
    kind: "select", key: "wallpaper", label: "Style",
    options: [["starfield", "Starfield"], ["fireflies", "Fireflies"], ["currents", "Flowing currents"], ["rain", "Rain ripples"], ["pixel", "Pixel world"], ["none", "Off (still colour)"]],
  },
  {
    kind: "range", key: "wpDensity", min: 1, max: 10, step: 1, only: PARTICLES,
    label: { default: "Amount", starfield: "Star count", fireflies: "Fireflies", currents: "Streams", rain: "Rain amount" },
  },
  {
    kind: "range", key: "wpSpeed", min: 0, max: 10, step: 0.5, only: ANIMATED,
    label: { default: "Speed", starfield: "Drift speed", pixel: "Crab walking speed" },
  },
  {
    kind: "range", key: "wpDirection", min: 0, max: 360, step: 5, fmt: dirLabel, only: ["starfield", "currents", "rain"],
    label: { default: "Direction", rain: "Wind" },
  },
  { kind: "range", key: "wpSize", label: "Size", min: 0.5, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}×`, only: PARTICLES },
  { kind: "range", key: "wpBrightness", label: "Brightness", min: 0.2, max: 1.5, step: 0.05, fmt: pct, only: ANIMATED },
  { kind: "range", key: "twinkle", label: "Twinkle", min: 0, max: 1, step: 0.05, fmt: pct, only: ["starfield"] },
  { kind: "range", key: "shootingStars", label: "Shooting stars", min: 0, max: 20, step: 1, fmt: (v) => (v ? `${v} / min` : "off"), only: ["starfield"] },
  {
    kind: "select", key: "timeOfDay", label: "Time of day", only: ["pixel"],
    options: [["auto", "Match my clock"], ["cycle", "Full day every 8 min"], ["dawn", "Dawn"], ["day", "Day"], ["sunset", "Sunset"], ["night", "Night"]],
  },
  {
    kind: "select", key: "location", label: "Location", only: ["pixel"],
    options: [["rotate", "Travel through all"], ...BIOMES.map((b): [string, string] => [b.id, b.name])],
  },
  {
    kind: "select", key: "locationMinutes", label: "Change place every", only: ["pixel"], numeric: true,
    options: [["5", "5 minutes"], ["10", "10 minutes"], ["15", "15 minutes"], ["30", "30 minutes"], ["60", "1 hour"]],
  },
  { kind: "range", key: "pixelScale", label: "Pixel size", min: 2, max: 8, step: 1, fmt: (v) => `${v}px`, only: ["pixel"] },
  { kind: "toggle", key: "showCrab", label: "Show Claw'd (Claude crab)", only: ["pixel"] },
  { kind: "range", key: "dimBehindText", label: "Fade behind text", min: 0, max: 1, step: 0.05, fmt: pct, only: ANIMATED },

  { kind: "section", label: "Interaction", only: ANIMATED },
  { kind: "range", key: "parallax", label: "Mouse parallax", min: 0, max: 10, step: 0.5, only: ["starfield", "pixel"] },
  {
    kind: "toggle", key: "mouseGlow", only: PARTICLES,
    label: { default: "React to cursor", starfield: "Stars glow near cursor", fireflies: "Fireflies follow cursor", currents: "Cursor stirs a whirlpool", rain: "Cursor drips raindrops" },
  },
  {
    kind: "select", key: "clickEffect", label: "Click on background", only: ANIMATED,
    options: [["ripple", "Ripple / burst"], ["warp", "Warp (starfield)"], ["none", "Nothing"]],
  },
  { kind: "hint", text: "In the pixel world, clicking makes the crab hop and sparkles fly.", only: ["pixel"] },

  { kind: "section", label: "Colour", only: PARTICLES },
  { kind: "toggle", key: "useThemeColor", label: "Match theme", only: PARTICLES },
  { kind: "color", key: "wpColor", label: "Custom colour", only: PARTICLES },

  { kind: "section", label: "Performance" },
  { kind: "select", key: "fpsCap", label: "Frame rate", options: [["15", "15 fps (lightest)"], ["20", "20 fps"], ["30", "30 fps"], ["60", "60 fps (smoothest)"]], numeric: true },
  { kind: "toggle", key: "respectReducedMotion", label: "Follow Windows \"reduce animations\"" },
];

const WALLPAPER_KEYS = Object.keys(DEFAULTS).filter((k) =>
  /^(wp|twinkle|parallax|mouseGlow|clickEffect|shootingStars|useThemeColor|dimBehindText|fpsCap|pixelScale|timeOfDay|showCrab|location)/.test(k),
) as (keyof Settings)[];

const labelFor = (l: Label, style: WallpaperStyle) => (typeof l === "string" ? l : (l[style] ?? l.default));

export function buildSettingsPanel(root: HTMLElement): void {
  const updaters: (() => void)[] = [];
  const visible = (el: HTMLElement, only?: WallpaperStyle[]) => {
    if (only) updaters.push(() => (el.hidden = !only.includes(getSettings().wallpaper)));
  };

  root.innerHTML = `<div class="panel-head"><span>Settings</span><button class="panel-close" data-close="settings" aria-label="Close settings">×</button></div>`;

  for (const c of SCHEMA) {
    if (c.kind === "section" || c.kind === "hint") {
      const el = document.createElement("div");
      el.className = c.kind === "section" ? "set-section" : "set-hint";
      el.textContent = c.kind === "section" ? c.label : c.text;
      visible(el, c.only);
      root.append(el);
      continue;
    }
    if (c.kind === "themes") {
      const grid = document.createElement("div");
      grid.className = "theme-grid";
      for (const t of THEMES) {
        const b = document.createElement("button");
        b.className = "theme-chip";
        b.innerHTML = `<span class="sw" style="background:${t.vars.bg};box-shadow:inset 0 0 0 4px ${t.vars.bg}, inset 0 0 0 9px ${t.vars.accent}"></span>${t.name}`;
        b.onclick = () => {
          const s = getSettings();
          const patch: Partial<Settings> = { theme: t.id };
          // Themes with their own wallpaper switch to it; leaving such a theme goes back to the starfield.
          if (t.wallpaper) patch.wallpaper = t.wallpaper;
          else if (getTheme(s.theme).wallpaper === s.wallpaper) patch.wallpaper = "starfield";
          updateSettings(patch);
        };
        grid.append(b);
        updaters.push(() => b.classList.toggle("active", getSettings().theme === t.id));
      }
      root.append(grid);
      continue;
    }

    const row = document.createElement("label");
    row.className = "set-row";
    const name = document.createElement("span");
    row.append(name);
    visible(row, c.only);
    const label = c.label;
    updaters.push(() => (name.textContent = labelFor(label, getSettings().wallpaper)));

    if (c.kind === "range") {
      const val = document.createElement("span");
      val.className = "val";
      const input = Object.assign(document.createElement("input"), { type: "range", min: String(c.min), max: String(c.max), step: String(c.step) });
      input.oninput = () => updateSettings({ [c.key]: Number(input.value) } as Partial<Settings>);
      row.append(val, input);
      updaters.push(() => {
        const v = getSettings()[c.key];
        input.value = String(v);
        val.textContent = c.fmt ? c.fmt(v) : String(v);
      });
    } else if (c.kind === "toggle") {
      const input = Object.assign(document.createElement("input"), { type: "checkbox" });
      input.onchange = () => updateSettings({ [c.key]: input.checked } as Partial<Settings>);
      row.append(input);
      updaters.push(() => (input.checked = getSettings()[c.key]));
    } else if (c.kind === "select") {
      const sel = document.createElement("select");
      for (const [v, text] of c.options) sel.add(new Option(text, v));
      sel.onchange = () => updateSettings({ [c.key]: c.numeric ? Number(sel.value) : sel.value } as Partial<Settings>);
      row.append(sel);
      updaters.push(() => (sel.value = String(getSettings()[c.key])));
    } else if (c.kind === "color") {
      const input = Object.assign(document.createElement("input"), { type: "color" });
      input.oninput = () => updateSettings({ wpColor: input.value, useThemeColor: false });
      row.append(input);
      updaters.push(() => {
        input.value = getSettings().wpColor;
        row.style.opacity = getSettings().useThemeColor ? "0.55" : "1";
      });
    }
    root.append(row);
  }

  const actions = document.createElement("div");
  actions.className = "set-actions";
  const resetWall = Object.assign(document.createElement("button"), { textContent: "Reset wallpaper" });
  resetWall.onclick = () => resetSettings(WALLPAPER_KEYS);
  const resetAll = Object.assign(document.createElement("button"), { textContent: "Reset everything" });
  resetAll.onclick = () => resetSettings();
  actions.append(resetWall, resetAll);
  root.append(actions);

  const refresh = () => updaters.forEach((u) => u());
  refresh();
  onSettingsChange(refresh);
}
