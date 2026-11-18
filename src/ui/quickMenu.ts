// Right-click quick menu: the most-used settings without opening the full panel.
import { getSettings, updateSettings, type WallpaperStyle } from "../settings";
import { FAMILIES, familyMembers, getTheme, type Theme } from "../themes";
import { chooseTheme, themeForFamily } from "./settingsPanel";

export interface QuickActions {
  open: () => void;
  edit: () => void;
  pause: () => void;
  about: () => void;
  contents: () => void;
  settings: () => void;
  pdf: () => void;
  focus: () => void;
}

const WALLPAPERS: [WallpaperStyle, string][] = [
  ["starfield", "Stars"], ["fireflies", "Fireflies"], ["currents", "Currents"],
  ["rain", "Rain"], ["pixel", "Pixel world"], ["none", "Off"],
];

export function installQuickMenu(actions: QuickActions): void {
  const menu = document.createElement("div");
  menu.id = "quick-menu";
  menu.className = "no-print";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  document.body.append(menu);

  const close = () => (menu.hidden = true);
  const item = (label: string, hint: string, fn: () => void) => {
    const b = document.createElement("button");
    b.className = "qm-item";
    b.innerHTML = `<span>${label}</span><kbd>${hint}</kbd>`;
    b.onclick = () => {
      close();
      fn();
    };
    return b;
  };

  const render = (selection: string) => {
    const s = getSettings();
    menu.innerHTML = "";

    if (selection) {
      menu.append(item("Copy", "Ctrl+C", () => navigator.clipboard?.writeText(selection).catch(() => document.execCommand("copy"))));
      menu.append(Object.assign(document.createElement("hr")));
    }

    // Theme families, then the current family's colour variations as small dots.
    const cur = getTheme(s.theme);
    const swatch = (t: Theme, title: string, active: boolean, small = false) => {
      const b = document.createElement("button");
      b.className = "qm-swatch" + (active ? " active" : "") + (small ? " small" : "");
      b.title = title;
      b.style.background = t.vars.bg;
      const r = small ? 3 : 5;
      b.style.boxShadow = `inset 0 0 0 ${r}px ${t.vars.bg}, inset 0 0 0 ${r * 2}px ${t.vars.accent}`;
      b.onclick = () => {
        chooseTheme(t.id);
        render(selection);
      };
      return b;
    };
    const themes = document.createElement("div");
    themes.className = "qm-swatches";
    for (const f of FAMILIES) {
      const active = cur.family === f.id;
      themes.append(swatch(active ? cur : getTheme(themeForFamily(f.id)), f.name, active));
    }
    menu.append(label("Theme"), themes);
    const members = familyMembers(cur.family);
    if (members.length > 1) {
      const row = document.createElement("div");
      row.className = "qm-swatches qm-variants";
      for (const t of members) row.append(swatch(t, t.variant, t.id === cur.id, true));
      menu.append(row);
    }

    // Wallpaper chips.
    const walls = document.createElement("div");
    walls.className = "qm-chips";
    for (const [id, name] of WALLPAPERS) {
      const b = document.createElement("button");
      b.className = "qm-chip" + (s.wallpaper === id ? " active" : "");
      b.textContent = name;
      b.onclick = () => {
        updateSettings({ wallpaper: id });
        render(selection);
      };
      walls.append(b);
    }
    menu.append(label("Wallpaper"), walls);
    if (s.wallpaper !== "none") menu.append(item(s.wpPaused ? "Play background" : "Pause background", "W", actions.pause));

    // Steppers for text size and page width.
    const stepper = (name: string, value: string, minus: () => void, plus: () => void) => {
      const row = document.createElement("div");
      row.className = "qm-stepper";
      const m = Object.assign(document.createElement("button"), { textContent: "−", title: `Smaller ${name.toLowerCase()}` });
      const p = Object.assign(document.createElement("button"), { textContent: "+", title: `Larger ${name.toLowerCase()}` });
      m.onclick = () => (minus(), render(selection));
      p.onclick = () => (plus(), render(selection));
      row.innerHTML = `<span class="qm-name">${name}</span>`;
      const val = Object.assign(document.createElement("span"), { className: "qm-val", textContent: value });
      row.append(m, val, p);
      return row;
    };
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    menu.append(
      stepper("Text size", `${s.fontSize}px`, () => updateSettings({ fontSize: clamp(s.fontSize - 1, 13, 28) }), () => updateSettings({ fontSize: clamp(s.fontSize + 1, 13, 28) })),
      s.fitWidth
        ? stepper("Page width", `${s.pageWidth}%`, () => updateSettings({ pageWidth: clamp(s.pageWidth - 5, 45, 100) }), () => updateSettings({ pageWidth: clamp(s.pageWidth + 5, 45, 100) }))
        : stepper("Line width", `${s.lineWidth} ch`, () => updateSettings({ lineWidth: clamp(s.lineWidth - 5, 45, 160) }), () => updateSettings({ lineWidth: clamp(s.lineWidth + 5, 45, 160) })),
    );

    menu.append(document.createElement("hr"));
    menu.append(
      item(s.focusMode ? "Leave focus mode" : "Focus mode", "F", actions.focus),
      item("Contents", "C", actions.contents),
      item("Edit document", "E", actions.edit),
      item("Open file…", "O", actions.open),
      item("Export PDF", "P", actions.pdf),
    );
    menu.append(document.createElement("hr"));
    menu.append(item("All settings…", "Ctrl+,", actions.settings));
    menu.append(item("About MD Reader", "", actions.about));
  };

  const label = (text: string) => Object.assign(document.createElement("div"), { className: "qm-label", textContent: text });

  window.addEventListener("contextmenu", (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.("input, textarea, select, #quick-menu")) return;
    e.preventDefault();
    render(window.getSelection()?.toString() ?? "");
    menu.hidden = false;
    // Keep the menu fully on screen.
    const { innerWidth: W, innerHeight: H } = window;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(e.clientX, W - r.width - 8)}px`;
    menu.style.top = `${Math.max(8, Math.min(e.clientY, H - r.height - 8))}px`;
  });
  window.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !(e.target as Element | null)?.closest?.("#quick-menu")) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  window.addEventListener("blur", close);
  document.getElementById("scroller")?.addEventListener("scroll", close, { passive: true });
}
