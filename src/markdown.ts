// Markdown -> safe HTML, with syntax highlighting and heading anchors for the table of contents.
import MarkdownItFactory, { type MarkdownIt } from "markdown-it";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";

export interface Heading {
  level: number;
  text: string;
  id: string;
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
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section"
  );
}

export function renderMarkdown(source: string): { html: string; headings: Heading[] } {
  const env = {};
  const tokens = md.parse(source, env);
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  // Give every heading a unique id so the contents panel can jump to it.
  tokens.forEach((tok, i) => {
    if (tok.type !== "heading_open") return;
    const inline = tokens[i + 1];
    const text = inline?.children?.map((c) => c.content).join("") ?? inline?.content ?? "";
    let id = slugify(text);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n}`;
    tok.attrSet("id", id);
    headings.push({ level: Number(tok.tag.slice(1)), text, id });
  });

  const raw = md.renderer.render(tokens, md.options, env);
  const html = DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
  return { html, headings };
}

export function readingStats(source: string): { words: number; minutes: number } {
  const words = source.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 230)) };
}
