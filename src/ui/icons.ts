// One consistent set of thin line icons (24×24, 1.6px stroke), in the spirit of Windows 11's
// Segoe Fluent Icons. The gear is adapted from Feather Icons (MIT licence).

const PATHS: Record<string, string> = {
  open: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  contents: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15M12.5 9h5M12.5 12h5M12.5 15h3"/>',
  edit: '<path d="M4.5 19.5h3.8L18.8 9a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4z"/><path d="M14.3 7.3l2.4 2.4"/>',
  save: '<path d="M5 4.5h11l3.5 3.5v11a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V5a.5.5 0 0 1 .5-.5z"/><path d="M8 4.5v4.5h7V4.5M8 19.5v-5.5h8v5.5"/>',
  pause: '<path d="M9 6.5v11M15 6.5v11"/>',
  play: '<path d="M8.5 6v12l9.5-6z"/>',
  theme: '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none"/>',
  focus: '<path d="M4.5 9V5.5a1 1 0 0 1 1-1H9M15 4.5h3.5a1 1 0 0 1 1 1V9M19.5 15v3.5a1 1 0 0 1-1 1H15M9 19.5H5.5a1 1 0 0 1-1-1V15"/>',
  pdf: '<path d="M6.5 3.5h7l4 4v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.5 3.5v4h4M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
  settings:
    '<circle cx="12" cy="12" r="2.8"/><path d="M19 14.6a1.4 1.4 0 0 0 .3 1.5l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-1.5-.3 1.4 1.4 0 0 0-.8 1.3v.2a1.7 1.7 0 0 1-3.4 0v-.1a1.4 1.4 0 0 0-.9-1.3 1.4 1.4 0 0 0-1.5.3l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.4 1.4 0 0 0 .3-1.5 1.4 1.4 0 0 0-1.3-.8h-.2a1.7 1.7 0 0 1 0-3.4h.1a1.4 1.4 0 0 0 1.3-.9 1.4 1.4 0 0 0-.3-1.5l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.4 1.4 0 0 0 1.5.3h.1a1.4 1.4 0 0 0 .8-1.3v-.2a1.7 1.7 0 0 1 3.4 0v.1a1.4 1.4 0 0 0 .8 1.3 1.4 1.4 0 0 0 1.5-.3l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.4 1.4 0 0 0-.3 1.5v.1a1.4 1.4 0 0 0 1.3.8h.2a1.7 1.7 0 0 1 0 3.4h-.1a1.4 1.4 0 0 0-1.3.8z"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  // Window controls use the thinner, square Windows style.
  minimize: '<path d="M6.5 12h11"/>',
  maximize: '<rect x="6.5" y="6.5" width="11" height="11" rx="1"/>',
  restore: '<rect x="6.5" y="8.5" width="9" height="9" rx="1"/><path d="M9 8.5V7.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1h-1"/>',
  close: '<path d="M7 7l10 10M17 7 7 17"/>',
};

export function icon(name: keyof typeof PATHS | string, size = 18): string {
  const thin = ["minimize", "maximize", "restore", "close"].includes(name);
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${thin ? 1.2 : 1.6}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? ""}</svg>`;
}

/** Fill every `[data-icon]` element with its icon (placed before any label text). */
export function applyIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.querySelector(":scope > svg.ic")?.remove();
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon!));
  });
}
