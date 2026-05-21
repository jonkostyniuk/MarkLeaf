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

- Tauri 2.x desktop shell
- Svelte or SvelteKit frontend
- TypeScript frontend logic
- Rust backend commands and system integration
- CodeMirror 6 for raw Markdown editing
- GitHub Flavoured Markdown as the initial Markdown baseline

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

## License

MarkLeaf is licensed under the MIT License. See [LICENSE](LICENSE).

## Specification

The current product and technical specification lives in [markleaf-spec.md](markleaf-spec.md).
