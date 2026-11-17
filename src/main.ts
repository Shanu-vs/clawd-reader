import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/600.css";
import "./styles/main.css";
import "./styles/markdown.css";
import "./styles/print.css";

import welcome from "./welcome.md?raw";
import { renderMarkdown, readingStats } from "./markdown";
import { getSettings, onSettingsChange, updateSettings, type Settings } from "./settings";
import { applyTheme, getTheme } from "./themes";
import { WallpaperHost } from "./wallpaper/host";
import { buildSettingsPanel } from "./ui/settingsPanel";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const doc = $<HTMLElement>("doc");
const scroller = $<HTMLElement>("scroller");
const toc = $<HTMLElement>("toc");
const tocList = $<HTMLOListElement>("toc-list");
const settingsEl = $<HTMLElement>("settings");
const fileInput = $<HTMLInputElement>("file-input");
const titleEl = $<HTMLElement>("doc-title");
const metaEl = $<HTMLElement>("doc-meta");
const progressBar = $<HTMLElement>("progress-bar");
const dropOverlay = $<HTMLElement>("drop-overlay");

const LAST_DOC_KEY = "mdreader.lastDoc.v1";
const SETTINGS_KEY_EXISTS = localStorage.getItem("mdreader.settings.v1") !== null;
let currentName = "Welcome";

// ---------- Theme & reading appearance ----------
function applyAppearance(s: Settings): void {
  applyTheme(getTheme(s.theme));
  const root = document.documentElement.style;
  root.setProperty("--reading-font", `var(--font-${s.font})`);
  root.setProperty("--reading-size", `${s.fontSize}px`);
  root.setProperty("--reading-width", `${s.lineWidth}ch`);
  root.setProperty("--reading-leading", String(s.lineHeight));
  root.setProperty("--backdrop-opacity", String(s.backdropOpacity));
  root.setProperty("--backdrop-blur", `${s.backdropBlur}px`);
  document.body.classList.toggle("focus", s.focusMode);
  $("btn-focus").classList.toggle("active", s.focusMode);
}

// First launch: follow the Windows light/dark preference.
if (!SETTINGS_KEY_EXISTS && window.matchMedia("(prefers-color-scheme: light)").matches) {
  updateSettings({ theme: getSettings().lastLightTheme });
}

applyAppearance(getSettings());
onSettingsChange((s, changed) => {
  // Remember the last light and dark theme so the quick toggle flips between them.
  if (changed.includes("theme")) {
    const t = getTheme(s.theme);
    const key = t.mode === "light" ? "lastLightTheme" : "lastDarkTheme";
    if (s[key] !== t.id) updateSettings({ [key]: t.id });
  }
  applyAppearance(s);
});

// ---------- Wallpaper ----------
const wallpaper = new WallpaperHost(
  $<HTMLCanvasElement>("wallpaper"),
  () => doc.getBoundingClientRect(),
  (target) => target === scroller || target === document.body || target === document.documentElement || (target as Element)?.id === "wallpaper",
);

// ---------- Document loading ----------
function loadDocument(text: string, name: string, restoreScroll = 0): void {
  currentName = name;
  const { html, headings } = renderMarkdown(text);
  doc.innerHTML = html;

  // External links open outside the app.
  doc.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((a) => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  titleEl.textContent = name;
  document.title = `${name} · MD Reader`;
  const { words, minutes } = readingStats(text);
  metaEl.textContent = `${words.toLocaleString()} words · about ${minutes} min read`;

  tocList.innerHTML = "";
  for (const h of headings) {
    const li = document.createElement("li");
    li.className = `l${h.level}`;
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.text;
    a.dataset.target = h.id;
    li.append(a);
    tocList.append(li);
  }
  $("btn-toc").toggleAttribute("disabled", headings.length === 0);

  scroller.style.scrollBehavior = "auto";
  scroller.scrollTop = restoreScroll;
  scroller.style.scrollBehavior = "";
  updateProgress();

  if (name !== "Welcome") {
    try {
      localStorage.setItem(LAST_DOC_KEY, JSON.stringify({ name, text, scroll: restoreScroll }));
    } catch {
      /* document too big to remember: fine */
    }
  }
}

async function openFile(file: File): Promise<void> {
  const text = await file.text();
  loadDocument(text, file.name.replace(/\.(md|markdown|mdown|mkd|txt)$/i, ""));
}

function restoreLastDocument(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_DOC_KEY) ?? "null");
    if (saved?.text) return loadDocument(saved.text, saved.name, saved.scroll ?? 0);
  } catch {
    /* ignore */
  }
  loadDocument(welcome, "Welcome");
}

// ---------- Scroll: progress bar, current heading, remember position ----------
let saveTimer = 0;
function updateProgress(): void {
  const max = scroller.scrollHeight - scroller.clientHeight;
  progressBar.style.width = `${max > 0 ? (scroller.scrollTop / max) * 100 : 100}%`;
}

function highlightCurrentHeading(): void {
  const links = [...tocList.querySelectorAll<HTMLAnchorElement>("a")];
  let current: HTMLAnchorElement | undefined;
  for (const a of links) {
    const el = document.getElementById(a.dataset.target!);
    if (el && el.getBoundingClientRect().top < 140) current = a;
  }
  links.forEach((a) => a.classList.toggle("current", a === current));
}

scroller.addEventListener(
  "scroll",
  () => {
    updateProgress();
    wallpaper.noteScroll();
    if (!toc.hidden) highlightCurrentHeading();
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      if (currentName === "Welcome") return;
      try {
        const saved = JSON.parse(localStorage.getItem(LAST_DOC_KEY) ?? "null");
        if (saved) localStorage.setItem(LAST_DOC_KEY, JSON.stringify({ ...saved, scroll: scroller.scrollTop }));
      } catch {
        /* ignore */
      }
    }, 400);
  },
  { passive: true },
);

tocList.addEventListener("click", (e) => {
  const a = (e.target as Element).closest("a");
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.target!)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Panels ----------
buildSettingsPanel(settingsEl);

function togglePanel(panel: HTMLElement, force?: boolean): void {
  panel.hidden = force === undefined ? !panel.hidden : !force;
  if (panel === toc && !toc.hidden) highlightCurrentHeading();
}
document.addEventListener("click", (e) => {
  const close = (e.target as Element).closest<HTMLElement>("[data-close]");
  if (close) togglePanel($(close.dataset.close!), false);
});

// ---------- Actions ----------
const actions = {
  open: () => fileInput.click(),
  toc: () => togglePanel(toc),
  settings: () => togglePanel(settingsEl),
  focus: () => updateSettings({ focusMode: !getSettings().focusMode }),
  mode: () => {
    const s = getSettings();
    const dark = getTheme(s.theme).mode === "dark";
    updateSettings({ theme: dark ? s.lastLightTheme : s.lastDarkTheme });
  },
  pdf: () => {
    togglePanel(toc, false);
    togglePanel(settingsEl, false);
    const prev = document.title;
    document.title = currentName; // becomes the default PDF file name
    window.print();
    document.title = prev;
  },
};

$("btn-open").onclick = actions.open;
$("btn-toc").onclick = actions.toc;
$("btn-settings").onclick = actions.settings;
$("btn-focus").onclick = actions.focus;
$("btn-mode").onclick = actions.mode;
$("btn-pdf").onclick = actions.pdf;

fileInput.onchange = () => {
  const f = fileInput.files?.[0];
  if (f) openFile(f);
  fileInput.value = "";
};

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (t.closest("input, select, textarea")) return;
  if (e.key === "Escape") {
    togglePanel(toc, false);
    togglePanel(settingsEl, false);
    return;
  }
  if (e.ctrlKey && e.key.toLowerCase() === "o") {
    e.preventDefault();
    return actions.open();
  }
  if (e.ctrlKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    return actions.pdf();
  }
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const map: Record<string, () => void> = { o: actions.open, c: actions.toc, s: actions.settings, f: actions.focus, t: actions.mode, p: actions.pdf };
  const fn = map[e.key.toLowerCase()];
  if (fn) {
    e.preventDefault();
    fn();
  }
});

// ---------- Drag & drop and paste ----------
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  dragDepth++;
  dropOverlay.hidden = false;
});
window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropOverlay.hidden = true;
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.hidden = true;
  const f = e.dataTransfer?.files?.[0];
  if (f) openFile(f);
});

document.addEventListener("paste", (e) => {
  if ((e.target as HTMLElement).closest("input, textarea")) return;
  const text = e.clipboardData?.getData("text/plain");
  if (text && text.trim()) loadDocument(text, "Pasted document");
});

// ---------- Pixel world: "now arriving" title card ----------
const placeBanner = $<HTMLElement>("place-banner");
let bannerTimer = 0;
window.addEventListener("wallpaper:place", (e) => {
  placeBanner.textContent = `~ ${(e as CustomEvent<string>).detail} ~`;
  placeBanner.classList.remove("show");
  void placeBanner.offsetWidth; // restart the animation
  placeBanner.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => placeBanner.classList.remove("show"), 4500);
});

restoreLastDocument();
