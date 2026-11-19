// Mermaid diagrams (flowcharts, sequence diagrams, timelines, mind maps, Gantt and pie charts...).
// Mermaid is large, so it is only loaded the first time a document actually contains a diagram.
// It is bundled with the app, so diagrams work offline.
import type { Mermaid } from "mermaid";

let loading: Promise<Mermaid> | null = null;
let counter = 0;
let run = 0;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Draw every ```mermaid block inside `root`. Safe to call again (e.g. after a light/dark switch). */
export async function renderDiagrams(root: HTMLElement, dark: boolean): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(".diagram[data-diagram]"));
  if (!blocks.length) return;
  const thisRun = ++run;
  const mermaid = await (loading ??= import("mermaid").then((m) => m.default));
  if (thisRun !== run) return; // a newer document (or theme) took over meanwhile
  root.dataset.diagramTheme = dark ? "dark" : "light";
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict", // no scripts or click handlers inside diagrams
    theme: dark ? "dark" : "default",
    fontFamily: getComputedStyle(document.body).fontFamily,
  });

  for (const block of blocks) {
    if (thisRun !== run || !block.isConnected) return;
    const code = decodeURIComponent(block.dataset.diagram!);
    const id = `diagram-${++counter}`;
    try {
      const { svg } = await mermaid.render(id, code);
      block.innerHTML = svg;
      block.classList.remove("diagram-error");
    } catch (err) {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove(); // Mermaid's scratch element, left behind on errors
      const message = String((err as Error)?.message ?? err).split("\n")[0];
      block.innerHTML =
        `<div class="diagram-error-msg">This diagram has a mistake: ${escapeHtml(message)}</div>` +
        `<pre class="diagram-src">${escapeHtml(code)}</pre>`;
      block.classList.add("diagram-error");
    }
  }
}
