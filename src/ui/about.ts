// "About MD Reader": opened from the little Claw'd mark at the left of the toolbar.
import { version } from "../../package.json";
import { isDesktop } from "../desktop";

const REPO = "https://github.com/Shanu-vs/md-reader";

export function installAbout(): () => void {
  const dlg = document.getElementById("about") as HTMLDialogElement;
  dlg.innerHTML = `
    <img class="ab-icon" src="/clawd.svg" width="76" height="76" alt="" />
    <h2>MD Reader</h2>
    <p class="ab-ver">Version ${version}</p>
    <p>A calm place to read Markdown, with a living background to rest your eyes on.</p>
    <p><a class="ab-link" href="${REPO}">Source code on GitHub</a></p>
    <p class="ab-credit">Claw'd, the Claude crab, is Anthropic's character. This is an unofficial fan project, not affiliated with or endorsed by Anthropic.</p>
    <form method="dialog"><button class="ab-close" autofocus>Close</button></form>`;

  dlg.querySelector<HTMLAnchorElement>(".ab-link")!.onclick = async (e) => {
    e.preventDefault();
    if (isDesktop) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      openUrl(REPO).catch(() => {});
    } else window.open(REPO, "_blank", "noopener");
  };
  // Clicking the dimmed area outside the box closes it.
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
  return () => dlg.showModal();
}
