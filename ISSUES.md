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

## Resolved

## ISSUE-003: Electron scaffold migration

Status: resolved
Area: packaging
Raised in: 2026-05-23
Resolved in: 2026-05-23
Owner: shared

Context:
- The current implementation is a dependency-free browser prototype.
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
- Native-grade file watching, sidecar creation beside arbitrary files, and write permissions depend on browser File System Access API support and user-granted handles.
- The current prototype provides manual file fallback, manual refresh, debounced saves when writable handles are available, and visible external-change warnings.

Question:
- Which file open/save/watch behavior should move into the Electron main process first?

Impact:
- The prototype can poll opened file handles and save through granted browser handles, but this is not a substitute for Electron/Node file watching.
- Sidecar metadata creation beside arbitrary Markdown files is not fully implemented in the browser prototype.

Resolution:
- Added Electron main-process document open, save, save-as, refresh, and file watching.
- Added sidecar metadata creation on save.
- Exposed these operations to the renderer through a preload bridge.
- Kept browser fallback behavior for direct web prototype usage.

Next step:
- Harden conflict handling and sidecar schema validation during the next MVP pass.
