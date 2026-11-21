# Changelog

All notable changes to MD Reader are listed here. Versions follow [semantic versioning](https://semver.org); installers are on the [Releases page](https://github.com/Shanu-vs/md-reader/releases).

## [Unreleased]

### Changed
- ` ```latex ` and ` ```tex ` blocks are drawn as maths, like ` ```math `. A block holding a whole LaTeX document (`\documentclass`, `\begin{document}`) stays as code.

### Fixed
- Opening or closing the Contents panel (or docking Settings, or resizing the window) no longer jumps the page further down or up; the part you are reading stays in place.

## [0.5.0] - 2026-11-19

### Added
- **Paper themes**: Notebook, Legal pad, Graph, Dot grid, Parchment, Kraft, Newsprint, Watercolour and Blueprint, drawn without image files.
- **Plain themes** (the old Paper colours): flat colour with no moving background, now in nine colours with Sky, Lavender, Peach, Stone and a dark Charcoal.
- **Mermaid diagrams**: flowcharts, sequence diagrams, timelines, mind maps, Gantt and pie charts. Loaded only when a document has one, and drawn offline.
- **Callouts**: GitHub alerts and Obsidian callouts, foldable with `+` / `-`.
- **Wiki links** (`[[Note]]`, `[[Note#Heading|label]]`), links to other `.md` files, and `![[picture.png]]` embeds. `Alt+←` or the mouse back button goes back.
- **Front matter** is hidden, and its title, subtitle and author are used.
- Footnotes, `==highlight==`, subscript and superscript, definition lists, `:emoji:` codes, chemistry (`\ce{…}`) and ` ```math ` blocks.
- `docs/formats.md`, a tour of every supported format.

### Changed
- The light/dark switch turns the moving background on or off the same way choosing a theme does.
- Diagrams are redrawn in light colours for PDF export.
- The installer grew from 3 MB to 4.4 MB (the diagram engine is bundled so it works offline).

## [0.4.0] - 2026-11-18

### Added
- **Windows installer** on the Releases page; MD Reader appears in the Start menu and Windows search.
- `.md`, `.markdown`, `.mdown`, `.mkd` and `.mkdn` files can be opened with MD Reader from Explorer.
- **Night · OLED** theme: true black background, soft grey text.
- MIT licence, and an "Is it safe?" section with a VirusTotal report.

### Changed
- One `setup.exe` instead of separate EXE and MSI installers.

## [0.3.0] - 2026-11-18

### Added
- App icon and About box featuring Claw'd holding a Markdown card.
- Visible pause/play for the moving background (`W`).
- Optional comfortable line length; a "More options" switch hides fine-tuning controls.
- Task-list checkboxes, a README with screenshots and sample notes.

### Changed
- The toolbar doubles as the window title bar, with Windows-style controls.
- Consistent line icons, quieter toolbar buttons and one filled primary action.
- Solid panels and menus, and shared corner-radius sizes.

## [0.2.0] - 2026-11-18

### Added
- Edit mode with Save and Save as, theme families with colour variations, wallpaper colour palettes and the contents sidebar.

## [0.1.0] - 2026-11-17

- First version of the desktop app.

[0.5.0]: https://github.com/Shanu-vs/md-reader/releases/tag/v0.5.0
[0.4.0]: https://github.com/Shanu-vs/md-reader/releases/tag/v0.4.0
[0.3.0]: https://github.com/Shanu-vs/md-reader/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Shanu-vs/md-reader/tree/v0.2.0
