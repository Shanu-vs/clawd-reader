// Markdown -> safe HTML, with syntax highlighting, math, numbered figures/tables and heading anchors.
//
// Beyond CommonMark + GFM tables it understands the "study notes" conventions:
//   % title: / % subtitle: / % author: lines at the very top   -> title block
//   $inline math$  and  $$[1.2] ... $$ display math (tag optional) -> KaTeX
//   ![caption](relative/path.png){width=70}                    -> numbered figure, 70% wide
//   Table: caption   (line right before a pipe table)           -> numbered table caption
//   \newpage on its own line                                     -> page break in the PDF
//
// Plus the formats people bring from GitHub, Obsidian and Typora:
//   --- YAML front matter ---          hidden (title/subtitle/author used for the title block)
//   ```mermaid                         flowcharts and other diagrams (drawn later by diagrams.ts)
//   ```math                            display maths, like on GitHub
//   $\ce{H2O}$                         chemistry (KaTeX mhchem)
//   > [!NOTE] / [!TIP] / [!WARNING]    callouts (GitHub alerts and Obsidian callouts, foldable with + / -)
//   text[^1] ... [^1]: note            footnotes
//   ==highlight==  H~2~O  x^2^         highlight, subscript, superscript
//   :smile:                            emoji
//   Term / : definition                definition lists
//   [[Note]] [[Note#Part|label]]       wiki links to other notes; ![[picture.png]] embeds a picture
import MarkdownItFactory, { type MarkdownIt } from "markdown-it";
import footnote from "markdown-it-footnote";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import deflist from "markdown-it-deflist";
import { full as emoji } from "markdown-it-emoji";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import katex from "katex";
import "katex/contrib/mhchem";

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface TitleBlock {
  title?: string;
  subtitle?: string;
  author?: string;
}

export interface RenderOptions {
  /**
   * Desktop: mark images that live on disk (relative or absolute paths) with data-local-src
   * instead of src, so the app can read the files and show them.
   */
  localImages?: boolean;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function tex(src: string, displayMode: boolean): string {
  return katex.renderToString(src, { displayMode, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
}

// ---------- math plugin ----------
function mathPlugin(md: MarkdownIt): void {
  // Inline $...$: no space after the opening $, none before the closing $, and the closing $
  // is not followed by a digit (so "$5 and $10" stays text).
  md.inline.ruler.after("escape", "math_inline", (state, silent) => {
    const src = state.src;
    const start = state.pos;
    if (src.charCodeAt(start) !== 0x24 || src.charCodeAt(start + 1) === 0x24) return false;
    const next = src.charAt(start + 1);
    if (!next || /\s/.test(next)) return false;
    let end = start + 1;
    while ((end = src.indexOf("$", end)) !== -1) {
      if (src.charAt(end - 1) === "\\") {
        end++;
        continue;
      }
      if (/\s/.test(src.charAt(end - 1)) || /\d/.test(src.charAt(end + 1) || "")) {
        end++;
        continue;
      }
      break;
    }
    if (end === -1) return false;
    if (!silent) {
      const token = state.push("math_inline", "math", 0);
      token.content = src.slice(start + 1, end);
    }
    state.pos = end + 1;
    return true;
  });

  // Display $$ blocks: "$$[tag]" or "$$" on its own line ... "$$", or a one-line "$$ x $$".
  md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const lineText = (n: number) => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]);
    const first = lineText(startLine);
    const oneLine = /^\$\$(.+)\$\$\s*$/.exec(first);
    const open = /^\$\$(?:\[([^\]]+)\])?\s*$/.exec(first);
    if (!oneLine && !open) return false;
    if (silent) return true;

    let content = "";
    let next = startLine + 1;
    if (oneLine) content = oneLine[1];
    else {
      const lines: string[] = [];
      while (next < endLine && lineText(next).trim() !== "$$") lines.push(lineText(next++));
      if (next >= endLine) return false; // unclosed: leave as text
      content = lines.join("\n");
      next++;
    }
    const token = state.push("math_block", "math", 0);
    token.content = content;
    token.info = open?.[1] ?? "";
    token.map = [startLine, next];
    state.line = next;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, i) => tex(tokens[i].content, false);
  md.renderer.rules.math_block = (tokens, i) => {
    const tag = tokens[i].info;
    return (
      `<div class="math-display${tag ? " tagged" : ""}"><div class="math-body">${tex(tokens[i].content, true)}</div>` +
      (tag ? `<span class="eq-tag">(${escapeHtml(tag)})</span>` : "") +
      `</div>\n`
    );
  };
}

// ---------- ```math and ```mermaid fences ----------
function fencePlugin(md: MarkdownIt): void {
  const plain = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const tok = tokens[idx];
    const lang = tok.info.trim().split(/\s+/)[0].toLowerCase();
    if (lang === "math") {
      return `<div class="math-display"><div class="math-body">${tex(tok.content, true)}</div></div>\n`;
    }
    if (lang === "mermaid") {
      // The diagram is drawn after the page is shown (diagrams.ts); until then, show its source.
      return `<div class="diagram" data-diagram="${encodeURIComponent(tok.content)}"><pre class="diagram-src">${escapeHtml(tok.content)}</pre></div>\n`;
    }
    return plain(tokens, idx, options, env, self);
  };
}

// ---------- [[wiki links]] and ![[embeds]] ----------
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

function wikiLinkPlugin(md: MarkdownIt): void {
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const src = state.src;
    let pos = state.pos;
    const embed = src.charCodeAt(pos) === 0x21; // "!"
    if (embed) pos++;
    if (!src.startsWith("[[", pos)) return false;
    const end = src.indexOf("]]", pos + 2);
    if (end === -1) return false;
    const inner = src.slice(pos + 2, end);
    if (!inner.trim() || inner.includes("\n") || inner.includes("[")) return false;
    if (!silent) {
      const [target, alias] = inner.split("|").map((s) => s.trim());
      if (embed && IMAGE_EXT.test(target)) {
        const tok = state.push("wiki_image", "img", 0);
        tok.attrSet("src", target);
        if (alias && /^\d+$/.test(alias)) tok.attrSet("width", alias);
      } else {
        const [file, part] = target.split("#");
        const tok = state.push("wiki_link", "a", 0);
        tok.attrSet("data-wiki", target);
        tok.content = alias || (file ? (part ? `${file} › ${part}` : file) : part ?? target);
      }
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.wiki_link = (tokens, i) =>
    `<a class="wikilink" href="#" data-wiki="${escapeHtml(String(tokens[i].attrGet("data-wiki")))}">${escapeHtml(tokens[i].content)}</a>`;
  md.renderer.rules.wiki_image = (tokens, i) => {
    const w = tokens[i].attrGet("width");
    return `<img src="${escapeHtml(encodeURI(String(tokens[i].attrGet("src"))))}" alt=""${w ? ` width="${w}"` : ""}>`;
  };
}

const md: MarkdownIt = MarkdownItFactory({
  html: true, // allowed, but everything is sanitized by DOMPurify below
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        /* fall through */
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  },
})
  .use(mathPlugin)
  .use(fencePlugin)
  .use(wikiLinkPlugin)
  .use(footnote)
  .use(mark)
  .use(sub)
  .use(sup)
  .use(deflist)
  .use(emoji);

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section"
  );
}

/** Pull out the "% key: value" title block and normalise a few study-notes conventions. */
function preprocess(source: string): { body: string; title: TitleBlock } {
  const title: TitleBlock = {};
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  // YAML front matter (Obsidian, Jekyll, Hugo...): hide it, but use its title/subtitle/author.
  if (lines[0]?.trim() === "---") {
    const close = lines.findIndex((l, n) => n > 0 && /^(---|\.\.\.)\s*$/.test(l));
    const yamlish = close > 0 && lines.slice(1, close).every((l) => !l.trim() || /^\s*#|^[\w .-]+\s*:|^\s+|^\s*-\s/.test(l));
    if (yamlish) {
      for (const l of lines.slice(1, close)) {
        const m = /^(title|subtitle|author)\s*:\s*(.+)$/i.exec(l);
        if (m) (title as Record<string, string>)[m[1].toLowerCase()] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
      }
      i = close + 1;
    }
  }

  while (i < lines.length) {
    const m = /^%\s*(title|subtitle|author|running)\s*:\s*(.*)$/i.exec(lines[i]);
    if (!m) break;
    const key = m[1].toLowerCase();
    if (key !== "running") (title as Record<string, string>)[key] = m[2].trim();
    i++;
  }
  const out: string[] = [];
  for (const line of lines.slice(i)) {
    if (/^\s*\\newpage\s*$/.test(line)) {
      out.push("", '<div class="page-break"></div>', "");
      continue;
    }
    out.push(line);
    // A "Table:" caption line must be its own paragraph so the table below still parses.
    if (/^Table:\s/.test(line)) out.push("");
  }
  return { body: out.join("\n"), title };
}

/** Numbered figures/table captions, figure widths and image paths, done on the sanitized DOM. */
function postprocess(html: string, opts: RenderOptions): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const root = tpl.content;
  let fig = 0;
  let tab = 0;

  for (const img of Array.from(root.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    if (opts.localImages && src && !/^(https?:|data:|blob:)/i.test(src)) {
      img.dataset.localSrc = src;
      img.removeAttribute("src");
    }

    // "{width=70}" directly after the image.
    const after = img.nextSibling;
    let width: number | null = null;
    if (after && after.nodeType === Node.TEXT_NODE) {
      const m = /^\s*\{\s*width\s*=\s*(\d+(?:\.\d+)?)%?\s*\}/.exec(after.textContent ?? "");
      if (m) {
        width = Number(m[1]);
        after.textContent = (after.textContent ?? "").slice(m[0].length);
      }
    }

    // An image alone in its paragraph becomes a numbered figure with its alt text as caption.
    const p = img.parentElement;
    const alone = p && p.tagName === "P" && Array.from(p.childNodes).every((n) => n === img || !(n.textContent ?? "").trim());
    if (alone) {
      const figure = document.createElement("figure");
      figure.id = `figure-${fig + 1}`;
      if (width) figure.style.setProperty("--fig-width", `${Math.min(100, width)}%`);
      const caption = img.getAttribute("alt");
      figure.append(img);
      if (caption) {
        const fc = document.createElement("figcaption");
        fc.innerHTML = `<strong>Figure ${++fig}.</strong> ${renderInline(caption)}`;
        figure.append(fc);
      }
      p!.replaceWith(figure);
    } else if (width) img.style.width = `${width}%`;
  }

  for (const p of Array.from(root.querySelectorAll("p"))) {
    const m = /^Table:\s*/.exec(p.textContent ?? "");
    const next = p.nextElementSibling;
    if (!m || next?.tagName !== "TABLE") continue;
    const cap = document.createElement("caption");
    cap.innerHTML = p.innerHTML.replace(/^Table:\s*/, `<strong>Table ${++tab}.</strong> `);
    next.prepend(cap);
    p.remove();
  }

  // Task lists: "- [ ] todo" and "- [x] done" become (read-only) checkboxes, like on GitHub.
  for (const li of Array.from(root.querySelectorAll("li"))) {
    const holder = li.firstElementChild?.tagName === "P" ? li.firstElementChild : li;
    const first = holder.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) continue;
    const m = /^\[([ xX])\]\s+/.exec(first.textContent ?? "");
    if (!m) continue;
    first.textContent = (first.textContent ?? "").slice(m[0].length);
    const box = document.createElement("input");
    box.type = "checkbox";
    box.disabled = true;
    box.defaultChecked = m[1] !== " "; // the attribute, so it survives turning the DOM back into HTML
    holder.insertBefore(box, first);
    li.classList.add("task");
    li.parentElement?.classList.add("task-list");
  }

  // Callouts: a quote that starts with [!NOTE], [!TIP], [!WARNING]... (GitHub and Obsidian).
  for (const quote of Array.from(root.querySelectorAll("blockquote"))) makeCallout(quote);

  const div = document.createElement("div");
  div.append(root);
  return div.innerHTML;
}

// Callout kinds: GitHub's five, plus Obsidian's names mapped onto the closest look.
const CALLOUT_KIND: Record<string, string> = {
  note: "note", info: "note", todo: "note", abstract: "note", summary: "note", tldr: "note", quote: "note", cite: "note", example: "note",
  tip: "tip", hint: "tip", success: "tip", check: "tip", done: "tip",
  important: "important", question: "important", help: "important", faq: "important",
  warning: "warning", attention: "warning",
  caution: "caution", danger: "caution", error: "caution", failure: "caution", fail: "caution", missing: "caution", bug: "caution",
};
const CALLOUT_ICON: Record<string, string> = {
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  tip: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  important: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4M12 14h.01"/>',
  warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  caution: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="M12 8v4M12 16h.01"/>',
};

function makeCallout(quote: HTMLQuoteElement): void {
  const p = quote.firstElementChild;
  const first = p?.tagName === "P" ? p.firstChild : null;
  if (!first || first.nodeType !== Node.TEXT_NODE) return;
  const m = /^\[!(\w+)\]([+-]?)[ \t]*([^\n]*)\n?/.exec(first.textContent ?? "");
  if (!m) return;
  const type = m[1].toLowerCase();
  const kind = CALLOUT_KIND[type] ?? "note";
  first.textContent = (first.textContent ?? "").slice(m[0].length);
  // A plain-text title written after the marker, or the kind's name.
  const titleHtml = m[3] ? escapeHtml(m[3]) : escapeHtml(type.charAt(0).toUpperCase() + type.slice(1));
  if (!(p!.textContent ?? "").trim() && !p!.querySelector("img")) p!.remove();

  const fold = m[2];
  const box = document.createElement(fold ? "details" : "div");
  box.className = `callout callout-${kind}`;
  if (fold === "+") box.setAttribute("open", "");
  const head = document.createElement(fold ? "summary" : "div");
  head.className = "callout-title";
  head.innerHTML =
    `<svg class="callout-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CALLOUT_ICON[kind]}</svg>` +
    `<span>${titleHtml}</span>`;
  const body = document.createElement("div");
  body.className = "callout-body";
  body.append(...Array.from(quote.childNodes));
  box.append(head, body);
  quote.replaceWith(box);
}

function renderInline(text: string): string {
  return DOMPurify.sanitize(md.renderInline(text));
}

export function renderMarkdown(
  source: string,
  opts: RenderOptions = {},
): { html: string; headings: Heading[]; title: TitleBlock } {
  const { body, title } = preprocess(source);
  const env = {};
  const tokens = md.parse(body, env);
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  // Give every heading a unique id so the contents panel can jump to it.
  tokens.forEach((tok, i) => {
    if (tok.type !== "heading_open") return;
    const inline = tokens[i + 1];
    const text = inline?.children?.map((c) => (c.type === "math_inline" ? c.content : c.content)).join("") ?? inline?.content ?? "";
    let id = slugify(text);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n}`;
    tok.attrSet("id", id);
    headings.push({ level: Number(tok.tag.slice(1)), text, id });
  });

  const raw = md.renderer.render(tokens, md.options, env);
  const clean = DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
  let html = postprocess(clean, opts);

  if (title.title || title.subtitle || title.author) {
    const t = (s: string | undefined, cls: string) => (s ? `<div class="${cls}">${renderInline(s)}</div>` : "");
    html = `<header class="doc-title">${t(title.title, "doc-title-main")}${t(title.subtitle, "doc-title-sub")}${t(title.author, "doc-title-author")}</header>` + html;
  }
  return { html, headings, title };
}

export function readingStats(source: string): { words: number; minutes: number } {
  const words = source
    .replace(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)\s*(?:\r?\n|$)/, " ")
    .replace(/```[\s\S]*?```/g, " ").replace(/\$\$[\s\S]*?\$\$/g, " ").split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 230)) };
}
