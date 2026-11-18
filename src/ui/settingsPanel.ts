// Settings panel built from a small declarative schema, so adding a control is one line.
// Wallpaper controls declare which effects they apply to and are hidden for the others.
import { DEFAULTS, getSettings, onSettingsChange, resetSettings, updateSettings, type Settings, type WallpaperStyle } from "../settings";
import { FAMILIES, familyMembers, getTheme, themeLabel, type ThemeFamily } from "../themes";
import { BIOMES } from "../wallpaper/pixel/biomes";
import { PALETTES, getPalette, paletteId, paletteSwatch } from "../wallpaper/palettes";

type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type Only = { only?: WallpaperStyle[]; showIf?: (s: Settings) => boolean; advanced?: boolean };
type Label = string | Partial<Record<WallpaperStyle, string>> & { default: string };

type Control =
  | ({ kind: "section"; label: string } & Only)
  | { kind: "themes" }
  | ({ kind: "palette" } & Only)
  | ({ kind: "range"; key: NumKey; label: Label; min: number; max: number; step: number; fmt?: (v: number) => string } & Only)
  | ({ kind: "toggle"; key: BoolKey; label: Label } & Only)
  | ({ kind: "select"; key: keyof Settings; label: Label; options: [string, string][]; numeric?: boolean } & Only)
  | ({ kind: "color"; key: "wpColor"; label: string } & Only)
  | ({ kind: "hint"; text: Label } & Only);

const PIN_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M14.5 4v16"/></svg>`;

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
  { kind: "toggle", key: "fitWidth", label: "Fit page to window" },
  { kind: "range", key: "pageWidth", label: "Page width", min: 45, max: 100, step: 1, fmt: (v) => `${v}% of window`, showIf: (s) => s.fitWidth },
  { kind: "toggle", key: "limitLine", label: "Comfortable line length", showIf: (s) => s.fitWidth },
  { kind: "range", key: "maxLineCh", label: "Longest line", min: 60, max: 140, step: 5, fmt: (v) => `${v} characters`, showIf: (s) => s.fitWidth && s.limitLine },
  { kind: "hint", text: "Lines of about 65–75 characters are the easiest to read.", showIf: (s) => s.fitWidth && s.limitLine },
  { kind: "range", key: "lineWidth", label: "Line width", min: 45, max: 160, step: 1, fmt: (v) => `${v} ch`, showIf: (s) => !s.fitWidth },
  { kind: "range", key: "lineHeight", label: "Line spacing", min: 1.3, max: 2.2, step: 0.05, fmt: (v) => v.toFixed(2) },
  { kind: "range", key: "backdropOpacity", label: "Text backdrop", min: 0, max: 1, step: 0.01, fmt: pct },
  { kind: "range", key: "backdropBlur", advanced: true, label: "Backdrop blur", min: 0, max: 20, step: 1, fmt: (v) => (v ? `${v}px` : "off") },
  { kind: "hint", text: "Blur looks lovely but costs a little more GPU.", advanced: true },

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
    kind: "range", key: "wpDirection", advanced: true, min: 0, max: 360, step: 5, fmt: dirLabel, only: ["starfield", "currents", "rain"],
    label: { default: "Direction", rain: "Wind" },
  },
  { kind: "range", key: "wpSize", advanced: true, label: "Size", min: 0.5, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}×`, only: PARTICLES },
  { kind: "range", key: "wpBrightness", label: "Brightness", min: 0.2, max: 1.5, step: 0.05, fmt: pct, only: ANIMATED },
  { kind: "range", key: "twinkle", advanced: true, label: "Twinkle", min: 0, max: 1, step: 0.05, fmt: pct, only: ["starfield"] },
  { kind: "range", key: "shootingStars", advanced: true, label: "Shooting stars", min: 0, max: 20, step: 1, fmt: (v) => (v ? `${v} / min` : "off"), only: ["starfield"] },
  {
    kind: "select", key: "timeOfDay", label: "Time of day", only: ["pixel"],
    options: [["auto", "Match my clock"], ["cycle", "Full day every 8 min"], ["dawn", "Dawn"], ["day", "Day"], ["sunset", "Sunset"], ["night", "Night"]],
  },
  {
    kind: "select", key: "location", label: "Location", only: ["pixel"],
    options: [["rotate", "Travel through all"], ...BIOMES.map((b): [string, string] => [b.id, b.name])],
  },
  {
    kind: "select", key: "locationMinutes", advanced: true, label: "Change place every", only: ["pixel"], numeric: true,
    options: [["5", "5 minutes"], ["10", "10 minutes"], ["15", "15 minutes"], ["30", "30 minutes"], ["60", "1 hour"]],
  },
  { kind: "range", key: "pixelScale", advanced: true, label: "Pixel size", min: 2, max: 8, step: 1, fmt: (v) => `${v}px`, only: ["pixel"] },
  { kind: "toggle", key: "showCrab", label: "Show Claw'd (Claude crab)", only: ["pixel"] },
  { kind: "range", key: "dimBehindText", advanced: true, label: "Fade behind text", min: 0, max: 1, step: 0.05, fmt: pct, only: ANIMATED },

  { kind: "section", label: "Interaction", only: ANIMATED },
  { kind: "range", key: "parallax", advanced: true, label: "Mouse parallax", min: 0, max: 10, step: 0.5, only: ["starfield", "pixel"] },
  {
    kind: "toggle", key: "mouseGlow", only: PARTICLES,
    label: { default: "React to cursor", starfield: "Stars glow near cursor", fireflies: "Fireflies follow cursor", currents: "Cursor stirs a whirlpool", rain: "Cursor drips raindrops" },
  },
  {
    kind: "select", key: "clickEffect", label: "Click on background", only: ANIMATED,
    options: [["ripple", "Ripple / burst"], ["warp", "Warp (starfield)"], ["none", "Nothing"]],
  },
  {
    kind: "hint", only: ANIMATED,
    text: {
      default: "",
      starfield: "Click: ripple · Double-click: supernova · Press and hold: gravity well (let go to slingshot).",
      fireflies: "Click: scatter · Double-click: they all light up · Press and hold: they gather and circle you.",
      currents: "Click: swirl · Double-click: a wide, slow whirlpool · Press and drag: stir the water.",
      rain: "Click: splash · Double-click: thunder shower · Press and hold: rest a finger in the water.",
      pixel: "Click: Claw'd hops · Double-click: fireworks · Press and hold: magic dust follows you.",
    },
  },

  { kind: "section", label: "Colour", only: PARTICLES },
  { kind: "palette", only: PARTICLES },
  { kind: "color", key: "wpColor", label: "My colour", only: PARTICLES, showIf: (s) => paletteId(s) === "custom" },

  { kind: "section", label: "Performance" },
  { kind: "select", key: "fpsCap", label: "Frame rate", options: [["15", "15 fps (lightest)"], ["20", "20 fps"], ["30", "30 fps"], ["60", "60 fps (smoothest)"]], numeric: true },
  { kind: "toggle", key: "respectReducedMotion", label: "Follow Windows \"reduce animations\"" },
];

const WALLPAPER_KEYS = Object.keys(DEFAULTS).filter((k) =>
  /^(wp|twinkle|parallax|mouseGlow|clickEffect|shootingStars|palettes|dimBehindText|fpsCap|pixelScale|timeOfDay|showCrab|location)/.test(k),
) as (keyof Settings)[];

const WALLPAPER_NAMES: Record<WallpaperStyle, string> = {
  starfield: "Starfield", fireflies: "Fireflies", currents: "Flowing currents", rain: "Rain ripples", pixel: "Pixel world", none: "Off",
};

/** Short "current value" shown on a collapsed section's row. */
const SUMMARIES: Record<string, (s: Settings) => string> = {
  Theme: (s) => themeLabel(getTheme(s.theme)),
  Reading: (s) => `${s.font[0].toUpperCase()}${s.font.slice(1)} · ${s.fontSize}px · ${s.fitWidth ? `${s.pageWidth}%` : `${s.lineWidth} ch`}`,
  "Live wallpaper": (s) => WALLPAPER_NAMES[s.wallpaper],
  Colour: (s) => getPalette(paletteId(s)).name,
  Performance: (s) => `${s.fpsCap} fps`,
};

const labelFor = (l: Label, style: WallpaperStyle) => (typeof l === "string" ? l : (l[style] ?? l.default));

export function buildSettingsPanel(root: HTMLElement): void {
  const updaters: (() => void)[] = [];
  const visible = (el: HTMLElement, only?: WallpaperStyle[], showIf?: (s: Settings) => boolean, advanced = false) => {
    if (only || showIf || advanced) {
      updaters.push(() => {
        const s = getSettings();
        el.hidden =
          (only ? !only.includes(s.wallpaper) : false) || (showIf ? !showIf(s) : false) || (advanced && !s.showAdvanced);
      });
    }
  };
  // Sections with fine-tuning controls get a "More options" switch at the bottom.
  const advancedBodies = new Set<HTMLElement>();

  root.innerHTML = `<div class="panel-head drag-handle" title="Drag to move. Drop on the right edge to dock.">
    <span class="grip" aria-hidden="true">⠿</span><span class="panel-title">Settings</span>
    <button class="panel-pin" data-pin aria-label="Dock or undock">${PIN_ICON}</button>
    <button class="panel-close" data-close="settings" aria-label="Close settings">×</button>
  </div>`;

  // Each section is a collapsible group, like a chapter in the contents panel.
  const OPEN_KEY = "mdreader.settingsOpen";
  let open = new Set<string>(["Theme"]);
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "null");
    if (Array.isArray(saved)) open = new Set(saved);
  } catch {
    /* defaults */
  }
  const saveOpen = () => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...open]));
    } catch {
      /* ignore */
    }
  };

  const list = document.createElement("div");
  list.className = "set-groups";
  root.append(list);
  let body: HTMLElement = list;

  for (const c of SCHEMA) {
    if (c.kind === "section") {
      const group = document.createElement("section");
      group.className = "set-group" + (open.has(c.label) ? " open" : "");
      const head = document.createElement("button");
      head.className = "set-group-head";
      head.setAttribute("aria-expanded", String(open.has(c.label)));
      head.innerHTML = `<span class="twisty" aria-hidden="true"></span><span class="set-group-name">${c.label}</span><span class="set-group-sum"></span>`;
      const sectionLabel = c.label;
      head.onclick = () => {
        const isOpen = group.classList.toggle("open");
        head.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) open.add(sectionLabel);
        else open.delete(sectionLabel);
        saveOpen();
      };
      const summary = SUMMARIES[c.label];
      if (summary) {
        const sum = head.querySelector<HTMLElement>(".set-group-sum")!;
        updaters.push(() => (sum.textContent = summary(getSettings())));
      }
      body = document.createElement("div");
      body.className = "set-group-body";
      group.append(head, body);
      visible(group, c.only, c.showIf);
      list.append(group);
      continue;
    }
    if (c.kind === "hint") {
      const el = document.createElement("div");
      el.className = "set-hint";
      const text = c.text;
      updaters.push(() => (el.textContent = labelFor(text, getSettings().wallpaper)));
      visible(el, c.only, c.showIf, c.advanced);
      if (c.advanced) advancedBodies.add(body);
      body.append(el);
      continue;
    }
    if (c.kind === "themes") {
      body.append(buildThemePicker(updaters));
      continue;
    }
    if (c.kind === "palette") {
      const grid = document.createElement("div");
      grid.className = "palette-grid";
      for (const p of PALETTES) {
        const b = document.createElement("button");
        b.className = "palette-chip";
        b.title = p.name;
        const sw = Object.assign(document.createElement("span"), { className: "sw" });
        b.append(sw, p.name);
        b.onclick = () => {
          const st = getSettings();
          updateSettings({ palettes: { ...st.palettes, [st.wallpaper]: p.id } });
        };
        grid.append(b);
        updaters.push(() => {
          const st = getSettings();
          sw.style.background = paletteSwatch(p.id, st, getTheme(st.theme));
          b.classList.toggle("active", paletteId(st) === p.id);
        });
      }
      visible(grid, c.only, c.showIf);
      body.append(grid);
      continue;
    }

    const row = document.createElement("label");
    row.className = "set-row";
    const name = document.createElement("span");
    row.append(name);
    const adv = "advanced" in c && !!c.advanced;
    visible(row, c.only, "showIf" in c ? c.showIf : undefined, adv);
    if (adv) advancedBodies.add(body);
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
      input.oninput = () => updateSettings({ wpColor: input.value });
      row.append(input);
      updaters.push(() => (input.value = getSettings().wpColor));
    }
    body.append(row);
  }

  for (const b of advancedBodies) {
    const more = Object.assign(document.createElement("button"), { className: "set-more" });
    more.onclick = () => updateSettings({ showAdvanced: !getSettings().showAdvanced });
    updaters.push(() => (more.textContent = getSettings().showAdvanced ? "Fewer options" : "More options"));
    b.append(more);
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

/** The family's remembered colour variation, or its default. */
export function themeForFamily(f: ThemeFamily): string {
  const s = getSettings();
  const remembered = s.themePicks[f];
  if (remembered && familyMembers(f).some((t) => t.id === remembered)) return remembered;
  return FAMILIES.find((x) => x.id === f)!.fallback;
}

/** Apply a theme; themes with their own wallpaper switch to it, and leaving one goes back to stars. */
export function chooseTheme(id: string): void {
  const s = getSettings();
  const t = getTheme(id);
  const patch: Partial<Settings> = { theme: id };
  if (t.wallpaper) patch.wallpaper = t.wallpaper;
  else if (getTheme(s.theme).wallpaper === s.wallpaper) patch.wallpaper = "starfield";
  updateSettings(patch);
}

const swatchStyle = (bg: string, accent: string) => `background:${bg};box-shadow:inset 0 0 0 4px ${bg}, inset 0 0 0 9px ${accent}`;

/** Theme families as cards; the active family's colour variations sit in a row underneath. */
function buildThemePicker(updaters: (() => void)[]): HTMLElement {
  const wrap = document.createElement("div");
  const grid = document.createElement("div");
  grid.className = "theme-grid";
  for (const fam of FAMILIES) {
    const b = document.createElement("button");
    b.className = "theme-chip";
    const sw = Object.assign(document.createElement("span"), { className: "sw" });
    b.append(sw, Object.assign(document.createElement("span"), { className: "tc-text", textContent: fam.name }));
    b.onclick = () => chooseTheme(themeForFamily(fam.id));
    grid.append(b);
    updaters.push(() => {
      const cur = getTheme(getSettings().theme);
      const active = cur.family === fam.id;
      const t = active ? cur : getTheme(themeForFamily(fam.id));
      sw.setAttribute("style", swatchStyle(t.vars.bg, t.vars.accent));
      b.classList.toggle("active", active);
    });
  }

  const variants = document.createElement("div");
  variants.className = "theme-variants";
  let shownFamily = "";
  updaters.push(() => {
    const cur = getTheme(getSettings().theme);
    const members = familyMembers(cur.family);
    variants.hidden = members.length < 2;
    if (shownFamily !== cur.family) {
      shownFamily = cur.family;
      variants.innerHTML = `<div class="tv-label">${FAMILIES.find((f) => f.id === cur.family)!.name} colours</div>`;
      const row = document.createElement("div");
      row.className = "tv-row";
      for (const t of members) {
        const b = document.createElement("button");
        b.className = "tv-chip";
        b.dataset.id = t.id;
        b.title = t.name;
        b.innerHTML = `<span class="sw" style="${swatchStyle(t.vars.bg, t.vars.accent)}"></span><span>${t.variant}</span>`;
        b.onclick = () => chooseTheme(t.id);
        row.append(b);
      }
      variants.append(row);
    }
    variants.querySelectorAll<HTMLElement>(".tv-chip").forEach((b) => b.classList.toggle("active", b.dataset.id === cur.id));
  });
  wrap.append(grid, variants);
  return wrap;
}
