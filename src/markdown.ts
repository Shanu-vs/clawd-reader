// Markdown -> safe HTML, with syntax highlighting, math, numbered figures/tables and heading anchors.
//
// Beyond CommonMark + GFM tables it understands the "study notes" conventions:
//   % title: / % subtitle: / % author: lines at the very top   -> title block
//   $inline math$  and  $$[1.2] ... $$ display math (tag optional) -> KaTeX
//   ![caption](relative/path.png){width=70}                    -> numbered figure, 70% wide
//   Table: caption   (line right before a pipe table)           -> numbered table caption
//   \newpage on its own line                                     -> page break in the PDF
import MarkdownItFactory, { type MarkdownIt } from "markdown-it";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import katex from "katex";

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
}).use(mathPlugin);

function slugify(text: string): string {
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

  const div = document.createElement("div");
  div.append(root);
  return div.innerHTML;
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
  const words = source.replace(/```[\s\S]*?```/g, " ").replace(/\$\$[\s\S]*?\$\$/g, " ").split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 230)) };
}
