# Issues

## Purpose

Use this file as the running backlog for:

- unresolved design questions
- implementation blockers
- toolchain or packaging gaps
- follow-up decisions deferred out of the current task

This is not the roadmap. The product and technical direction lives in [markleaf-spec.md](/Users/jonny/Programming/GitHub/jonkostyniuk/MarkLeaf/markleaf-spec.md).

## Workflow

- Add an issue here when work reveals a question, blocker, or ambiguity that should be resolved later.
- Keep entries short and concrete.
- Close or remove entries once the decision is reflected in `markleaf-spec.md`, `README.md`, or implemented code.
- Prefer linking the impacted file, tool, platform behavior, or implementation area.

## Template

```md
## ISSUE-XXX: Short title

Status: open
Area: app | editor | export | filesystem | tooling | packaging | docs
Raised in: YYYY-MM-DD
Owner: user | codex | shared

Context:
- What was encountered?

Question:
- What needs to be decided or clarified?

Impact:
- What is blocked or at risk?

Next step:
- What should be checked or decided next?
```

## Open

## ISSUE-004: Settings UI and sidecar schema completion

Status: open
Area: app
Raised in: 2026-05-23
Owner: shared

Context:
- MarkLeaf now writes a sidecar metadata file on save.
- The sidecar currently stores a minimal style/view/export structure.
- The MVP spec calls for settings for default mode/style, page size, margins, export defaults, and related document metadata.

Question:
- What exact MVP settings should be exposed in the first settings panel, and which should remain implicit defaults?

Impact:
- Page/export settings and document metadata remain incomplete until the settings UI and sidecar schema are finalized.

Next step:
- Define the MVP sidecar schema fields and build a compact settings panel for default view mode, selected style, page size, margins, and export defaults.

## Resolved

## ISSUE-013: Watcher false-positive disk changed state after autosave

Status: resolved
Area: filesystem
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: codex

Context:
- Editing a saved file in MarkLeaf could briefly save successfully and then switch to `Disk changed`.
- The file watcher was treating MarkLeaf's own save/autosave filesystem events as external edits.
- A simple one-event or timer-only suppression was not reliable enough on macOS because a single save can produce delayed or repeated file events.

Question:
- How should MarkLeaf distinguish its own writes from real background edits by AI tools, scripts, or other editors?

Impact:
- Autosave could appear stuck because `Disk changed` intentionally pauses autosave to avoid overwriting external edits.

Resolution:
- Updated the Electron watcher to track the known file modification time after MarkLeaf opens or writes a file.
- Watch events whose mtime matches the known MarkLeaf-written mtime are ignored.
- Real later external edits still set the renderer's `Disk changed` status.

Next step:
- Add integration or manual QA coverage for save/autosave followed by external edits once desktop UI testing is available.

## ISSUE-012: Shared document status model

Status: resolved
Area: app
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- The title-bar status and left sidebar document status duplicated the same plain text.
- External AI/script edits needed a visible state that was not the old yellow banner.

Question:
- What status states should be shown, and how should they be presented consistently?

Impact:
- Plain duplicated status text made the app feel unfinished and made external-change state ambiguous.

Resolution:
- Added a shared document status renderer used by both the title bar and sidebar.
- Added Lucide status icons and colour-coded states for new document, unsaved, saving, saved, disk changed, and error.
- Added a real `diskChanged` state that pauses autosave and requires explicit Reload from disk.
- Removed the persistent external-change banner from the UI.

Next step:
- Consider adding a confirmation prompt before Reload from disk overwrites dirty local edits.

## ISSUE-011: Recent file links and missing-file handling

Status: resolved
Area: app
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- The Recent panel listed filenames only, without opening functionality.
- Label-only recent entries were not useful for returning to files.

Question:
- How should recent files behave in the Electron MVP?

Impact:
- Recent files were decorative rather than functional.

Resolution:
- Recent files are now path-backed entries capped at five, ordered from most to least recent.
- Clicking a recent file shows a native Yes/No confirmation.
- Dirty saved documents are saved before switching.
- Dirty unsaved documents prompt for first save before switching.
- Missing recent files notify the user and are removed from the list.

Next step:
- Consider a clear-recents command if the list needs manual management later.

## ISSUE-010: Sidebar and command-bar polish pass

Status: resolved
Area: app
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- Several early UI details still felt like prototype or browser-era affordances.
- The browser fallback Import control was not needed in the app.
- Save was visually treated as a special primary action despite autosave being central.
- Sidebar sections were static and could not be collapsed.

Question:
- Which UI details should be tightened before continuing MVP feature work?

Impact:
- Unused controls and inconsistent command styling made the desktop app feel less native.

Resolution:
- Removed the Import button and associated file-input fallback functionality.
- Made Save visually consistent with other command buttons.
- Added collapsible Document, Outline, and Recent sidebar sections.
- Fixed tooltip weight and edge clipping behavior for command and mode buttons.

Next step:
- Continue applying the same native-app consistency standard to settings and export UI.

## ISSUE-014: Browser fallback and mobile layout removed

Status: resolved
Area: app
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- MarkLeaf is being built as a macOS/Electron desktop app, not a mobile or browser-first web app.
- The previous renderer kept a browser fallback command and mobile-style single-column CSS from the early prototype.

Question:
- Should MarkLeaf continue carrying browser fallback and mobile layout behavior?

Impact:
- Browser/mobile fallback behavior added complexity and could create layouts or code paths that do not match the supported desktop app experience.

Resolution:
- Removed the `make web` and `npm run dev:web` commands.
- Removed the mobile-width CSS fallback.
- Removed browser file-handle open/save/reload paths from the renderer.
- Kept Electron's current minimum window size as the supported desktop baseline.

Next step:
- Revisit supported minimum window dimensions if the app UI grows beyond the current `960x640` Electron minimum.

## ISSUE-009: Brand asset source-of-truth location

Status: resolved
Area: docs
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- Logo assets were being copied into generated `dist/` output during renderer builds.
- This made it look like there were multiple logo locations.

Question:
- Where should source logo assets live?

Impact:
- Multiple apparent asset locations increase the chance of editing or reviewing generated output by mistake.

Resolution:
- Standardized brand source assets under `assets/brand/`.
- Documented that `dist/` is generated output only.
- Updated the renderer build to avoid copying logo assets into `dist/` during development.
- Removed generated logo copies from `dist/` during cleanup.
- Confirmed the only source image/vector assets are `assets/brand/markleaf-logo-concept-1.png` and `assets/brand/markleaf-logo-concept-1.svg`.

Next step:
- Add packaging-specific icons later under a separate intentional location such as `assets/app-icons/` or `build/icons/`.

## ISSUE-008: Lucide icon system

Status: resolved
Area: app
Raised in: 2026-05-24
Resolved in: 2026-05-24
Owner: shared

Context:
- The command bar and toolbar initially used text labels and ad hoc symbols.
- MarkLeaf needed a consistent app icon system.

Question:
- Which icon pack should MarkLeaf use for command and toolbar actions?

Impact:
- Mixed symbols and labels made the toolbar feel less native and less coherent.

Resolution:
- Selected Lucide as the default icon system.
- Added Lucide as a dependency.
- Replaced command/toolbar actions with Lucide icon buttons where appropriate.
- Added accessible labels and hover/focus tooltips for icon-only buttons.
- Documented Lucide usage in the spec.

Next step:
- Continue replacing future command icons with Lucide unless a required concept is unavailable.

## ISSUE-007: Native app chrome and fixed pane layout

Status: resolved
Area: app
Raised in: 2026-05-23
Resolved in: 2026-05-23
Owner: codex

Context:
- The early Electron UI presented more like a rough web page than a native desktop productivity app.
- The top header and subheaders scrolled with the content.

Question:
- How should the MVP shell present more like Word or VS Code while staying simple?

Impact:
- A web-page-feeling shell reduced confidence in the desktop app direction and made the editor feel less native.

Resolution:
- Reworked the UI into fixed app chrome: app bar, command bar, toolbar, pane headers, internal pane scrolling, and status bar.
- Updated the spec to state that top app chrome should not scroll with document content.

Next step:
- Continue refining details during settings/export work, especially keyboard affordances and pane sizing.

## ISSUE-006: Electron menu undo and redo integration

Status: resolved
Area: editor
Raised in: 2026-05-23
Resolved in: 2026-05-23
Owner: codex

Context:
- Undo and redo appeared not to work reliably after CodeMirror was introduced.
- Electron native menu roles did not consistently target the CodeMirror editor surface.

Question:
- Should undo and redo rely on native menu roles, or should they be routed into the editor explicitly?

Impact:
- Broken undo/redo makes Markdown editing unsafe for daily use.

Resolution:
- Routed Electron menu undo/redo commands through the preload bridge.
- Invoked CodeMirror's `undo()` and `redo()` commands directly in the renderer.
- Updated the spec to call out explicit CodeMirror undo/redo routing.

Next step:
- Add broader editor command tests or manual QA notes once UI testing infrastructure exists.

## ISSUE-005: CodeMirror and Markdown parser foundation

Status: resolved
Area: editor
Raised in: 2026-05-23
Resolved in: 2026-05-23
Owner: codex

Context:
- The first Electron prototype used a plain textarea and a hand-rolled Markdown renderer.
- The spec calls for CodeMirror or equivalent for Markdown mode and a defined GFM-aligned Markdown profile.

Question:
- What should replace the textarea and hand-rolled renderer for the first editor foundation?

Impact:
- Editor quality, keyboard behavior, syntax support, and Markdown compatibility were limited by the initial prototype implementation.

Resolution:
- Added CodeMirror 6 for Markdown editing.
- Added `markdown-it` with task-list support for preview rendering.
- Added an esbuild renderer bundling step so Electron can load local packaged renderer code.

Next step:
- Extend parser/rendering tests around GFM features and evaluate whether additional Markdown plugins are needed.

## ISSUE-003: Electron scaffold migration

Status: resolved
Area: packaging
Raised in: 2026-05-23
Resolved in: 2026-05-23
Owner: shared

Context:
- The first implementation began as a dependency-free browser prototype.
- The target implementation is an Electron/TypeScript desktop app.

Question:
- Which Electron scaffold should MarkLeaf use: Electron Forge, Electron Builder, Vite + Electron, or another maintained setup?

Impact:
- Desktop packaging, preload bridge structure, Node file-system services, and test/dev commands depend on the scaffold choice.

Resolution:
- Selected a minimal Electron scaffold using the existing dependency-free renderer.
- Added Electron `main` and `preload` modules.
- Added a secure preload bridge for document open, save, save-as, refresh, and external-change notifications.
- Left Svelte and bundling as future enhancements rather than initial scaffold requirements.

Next step:
- Revisit Electron Builder or Electron Forge when packaging work begins.

## ISSUE-002: Electron filesystem bridge implemented

Status: resolved
Area: filesystem
Raised in: 2026-05-22
Resolved in: 2026-05-23
Owner: shared

Context:
- Native-grade file watching, sidecar creation beside arbitrary files, and write permissions initially depended on browser File System Access API support and user-granted handles.
- The earlier browser prototype provided manual file fallback, manual refresh, debounced saves when writable handles were available, and visible external-change warnings.

Question:
- Which file open/save/watch behavior should move into the Electron main process first?

Impact:
- The prototype can poll opened file handles and save through granted browser handles, but this is not a substitute for Electron/Node file watching.
- Sidecar metadata creation beside arbitrary Markdown files is not fully implemented in the browser prototype.

Resolution:
- Added Electron main-process document open, save, save-as, refresh, and file watching.
- Added sidecar metadata creation on save.
- Exposed these operations to the renderer through a preload bridge.
- Initially kept browser fallback behavior for direct web prototype usage; this was later removed in ISSUE-014.

Next step:
- Harden conflict handling and sidecar schema validation during the next MVP pass.
