// Desktop-only helpers (Tauri). In a plain browser these all fall back to doing nothing,
// so the same app still runs in the browser preview.

export const isDesktop = "__TAURI_INTERNALS__" in window;

export interface OpenedFile {
  path: string;
  name: string;
  dir: string;
  text: string;
}

export const splitPath = (path: string) => {
  const i = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  const file = path.slice(i + 1);
  return { dir: path.slice(0, i), name: file.replace(/\.(md|markdown|mdown|mkd|mkdn|txt)$/i, "") };
};

/** Read a Markdown file by its full path (also lets the app show images next to it). */
export async function readPath(path: string): Promise<OpenedFile> {
  const { invoke } = await import("@tauri-apps/api/core");
  const text = await invoke<string>("read_markdown", { path });
  return { path, text, ...splitPath(path) };
}

/** Show the Windows "Open" dialog and read the chosen file. */
export async function pickFile(): Promise<OpenedFile | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd", "mkdn", "txt"] }],
  });
  return typeof path === "string" ? readPath(path) : null;
}

/** The file the app was launched with ("Open with" / double-click), if any. */
export async function startupFile(): Promise<string | null> {
  const { invoke } = await import("@tauri-apps/api/core");
  return (await invoke<string | null>("startup_file")) ?? null;
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  svg: "image/svg+xml", bmp: "image/bmp", avif: "image/avif", ico: "image/x-icon",
};
let liveUrls: string[] = [];

/** Full path of an image written in the document, relative to the document's folder. */
export function imagePath(dir: string, src: string): string {
  let rel = src;
  try {
    rel = decodeURI(src);
  } catch {
    /* keep as written */
  }
  rel = rel.replace(/^file:\/\/\/?/i, "");
  const isAbsolute = /^[a-zA-Z]:[\\/]/.test(rel) || rel.startsWith("\\\\");
  const full = isAbsolute ? rel : `${dir}/${rel.replace(/^\.[\\/]/, "")}`;
  return full.replace(/\//g, "\\");
}

/**
 * Show the document's local images: each file is read from disk by the app and displayed.
 * Resolves once every image has loaded (or failed), so the caller can restore the scroll position.
 */
export async function loadLocalImages(container: HTMLElement, dir: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  liveUrls.forEach((u) => URL.revokeObjectURL(u));
  liveUrls = [];
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img[data-local-src]"));
  await Promise.all(
    imgs.map(async (img) => {
      const path = imagePath(dir, img.dataset.localSrc!);
      try {
        const bytes = await invoke<ArrayBuffer>("read_image", { path });
        const ext = path.split(".").pop()!.toLowerCase();
        const url = URL.createObjectURL(new Blob([bytes], { type: MIME[ext] ?? "application/octet-stream" }));
        liveUrls.push(url);
        img.src = url;
        await img.decode().catch(() => {});
      } catch (err) {
        img.alt = `Image not found: ${path}`;
        img.classList.add("missing");
        console.warn(err);
      }
    }),
  );
}

/** Files dropped onto the window (desktop gives us real paths). */
export async function onFileDrop(handlers: { over: (on: boolean) => void; drop: (paths: string[]) => void }): Promise<void> {
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  await getCurrentWebview().onDragDropEvent((e) => {
    const p = e.payload;
    if (p.type === "enter" || p.type === "over") handlers.over(true);
    else if (p.type === "leave") handlers.over(false);
    else if (p.type === "drop") {
      handlers.over(false);
      handlers.drop(p.paths);
    }
  });
}

export async function setWindowTitle(title: string): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setTitle(title);
}

/** Write a document back to disk. */
export async function writePath(path: string, text: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("write_markdown", { path, contents: text });
}

/** Show the Windows "Save as" dialog; returns the chosen path (with a .md extension). */
export async function pickSavePath(suggestedName: string, folder?: string): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const safe = suggestedName.replace(/[<>:"/\|?*]+/g, " ").trim() || "Untitled";
  const path = await save({
    defaultPath: folder ? `${folder}\${safe}.md` : `${safe}.md`,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (!path) return null;
  return /\.(md|markdown|mdown|mkd|mkdn|txt)$/i.test(path) ? path : `${path}.md`;
}

/** A native yes/no question (falls back to the browser's confirm box). */
export async function askYesNo(message: string, title: string, yes: string, no: string): Promise<boolean> {
  if (!isDesktop) return window.confirm(message);
  const { ask } = await import("@tauri-apps/plugin-dialog");
  return ask(message, { title, kind: "warning", okLabel: yes, cancelLabel: no });
}
