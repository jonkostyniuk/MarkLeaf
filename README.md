# MarkLeaf

MarkLeaf is a planned cross-platform desktop Markdown editor for professional writing, technical documentation, proposals, memos, living notes, and other structured working documents.

The core idea is simple: the Markdown file remains the source of truth. MarkLeaf should provide a polished editing and preview experience without hiding proprietary document data inside the file or pretending Markdown is a full word-processing format.

## What MarkLeaf Is For

MarkLeaf is designed for people who work heavily with AI-generated or AI-edited Markdown. A typical workflow is:

1. Open a single `.md` file.
2. Edit and preview it in MarkLeaf.
3. Let an external AI tool, script, or editor modify the same file.
4. Detect and reload those external changes safely.
5. Export the result to PDF or DOCX.

The app is local-first, open source, and intended to build for macOS, Windows, and Linux.

## Design Principles

- **Markdown first:** `.md` files stay plain-text, portable, and standards-aligned.
- **No fake rich text:** formatting controls should map cleanly to Markdown-supported structures.
- **AI-compatible files:** external tools may edit files while MarkLeaf is open.
- **CSS-based styling:** visual document styles should use normal `.css` files.
- **Sidecar metadata:** page settings, selected style, export preferences, and app state should live beside the Markdown file in optional JSON metadata.
- **Professional export:** PDF and DOCX output should be credible enough for reports, memos, proposals, and Word-based review workflows.

## Planned Technical Direction

The current technical direction is:

- Electron desktop shell
- TypeScript renderer frontend, with Svelte or SvelteKit optional later
- TypeScript frontend logic
- Node.js main process for file access, file watching, native menus, packaging, and export orchestration
- CodeMirror 6 for raw Markdown editing
- `markdown-it` preview rendering with a GitHub Flavoured Markdown-aligned baseline

Export quality is a major early risk. Pandoc is one candidate for DOCX/PDF export, but MarkLeaf should also evaluate other approaches before committing to a final pipeline.

## Development Approach

MarkLeaf should be built iteratively:

1. Prototype the core Markdown editor, preview, file loading, saving, CSS switching, and manual refresh.
2. Validate PDF and DOCX export quality early.
3. Build the MVP editor with file watching, conflict handling, toolbar controls, recent files, word count, settings, and outline support.
4. Add the full export system.
5. Deliver the Word-lite styled editing mode as the Phase 4 product goal.
6. Explore future AI workflow features such as section copy tools, revision diffing, and optional AI/MCP hooks.

The full product goal includes a direct editable Word-lite mode where Markdown syntax is hidden and edits update the underlying Markdown source. That mode should be reached through careful round-trip testing rather than rushed into the first prototype.

## Current Prototype

This repository currently includes the first-pass Electron app for the Phase 1/2 editor workflow. It is still an MVP prototype, not a packaged production desktop app.

Run the Electron app locally with:

```sh
make dev
```

Run the current verification pass with:

```sh
make check
```

Implemented prototype features:

- Markdown source editing
- Blank startup and New Document workspace
- CodeMirror-based Markdown editor
- `markdown-it` preview rendering with GFM-aligned tables, strikethrough, and task lists
- Split source/preview mode
- Right pane labelled `Styled` for the CSS-applied document view
- Draggable Markdown/Styled split-pane divider with minimum pane widths
- Built-in preview styles
- Markdown toolbar actions using Lucide icon buttons with hover/focus tooltips
- Insert Link dialog with display text, explicit Address/Email modes, smart normalization, and Markdown insertion
- Styled-pane web and email links open externally through the OS instead of navigating the app window
- Insert Image dialog with alt text, native image picker, drag/drop, save-first handling, and portable beside-document asset copying
- Paragraph through H6 block formatting, with the outline currently limited to H1-H3
- Block format dropdown follows the current cursor line
- Word and character counts
- Heading outline
- Recent file links, capped at the five most recently opened files
- Collapsible left sidebar sections
- Native Electron open/save/save-as dialogs
- Unsaved new documents remain in memory until the first manual save
- Shared icon-and-colour document status in the title bar and sidebar
- Sidecar metadata creation on save
- Native file watching through the Electron main process with MarkLeaf-owned save events ignored by mtime tracking
- Manual refresh and non-banner `Disk changed` status for external AI/script edits
- Fixed native-app chrome with non-scrolling app bar, command bar, toolbar, pane headers, and status bar
- Desktop-only renderer behavior with a supported minimum Electron window size

Known implementation gaps are tracked in [ISSUES.md](ISSUES.md).

## Project Documents

- [markleaf-spec.md](markleaf-spec.md): product direction, technical architecture, development phases, design principles, and MVP scope.
- [ISSUES.md](ISSUES.md): running backlog for unresolved questions, implementation blockers, follow-up decisions, and resolved project notes.
- [LICENSE](LICENSE): MIT License for the project.

## Common Commands

Use `make help` for the maintained command list. The most common commands are:

- `make install`: install Node dependencies.
- `make build`: build the renderer into `dist/`.
- `make dev`: build and launch the Electron desktop app.
- `make check`: run tests and Electron syntax checks.
- `make clean`: remove generated build output.

## Assets

Brand and logo source files live in [assets/brand](assets/brand). This is the source-of-truth location for logo assets.

Generated output lives in `dist/` and should not be edited or reviewed as source. During local development, the built renderer references source assets from `assets/brand/` rather than copying logos into `dist/`.

Example Markdown files live in [examples](examples). These should remain clean source examples; sidecar `.meta.json` files may be generated while testing but should not be treated as canonical examples unless intentionally added.

## License

MarkLeaf is licensed under the MIT License. See [LICENSE](LICENSE).
