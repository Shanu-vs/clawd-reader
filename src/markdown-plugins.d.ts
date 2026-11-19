// The markdown-it plugins don't ship type definitions; each one is a plain plugin function.
type MarkdownItPlugin = (md: import("markdown-it").MarkdownIt, ...options: unknown[]) => void;

declare module "markdown-it-footnote" {
  const plugin: MarkdownItPlugin;
  export default plugin;
}
declare module "markdown-it-mark" {
  const plugin: MarkdownItPlugin;
  export default plugin;
}
declare module "markdown-it-sub" {
  const plugin: MarkdownItPlugin;
  export default plugin;
}
declare module "markdown-it-sup" {
  const plugin: MarkdownItPlugin;
  export default plugin;
}
declare module "markdown-it-deflist" {
  const plugin: MarkdownItPlugin;
  export default plugin;
}
declare module "markdown-it-emoji" {
  export const full: MarkdownItPlugin;
  export const light: MarkdownItPlugin;
  export const bare: MarkdownItPlugin;
}
