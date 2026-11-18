// Edit mode. Documents always open for reading; "Edit" swaps the page for its Markdown source,
// and the same button becomes "Save" (with a small menu for "Save as…" and leaving without saving).
import { askYesNo, isDesktop, pickSavePath, writePath } from "../desktop";

export interface EditorHost {
  scroller: HTMLElement;
  doc: HTMLElement;
  /** The document being shown: its Markdown, display name, file path and folder (if from disk). */
  source(): { text: string; name: string; path: string | null; dir?: string };
  /** Show the saved text (re-render), keeping roughly the same place on the page. */
  saved(text: string, path: string | null, scrollRatio: number): void;
  status(message: string, error?: boolean): void;
}

export class Editor {
  editing = false;
  private original = "";
  private crlf = false;
  private bom = false; // files saved by some Windows editors start with an invisible marker; keep it
  private readonly area = document.getElementById("editor") as HTMLTextAreaElement;
  private readonly btn = document.getElementById("btn-edit") as HTMLButtonElement;
  private readonly caret = document.getElementById("btn-save-menu") as HTMLButtonElement;
  private readonly menu = document.getElementById("save-menu") as HTMLElement;

  constructor(private host: EditorHost) {
    this.btn.onclick = () => (this.editing ? this.save() : this.start());
    this.caret.onclick = (e) => {
      e.stopPropagation();
      this.toggleMenu();
    };
    window.addEventListener("pointerdown", (e) => {
      if (!this.menu.hidden && !(e.target as Element | null)?.closest?.("#save-menu, #btn-save-menu")) this.toggleMenu(false);
    });
    this.area.addEventListener("input", () => {
      this.autosize();
      this.refresh();
    });
    this.area.addEventListener("keydown", (e) => {
      // Tab indents instead of leaving the editor.
      if (e.key === "Tab" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      }
    });
    window.addEventListener("resize", () => this.editing && this.autosize());
  }

  get dirty(): boolean {
    return this.editing && this.area.value !== this.original;
  }

  get menuOpen(): boolean {
    return !this.menu.hidden;
  }

  start(): void {
    if (this.editing) return;
    const src = this.host.source();
    this.crlf = src.text.includes("\r\n");
    this.bom = src.text.startsWith("\uFEFF");
    this.original = src.text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    this.area.value = this.original;
    const ratio = this.scrollRatio();

    this.editing = true;
    document.body.classList.add("editing");
    this.host.doc.hidden = true;
    this.area.hidden = false;
    this.autosize();
    this.setRatio(ratio);

    // Put the cursor near what was on screen, without jumping the page.
    const at = this.original.lastIndexOf("\n", Math.floor(ratio * this.original.length)) + 1;
    this.area.setSelectionRange(at, at);
    this.area.focus({ preventScroll: true });
    this.refresh();
  }

  async save(): Promise<void> {
    if (!this.editing) return;
    const { path } = this.host.source();
    if (!path || !isDesktop) return this.saveAs();
    if (!this.dirty) return this.finish();
    await this.write(path);
  }

  async saveAs(): Promise<void> {
    if (!this.editing) return;
    this.toggleMenu(false);
    const src = this.host.source();
    if (!isDesktop) {
      // Browser preview: download the file instead.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([this.output()], { type: "text/markdown" }));
      a.download = `${src.name || "Untitled"}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      const ratio = this.scrollRatio();
      const text = this.output();
      this.finish();
      this.host.saved(text, null, ratio);
      return;
    }
    const path = await pickSavePath(src.name, src.dir);
    if (path) await this.write(path);
  }

  /** Leave edit mode; asks first if there are unsaved changes. */
  async stop(): Promise<boolean> {
    this.toggleMenu(false);
    if (!this.editing) return true;
    if (this.dirty && !(await askYesNo("Your changes haven't been saved. Throw them away?", "Unsaved changes", "Discard changes", "Keep editing"))) {
      this.area.focus({ preventScroll: true });
      return false;
    }
    this.finish();
    return true;
  }

  private async write(path: string): Promise<void> {
    const text = this.output();
    const ratio = this.scrollRatio();
    try {
      await writePath(path, text);
    } catch (err) {
      this.host.status(String(err), true);
      return;
    }
    this.finish();
    this.host.saved(text, path, ratio);
    this.host.status("Saved");
  }

  private output(): string {
    const text = this.crlf ? this.area.value.replace(/\n/g, "\r\n") : this.area.value;
    return this.bom ? `\uFEFF${text}` : text;
  }

  private finish(): void {
    const ratio = this.scrollRatio();
    this.editing = false;
    document.body.classList.remove("editing");
    this.area.hidden = true;
    this.area.value = "";
    this.host.doc.hidden = false;
    this.setRatio(ratio);
    this.toggleMenu(false);
    this.refresh();
  }

  private toggleMenu(force?: boolean): void {
    const open = force ?? this.menu.hidden;
    if (open) {
      const dirty = this.dirty;
      this.menu.innerHTML = "";
      const item = (label: string, key: string, fn: () => void) => {
        const b = document.createElement("button");
        b.setAttribute("role", "menuitem");
        b.innerHTML = `<span>${label}</span><kbd>${key}</kbd>`;
        b.onclick = () => {
          this.toggleMenu(false);
          fn();
        };
        this.menu.append(b);
      };
      item("Save", "Ctrl+S", () => this.save());
      item("Save as…", "Ctrl+Shift+S", () => this.saveAs());
      this.menu.append(document.createElement("hr"));
      item(dirty ? "Discard changes" : "Stop editing", "Esc", () => this.stop());
    }
    this.menu.hidden = !open;
    this.caret.setAttribute("aria-expanded", String(open));
  }

  private refresh(): void {
    const dirty = this.dirty;
    this.btn.textContent = this.editing ? "Save" : "Edit";
    this.btn.title = this.editing ? "Save changes (Ctrl+S)" : "Edit this document (E)";
    this.btn.classList.toggle("primary", this.editing);
    this.btn.classList.toggle("dirty", dirty);
    this.caret.hidden = !this.editing;
    document.getElementById("edit-group")!.classList.toggle("split", this.editing);
    // The toolbar title shows "· Editing" or "· Unsaved changes" from these classes.
    document.body.classList.toggle("dirty", dirty);
  }

  private autosize(): void {
    const top = this.host.scroller.scrollTop;
    this.area.style.height = "auto";
    this.area.style.height = `${this.area.scrollHeight + 4}px`;
    this.host.scroller.scrollTop = top;
  }

  private scrollRatio(): number {
    const s = this.host.scroller;
    const max = s.scrollHeight - s.clientHeight;
    return max > 0 ? s.scrollTop / max : 0;
  }

  private setRatio(r: number): void {
    const s = this.host.scroller;
    s.style.scrollBehavior = "auto";
    s.scrollTop = r * (s.scrollHeight - s.clientHeight);
    s.style.scrollBehavior = "";
  }
}
