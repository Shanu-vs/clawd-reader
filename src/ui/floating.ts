// Makes a panel movable (drag its header) and dockable (pin it to the right edge so the
// text moves aside instead of being covered). Position and dock state are remembered.

interface PanelState {
  docked: boolean;
  x: number | null;
  y: number | null;
}

const EDGE_SNAP = 28; // dragging within this many px of the right edge docks the panel

export function makeFloating(panel: HTMLElement, handle: HTMLElement, key: string): { setDocked: (d: boolean) => void } {
  let state: PanelState = { docked: false, x: null, y: null };
  try {
    state = { ...state, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    /* defaults */
  }
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  };

  const pinBtn = handle.querySelector<HTMLButtonElement>("[data-pin]");

  const apply = () => {
    panel.classList.toggle("docked", state.docked);
    document.body.classList.toggle(`${panel.id}-docked`, state.docked && !panel.hidden);
    if (pinBtn) {
      pinBtn.classList.toggle("active", state.docked);
      pinBtn.title = state.docked ? "Undock (float freely)" : "Dock to the right edge";
    }
    if (state.docked || state.x === null || state.y === null) {
      panel.style.left = panel.style.top = panel.style.right = panel.style.bottom = panel.style.height = "";
      return;
    }
    const w = panel.offsetWidth || 340;
    const x = Math.min(Math.max(0, state.x), window.innerWidth - Math.min(w, 120));
    const y = Math.min(Math.max(48, state.y), window.innerHeight - 60);
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.height = `${Math.max(200, window.innerHeight - y - 12)}px`;
  };

  const setDocked = (d: boolean) => {
    state.docked = d;
    if (!d && state.x === null) {
      state.x = window.innerWidth - 360;
      state.y = 70;
    }
    save();
    apply();
  };

  pinBtn?.addEventListener("click", () => setDocked(!state.docked));

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as Element).closest("button, input, select")) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    if (state.docked) {
      // Pull it off the edge: it becomes a floating window under the cursor.
      state.docked = false;
    }
    panel.classList.add("dragging");
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      state.x = ev.clientX - dx;
      state.y = ev.clientY - dy;
      panel.classList.toggle("snap-hint", ev.clientX > window.innerWidth - EDGE_SNAP);
      apply();
    };
    const up = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      panel.classList.remove("dragging", "snap-hint");
      if (ev.clientX > window.innerWidth - EDGE_SNAP) state.docked = true;
      save();
      apply();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });

  // Keep the body class in sync when the panel is shown/hidden, and stay on screen on resize.
  new MutationObserver(apply).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("resize", apply);
  apply();
  return { setDocked };
}
