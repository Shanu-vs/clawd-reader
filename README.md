# MD Reader

A calm, lightweight **desktop** Markdown reader. Your document sits on a soft reading column while a **live wallpaper** moves behind it: a starfield, fireflies, flowing currents, rain ripples, or a pixel-art world with a little traveler. Move your mouse and it reacts; click the background for a ripple.

Built with [Tauri](https://tauri.app) (uses Windows' built-in WebView2, so the app is small and light), Vite and TypeScript.

## Features

- **Reading**: open, drag-and-drop or paste Markdown. Syntax-highlighted code, tables, task lists, table of contents, reading progress and reading time. Your last document and scroll position are remembered.
- **Themes**: Paper (White, Sepia, Sage, Rose), Night (Indigo, Ocean, Forest, Purple, Ember, Graphite), Pixel Quest, High Contrast. Quick light/dark toggle. Pixel Quest gives the whole app a chunky retro-game look with a pixel font.
- **Live wallpapers**, each adjustable in Settings:
  - **Starfield**: star count, drift speed and direction, size, brightness, twinkle, shooting stars, parallax, cursor glow, ripple or warp on click.
  - **Fireflies**: wander and blink, gather near the cursor, scatter on click.
  - **Flowing currents**: soft trails following a slowly changing flow; the cursor stirs a whirlpool.
  - **Rain ripples**: falling rain, rings on a pond, cursor drips drops, click to splash.
  - **Pixel world**: **Claw'd, the Claude crab** (a flat, blocky terracotta critter with square eyes, side arms and four legs) walks through six pixel-art places: Green Meadow, Sunny Beach, Snowy Peaks, Desert Canyon, Autumn Woods and Under the Sea. The place changes every 30 minutes (adjustable) with a smooth crossfade and a "~ Sunny Beach ~" title card. Each place has its own props (cottage, lighthouse, snowman, cacti, well, treasure chest…), weather (snow, falling leaves, bubbles) and visitors (birds, gulls, fish). The sky follows your clock. Claw'd steps its legs in pairs, blinks, glances around, waves an arm now and then, throws both arms up when it hops (click), and falls asleep at night if it stops walking.
- **Light on resources**: frame-rate cap (15–60 fps), pauses when minimised, slows while scrolling, respects Windows "reduce animations".
- **Export to PDF**: clean black-on-white pages without the wallpaper.
- **Focus mode**: calmer stars and the toolbar hides until you hover over it.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `O` / `Ctrl+O` | Open a file |
| `T` | Switch light / dark |
| `F` | Focus mode |
| `C` | Table of contents |
| `S` | Settings |
| `P` / `Ctrl+P` | Export to PDF |
| `Esc` | Close panels |

## Development

### One-time setup (Windows)

1. Install [Node.js](https://nodejs.org) (LTS).
2. Install **Microsoft C++ Build Tools** with the *Desktop development with C++* workload:
   ```bash
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
3. Install **Rust**:
   ```bash
   winget install Rustlang.Rustup
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

### Run

```bash
npm run app        # desktop app with hot reload
npm run dev        # browser-only preview at http://localhost:5173
```

### Build the installer

```bash
npm run app:build
```

The installer appears in `src-tauri/target/release/bundle/` (`.exe` via NSIS and `.msi`).

## Project layout

```
src/
  main.ts                 app wiring: loading docs, toolbar, shortcuts, drag & drop
  markdown.ts             Markdown -> sanitised HTML, headings for the contents panel
  settings.ts             typed settings with defaults, saved locally
  themes.ts               theme colour definitions
  ui/settingsPanel.ts     settings panel (declarative list of controls)
  wallpaper/
    types.ts              interface every wallpaper effect implements
    host.ts               runs the effect: fps cap, pause, reduced motion
    starfield.ts          starfield effect
    fireflies.ts          fireflies effect
    currents.ts           flowing currents effect
    rain.ts               rain ripples effect
    pixel/
      world.ts            pixel world: location rotation, crossfade, crab placement
      biomes.ts           the six locations (pure data)
      scene.ts            draws one location: sky, layers, decor, weather
      props.ts            scenery props (cottage, palm, lighthouse, snowman…)
      crab.ts             the animated Claude crab
      kit.ts              pixel helpers (colours, seeded random, sprites)
  styles/                 app, Markdown and print (PDF) styles
src-tauri/                desktop wrapper (Rust)
```

## Roadmap

- [ ] More wallpapers: aurora, snow, falling leaves
- [ ] Open `.md` files by double-clicking them in Explorer
- [ ] Auto-reload when the file changes on disk
- [ ] Share button and GitHub Releases installer builds

## Credits

Claw'd, the Claude crab, is Anthropic's character. This is an unofficial, fan-made project and is not affiliated with or endorsed by Anthropic.
