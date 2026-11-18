import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/600.css";
import "katex/dist/katex.min.css";
import "./styles/main.css";
import "./styles/markdown.css";
import "./styles/print.css";

import welcome from "./welcome.md?raw";
import { renderMarkdown, readingStats } from "./markdown";
import { getSettings, onSettingsChange, updateSettings, type Settings } from "./settings";
import { applyTheme, getTheme } from "./themes";
import { WallpaperHost } from "./wallpaper/host";
import { buildSettingsPanel } from "./ui/settingsPanel";
import { isDesktop, loadLocalImages, onFileDrop, pickFile, readPath, setWindowTitle, splitPath, startupFile, type OpenedFile } from "./desktop";
import { Editor } from "./ui/editor";
import { ContentsPanel, isNarrow } from "./ui/contents";
import { makeFloating } from "./ui/floating";
import { installQuickMenu } from "./ui/quickMenu";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const doc = $<HTMLElement>("doc");
const scroller = $<HTMLElement>("scroller");
const toc = $<HTMLElement>("toc");
const settingsEl = $<HTMLElement>("settings");
const fileInput = $<HTMLInputElement>("file-input");
const titleEl = $<HTMLElement>("doc-title");
const metaEl = $<HTMLElement>("doc-meta");
const progressBar = $<HTMLElement>("progress-bar");
const dropOverlay = $<HTMLElement>("drop-overlay");

const LAST_DOC_KEY = "mdreader.lastDoc.v1";
let currentPath: string | null = null;
const SETTINGS_KEY_EXISTS = localStorage.getItem("mdreader.settings.v1") !== null;
let currentName = "Welcome";
let currentText = "";
let currentDir: string | undefined;

// ---------- Theme & reading appearance ----------
function applyAppearance(s: Settings): void {
  applyTheme(getTheme(s.theme));
  const root = document.documentElement.style;
  root.setProperty("--reading-font", `var(--font-${s.font})`);
  root.setProperty("--reading-size", `${s.fontSize}px`);
  root.setProperty("--reading-width", `${s.lineWidth}ch`);
  root.setProperty("--doc-max", s.fitWidth ? `${s.pageWidth}%` : `calc(${s.lineWidth}ch + 96px)`);
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
    const patch: Partial<Settings> = {};
    if (s[key] !== t.id) patch[key] = t.id;
    // Each theme family remembers the colour variation picked last.
    if (s.themePicks[t.family] !== t.id) patch.themePicks = { ...s.themePicks, [t.family]: t.id };
    if (Object.keys(patch).length) updateSettings(patch);
  }
  applyAppearance(s);
});

// ---------- Contents panel (chapters + figures) ----------
const contents = new ContentsPanel(toc, doc, () => togglePanel(toc, false));

// ---------- Wallpaper ----------
const wallpaper = new WallpaperHost(
  $<HTMLCanvasElement>("wallpaper"),
  () => doc.getBoundingClientRect(),
  (target) => target === scroller || target === document.body || target === document.documentElement || (target as Element)?.id === "wallpaper",
);

// ---------- Document loading ----------
interface LoadOptions {
  restoreScroll?: number;
  path?: string | null;
  /** Folder of the file on disk (desktop), so images next to it can be shown. */
  dir?: string;
}

function loadDocument(text: string, name: string, opts: LoadOptions = {}): void {
  const restoreScroll = opts.restoreScroll ?? 0;
  currentName = name;
  currentPath = opts.path ?? null;
  currentText = text;
  currentDir = opts.dir;
  const localImages = isDesktop && !!opts.dir;
  // On desktop, images are always read from disk; without a known folder we explain how to fix it.
  const { html, headings, title } = renderMarkdown(text.replace(/^\uFEFF/, ""), { localImages: isDesktop });
  if (title.title && name !== "Welcome") name = currentName = title.subtitle ? `${title.title}: ${title.subtitle}` : title.title;
  doc.innerHTML = html;

  // External links open outside the app (see the click handler below).
  doc.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((a) => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  titleEl.textContent = name;
  document.title = `${name} · MD Reader`;
  if (isDesktop) setWindowTitle(document.title).catch(() => {});
  const { words, minutes } = readingStats(text);
  metaEl.textContent = `${words.toLocaleString()} words · about ${minutes} min read`;

  contents.setDocument(headings);
  $("btn-toc").toggleAttribute("disabled", contents.isEmpty);

  const restore = () => {
    scroller.style.scrollBehavior = "auto";
    scroller.scrollTop = restoreScroll;
    scroller.style.scrollBehavior = "";
    updateProgress();
    contents.highlight();
  };
  restore();
  // Images are read from disk; once they're in, the page height is final, so restore again.
  if (isDesktop && !localImages) {
    for (const img of Array.from(doc.querySelectorAll<HTMLImageElement>("img[data-local-src]"))) {
      img.alt = `Picture "${img.dataset.localSrc}" — press Open and choose this file again so the app knows which folder its pictures are in.`;
      img.classList.add("missing");
    }
  }
  if (localImages) {
    loadLocalImages(doc, opts.dir!).then(() => {
      if (restoreScroll) restore();
      contents.refreshFigures();
    });
  }

  if (name !== "Welcome") {
    try {
      // Desktop remembers the file's path (re-read fresh next time); the browser keeps a copy.
      const saved = currentPath ? { name, path: currentPath, scroll: restoreScroll } : { name, text, scroll: restoreScroll };
      localStorage.setItem(LAST_DOC_KEY, JSON.stringify(saved));
    } catch {
      /* document too big to remember: fine */
    }
  }
}

async function openFile(file: File): Promise<void> {
  if (!(await canLeave())) return;
  const text = await file.text();
  loadDocument(text, file.name.replace(/\.(md|markdown|mdown|mkd|mkdn|txt)$/i, ""));
}

/** Desktop: show a file read from disk, with its images resolved next to it. */
async function showOpened(f: OpenedFile, restoreScroll = 0): Promise<void> {
  loadDocument(f.text, f.name, { path: f.path, restoreScroll, dir: f.dir });
}

async function openPath(path: string, restoreScroll = 0): Promise<void> {
  if (!(await canLeave())) return;
  try {
    await showOpened(await readPath(path), restoreScroll);
  } catch (err) {
    showError(String(err));
  }
}

const toast = $<HTMLElement>("toast");
let toastTimer = 0;
/** A short message at the bottom of the window ("Saved", or what went wrong). */
function showToast(message: string, error = false): void {
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), error ? 6000 : 2200);
}
const showError = (message: string) => showToast(message, true);

// ---------- Edit mode ----------
const editor = new Editor({
  scroller,
  doc,
  source: () => ({ text: currentText, name: currentName, path: currentPath, dir: currentDir }),
  saved: (text, path, ratio) => {
    const where = path ? splitPath(path) : null;
    loadDocument(text, where?.name ?? currentName, { path, dir: where?.dir ?? currentDir });
    const max = scroller.scrollHeight - scroller.clientHeight;
    scroller.style.scrollBehavior = "auto";
    scroller.scrollTop = ratio * max;
    scroller.style.scrollBehavior = "";
  },
  status: showToast,
});
/** Before replacing the document: leave edit mode, asking first if there are unsaved changes. */
const canLeave = () => editor.stop();

// Don't lose edits when the window is closed.
if (isDesktop) {
  import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
    const win = getCurrentWindow();
    win.onCloseRequested(async (event) => {
      if (!editor.dirty) return;
      event.preventDefault();
      if (await editor.stop()) await win.destroy();
    });
  });
} else {
  window.addEventListener("beforeunload", (e) => {
    if (editor.dirty) e.preventDefault();
  });
}

async function restoreLastDocument(): Promise<void> {
  if (isDesktop) {
    const launched = await startupFile().catch(() => null);
    if (launched) return openPath(launched);
  }
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_DOC_KEY) ?? "null");
    if (saved?.path && isDesktop) return await openPath(saved.path, saved.scroll ?? 0);
    if (saved?.text) return loadDocument(saved.text, saved.name, { restoreScroll: saved.scroll ?? 0 });
  } catch {
    /* ignore: fall back to the welcome page */
  }
  loadDocument(welcome, "Welcome");
}

// ---------- Scroll: progress bar, current heading, remember position ----------
let saveTimer = 0;
function updateProgress(): void {
  const max = scroller.scrollHeight - scroller.clientHeight;
  progressBar.style.width = `${max > 0 ? (scroller.scrollTop / max) * 100 : 100}%`;
}


scroller.addEventListener(
  "scroll",
  () => {
    updateProgress();
    wallpaper.noteScroll();
    if (!toc.hidden) contents.highlight();
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

// In the desktop app, web links open in your normal browser; in a browser tab they open a new tab.
doc.addEventListener("click", async (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!a) return;
  const href = a.getAttribute("href")!;
  if (href.startsWith("#")) {
    e.preventDefault();
    document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (isDesktop && /^(https?:|mailto:)/i.test(href)) {
    e.preventDefault();
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    openUrl(href).catch((err) => console.error("Could not open link", err));
  }
});

// ---------- Panels ----------
buildSettingsPanel(settingsEl);
// Settings float like a small window: drag the header anywhere, or dock it to the right edge.
makeFloating(settingsEl, settingsEl.querySelector<HTMLElement>(".panel-head")!, "mdreader.settingsPanel");

const TOC_OPEN_KEY = "mdreader.tocOpen";
function togglePanel(panel: HTMLElement, force?: boolean): void {
  panel.hidden = force === undefined ? !panel.hidden : !force;
  if (panel === toc) {
    // On wide windows the contents panel docks beside the text instead of covering it.
    document.body.classList.toggle("toc-open", !toc.hidden);
    try {
      localStorage.setItem(TOC_OPEN_KEY, toc.hidden ? "0" : "1");
    } catch {
      /* ignore */
    }
    if (!toc.hidden) contents.highlight();
  }
}
document.addEventListener("click", (e) => {
  const close = (e.target as Element).closest<HTMLElement>("[data-close]");
  if (close) togglePanel($(close.dataset.close!), false);
});

// ---------- Actions ----------
const actions = {
  open: async () => {
    if (!(await canLeave())) return;
    if (!isDesktop) return fileInput.click();
    pickFile()
      .then((f) => f && showOpened(f))
      .catch((err) => showError(String(err)));
  },
  toc: () => togglePanel(toc),
  edit: () => editor.start(),
  settings: () => togglePanel(settingsEl),
  focus: () => updateSettings({ focusMode: !getSettings().focusMode }),
  mode: () => {
    const s = getSettings();
    const dark = getTheme(s.theme).mode === "dark";
    updateSettings({ theme: dark ? s.lastLightTheme : s.lastDarkTheme });
  },
  pdf: () => {
    togglePanel(settingsEl, false);
    const prev = document.title;
    document.title = currentName; // becomes the default PDF file name
    window.print();
    document.title = prev;
  },
};

installQuickMenu({
  open: actions.open,
  edit: actions.edit,
  contents: actions.toc,
  settings: () => togglePanel(settingsEl, true),
  pdf: actions.pdf,
  focus: actions.focus,
});

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
  // Saving works everywhere, including inside the editor.
  if (e.ctrlKey && e.key.toLowerCase() === "s" && editor.editing) {
    e.preventDefault();
    if (e.shiftKey) editor.saveAs();
    else editor.save();
    return;
  }
  if (e.key === "Escape" && editor.editing) {
    e.preventDefault();
    editor.stop();
    return;
  }
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
  if (e.ctrlKey && e.key === ",") {
    e.preventDefault();
    return actions.settings();
  }
  if (e.ctrlKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    return actions.pdf();
  }
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const map: Record<string, () => void> = { o: actions.open, c: actions.toc, e: actions.edit, s: actions.settings, f: actions.focus, t: actions.mode, p: actions.pdf };
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
  if ((e.target as Element | null)?.closest?.("input, textarea")) return;
  const text = e.clipboardData?.getData("text/plain");
  if (text && text.trim() && !editor.editing) loadDocument(text, "Pasted document");
});

// ---------- Pixel world: "now arriving" title card ----------
const placeBanner = $<HTMLElement>("place-banner");
let bannerTimer = 0;
window.addEventListener("wallpaper:place", (e) => {
  placeBanner.innerHTML = "";
  placeBanner.append(
    Object.assign(document.createElement("small"), { textContent: "Now entering" }),
    Object.assign(document.createElement("span"), { textContent: (e as CustomEvent<string>).detail }),
  );
  // Centre the card over the reading column, wherever the panels have pushed it.
  const r = doc.getBoundingClientRect();
  placeBanner.style.left = `${r.width ? r.left + r.width / 2 : window.innerWidth / 2}px`;
  placeBanner.classList.remove("show");
  void placeBanner.offsetWidth; // restart the animation
  placeBanner.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => placeBanner.classList.remove("show"), 4500);
});

// Desktop drag & drop gives real file paths, so images next to the file load too.
if (isDesktop) {
  onFileDrop({
    over: (on) => (dropOverlay.hidden = !on),
    drop: (paths) => {
      const md = paths.find((p) => /\.(md|markdown|mdown|mkd|mkdn|txt)$/i.test(p));
      if (md) openPath(md);
      else showError("That doesn't look like a Markdown file.");
    },
  }).catch(() => {});
}

restoreLastDocument().then(() => {
  // Reopen the contents panel if it was open last time (and there's room for it).
  let wasOpen = false;
  try {
    wasOpen = localStorage.getItem(TOC_OPEN_KEY) === "1";
  } catch {
    /* ignore */
  }
  if (wasOpen && !isNarrow() && !contents.isEmpty) togglePanel(toc, true);
});
