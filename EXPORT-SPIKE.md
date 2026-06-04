# Export Spike

This file tracks early export validation before MarkLeaf commits to the full Phase 3 export system.

## Current PDF Baseline

Status: first-pass implementation

Approach:

- Renderer generates Markdown HTML with the same `markdown-it` path used by the Styled pane.
- Renderer sends the current built-in CSS, selected style class, sidecar page settings, export settings, and document metadata to the Electron main process.
- Electron creates a hidden export window containing only the styled document, not the app UI.
- Electron exports that hidden document with `webContents.printToPDF()`.
- Generated print CSS applies sidecar page size and orientation with `@page`.
- PDF margins are simulated with padding inside the painted export page so document backgrounds can cover the full PDF canvas.
- The export renderer extracts `--doc-color-background` from the selected CSS and applies it to the PDF page background because Chromium does not reliably paint `@page background` alone.

Current behavior:

- `Export PDF` is available from the command bar and File menu.
- Unsaved documents must be saved before export.
- Dirty saved documents are saved before export.
- Documents in `Disk changed` state must be resolved before export.
- PDF output uses the selected built-in style and sidecar page settings.
- PDF page and margin backgrounds use the selected style's `--doc-color-background`.
- Document-relative images can resolve from the Markdown file location.

Fixture:

- `examples/lorem-style-sampler.md`
- `examples/lorem-style-sampler.md.meta.json`

## Items To Review Manually

- PDF page size and margins match Document Settings.
- `markleaf-light` and `markleaf-dark` produce acceptable printed output.
- Dark style exports paint the whole page, including top, bottom, and side margin areas.
- Tables, blockquotes, code blocks, links, and images render cleanly.
- Long documents paginate acceptably.
- Link targets remain usable in the exported PDF where Chromium supports them.

## Known Gaps

- Page numbers are stored in settings but not rendered yet.
- No print preview.
- No dedicated success notification beyond a successful save dialog flow.
- DOCX export is not implemented in this spike.
