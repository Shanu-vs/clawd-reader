// Contents panel in the style of a PDF viewer's sidebar: a rail with two tabs
// (Figures, Contents), a collapsible chapter tree, and a figure list with thumbnails.
import type { Heading } from "../markdown";

interface TreeNode {
  h: Heading;
  children: TreeNode[];
}

const ICON_FIGURES = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M4 17l5-5 4 4 2.5-2.5L20 18"/></svg>`;
const ICON_CONTENTS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>`;

const NARROW = 900; // below this width the panel floats over the text instead of docking

export class ContentsPanel {
  private tab: "contents" | "figures" = "contents";
  private list: HTMLOListElement;
  private figList: HTMLOListElement;
  private heading: HTMLElement;
  private tabContents: HTMLButtonElement;
  private tabFigures: HTMLButtonElement;
  private entries: { id: string; a: HTMLAnchorElement; chain: HTMLLIElement[] }[] = [];
  private currentId = "";

  constructor(
    panel: HTMLElement,
    private doc: HTMLElement,
    private onNavigate: () => void,
  ) {
    panel.innerHTML = `
      <div class="toc-head">
        <span class="toc-heading">Table of Contents</span>
        <button class="panel-close" data-close="toc" aria-label="Close contents">×</button>
      </div>
      <div class="toc-body">
        <div class="toc-rail">
          <button class="toc-tab" data-tab="figures" title="Figures" aria-label="Figures">${ICON_FIGURES}</button>
          <button class="toc-tab active" data-tab="contents" title="Contents" aria-label="Contents">${ICON_CONTENTS}</button>
        </div>
        <div class="toc-pane">
          <ol class="toc-tree" role="tree"></ol>
          <ol class="fig-list" hidden></ol>
        </div>
      </div>`;
    this.list = panel.querySelector(".toc-tree")!;
    this.figList = panel.querySelector(".fig-list")!;
    this.heading = panel.querySelector(".toc-heading")!;
    this.tabFigures = panel.querySelector('[data-tab="figures"]')!;
    this.tabContents = panel.querySelector('[data-tab="contents"]')!;
    this.tabFigures.onclick = () => this.showTab("figures");
    this.tabContents.onclick = () => this.showTab("contents");

    this.list.addEventListener("click", (e) => {
      const t = e.target as Element;
      const twisty = t.closest(".twisty");
      if (twisty) {
        twisty.closest("li")!.classList.toggle("open");
        return;
      }
      const a = t.closest<HTMLAnchorElement>("a.toc-link");
      if (!a) return;
      e.preventDefault();
      a.closest("li")!.classList.add("open");
      this.jump(document.getElementById(a.dataset.target!), "start");
    });
    this.figList.addEventListener("click", (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>("button[data-target]");
      if (b) this.jump(document.getElementById(b.dataset.target!), "center");
    });
  }

  get isEmpty(): boolean {
    return this.entries.length === 0 && this.figList.children.length === 0;
  }

  private jump(el: HTMLElement | null, block: ScrollLogicalPosition): void {
    el?.scrollIntoView({ behavior: "smooth", block });
    if (window.innerWidth < NARROW) this.onNavigate();
  }

  private showTab(tab: "contents" | "figures"): void {
    this.tab = tab;
    this.tabContents.classList.toggle("active", tab === "contents");
    this.tabFigures.classList.toggle("active", tab === "figures");
    this.list.hidden = tab !== "contents";
    this.figList.hidden = tab !== "figures";
    this.heading.textContent = tab === "contents" ? "Table of Contents" : "Figures";
  }

  /** Build the chapter tree from the document's headings. */
  setDocument(headings: Heading[]): void {
    const roots: TreeNode[] = [];
    const stack: TreeNode[] = [];
    for (const h of headings) {
      const node: TreeNode = { h, children: [] };
      while (stack.length && stack[stack.length - 1].h.level >= h.level) stack.pop();
      (stack.length ? stack[stack.length - 1].children : roots).push(node);
      stack.push(node);
    }

    this.entries = [];
    this.currentId = "";
    this.list.innerHTML = "";
    const build = (nodes: TreeNode[], parent: HTMLElement, depth: number, chain: HTMLLIElement[]) => {
      for (const n of nodes) {
        const li = document.createElement("li");
        li.className = "toc-item";
        li.setAttribute("role", "treeitem");
        const row = document.createElement("div");
        row.className = "toc-row";
        row.style.setProperty("--depth", String(depth));
        const twisty = document.createElement(n.children.length ? "button" : "span");
        twisty.className = n.children.length ? "twisty" : "twisty-space";
        if (n.children.length) twisty.setAttribute("aria-label", "Expand or collapse");
        const a = document.createElement("a");
        a.className = "toc-link";
        a.href = `#${n.h.id}`;
        a.dataset.target = n.h.id;
        a.textContent = n.h.text;
        row.append(twisty, a);
        li.append(row);
        parent.append(li);
        const myChain = [...chain, li];
        this.entries.push({ id: n.h.id, a, chain: myChain });
        if (n.children.length) {
          const ol = document.createElement("ol");
          ol.className = "toc-children";
          ol.setAttribute("role", "group");
          li.append(ol);
          build(n.children, ol, depth + 1, myChain);
        }
      }
    };
    build(roots, this.list, 0, []);
    this.refreshFigures();
  }

  /** List the document's figures (call again once images have loaded, for thumbnails). */
  refreshFigures(): void {
    this.figList.innerHTML = "";
    for (const fig of Array.from(this.doc.querySelectorAll<HTMLElement>("figure[id]"))) {
      const img = fig.querySelector("img");
      const caption = fig.querySelector("figcaption")?.textContent ?? fig.id;
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.dataset.target = fig.id;
      if (img?.src) {
        const thumb = document.createElement("img");
        thumb.src = img.src;
        thumb.alt = "";
        b.append(thumb);
      }
      const span = document.createElement("span");
      span.textContent = caption;
      b.append(span);
      li.append(b);
      this.figList.append(li);
    }
    this.tabFigures.hidden = this.figList.children.length === 0;
    if (this.tabFigures.hidden && this.tab === "figures") this.showTab("contents");
  }

  /** Mark the section you're reading and open its chapter. */
  highlight(): void {
    let current: (typeof this.entries)[number] | undefined;
    for (const e of this.entries) {
      const el = document.getElementById(e.id);
      if (el && el.getBoundingClientRect().top < 140) current = e;
      else if (el) break;
    }
    const id = current?.id ?? "";
    if (id === this.currentId) return;
    this.currentId = id;
    for (const e of this.entries) e.a.classList.toggle("current", e === current);
    if (current) {
      current.chain.slice(0, -1).forEach((li) => li.classList.add("open"));
      current.a.scrollIntoView({ block: "nearest" });
    }
  }
}

export const isNarrow = () => window.innerWidth < NARROW;
