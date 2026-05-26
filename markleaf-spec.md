# MarkLeaf — First Draft Product & Technical Specification

## 1. Working Concept

The application is a cross-platform desktop Markdown editor designed for AI-heavy professional writing, technical documentation, proposals, memos, living notes, and structured working documents.

The core principle is that the Markdown file remains the authoritative source of truth. The application should provide a polished editing and preview experience, including lightweight Word-like controls, while preserving strict Markdown compatibility and avoiding hidden proprietary document structures.

The app is intended to be open source and compilable as native desktop builds for macOS, Windows, and Linux.

## 2. Working Project Name

The working project name is **MarkLeaf**.

This name is provisional and should be treated as the product-facing open-source project name for the current specification. Repository names, package names, and internal identifiers may use the lowercase form `markleaf`. The name is not yet assumed to be legally cleared, trademark-cleared, or domain-secured.

## 3. Primary User Need

The primary user works heavily with AI tools that generate, edit, revise, and maintain Markdown files. Existing Markdown apps are either unsupported, too limited, too developer-centric, too visually constrained, or insufficiently aligned with AI-assisted document workflows.

The app should support a workflow where Markdown files may be edited externally by AI agents, scripts, or other tools while the desktop editor remains open. The editor must be able to detect and refresh external changes without corrupting user edits.

## 4. Product Goals

### 4.1 Core Goals

- Provide a modern, cross-platform Markdown editor for professional and AI-assisted workflows.
- Treat `.md` files as plain-text, portable, standards-aligned documents.
- Support direct Markdown editing, split editing, and CSS-styled Word-lite editing from the core product vision.
- Use GitHub Flavoured Markdown as the assumed default Markdown baseline, subject to final library validation.
- Support single Markdown file workflows with optional sidecar metadata for app state, export configuration, and document settings.
- Allow user-selectable plain CSS files for visual document styling.
- Use sidecar JSON metadata, not proprietary Markdown extensions, to handle page size, margins, export settings, selected style, and related app-specific configuration.
- Export Markdown documents to PDF and DOCX with a strong emphasis on producing documents that can be credibly opened, reviewed, and continued in Microsoft Word.
- Support fonts through CSS styling where practical, while recognizing that DOCX export may require explicit font/style mapping.
- Provide lightweight formatting controls similar to a minimal word processor, but only for Markdown-supported structures.
- Support external file modification and refresh workflows suitable for AI agents and background scripts.
- Remain open source and maintainable.

### 4.2 Delivery Approach

MarkLeaf should be developed iteratively. The full product goal includes a direct editable Word-lite mode, but the app should be built, reviewed, and refined in phases rather than attempting the entire final experience in one pass.

The implementation should first establish the reliable foundations:

- Single-file Markdown opening, editing, saving, and previewing.
- Safe external change detection and reload workflows.
- CSS style selection and sidecar metadata.
- Early export quality validation for PDF and DOCX.

The Word-lite mode remains a core product destination, but it should be introduced through constrained prototypes and round-trip testing once the Markdown source model, rendering path, and export path are stable enough to support it.

### 4.3 Non-Goals

- Do not create a proprietary primary document format.
- Do not become a full Microsoft Word replacement.
- Do not support arbitrary rich text that cannot round-trip cleanly to Markdown.
- Do not hide unsupported formatting inside HTML spans, custom XML, or proprietary metadata.
- Do not rely on raw HTML as a normal authoring method.
- Do not assume cloud storage or a hosted backend.
- Do not require AI integration in the first version, although the app should be designed for AI-assisted workflows.

## 5. Guiding Design Principles

### 5.1 Markdown First

The Markdown document is the canonical source. Every editing mode must preserve the Markdown file cleanly.

### 5.2 No Fake Rich Text

If a formatting feature cannot be represented in Markdown, it should not be presented as a standard editing control in CSS-styled mode.

The Word-lite mode should feel more comfortable than raw Markdown, but it must not pretend that Markdown supports arbitrary desktop-publishing or word-processing features.

For example:

Supported:

- Headings
- Bold
- Italic
- Strikethrough, if supported by the selected Markdown flavour
- Blockquotes
- Ordered and unordered lists
- Task lists
- Code blocks
- Inline code
- Tables
- Links
- Images
- Horizontal rules
- Footnotes, if supported by the selected Markdown processor

Not supported as standard controls:

- Arbitrary font family changes inside selected paragraph fragments
- Arbitrary text colour changes inside selected paragraph fragments
- Arbitrary paragraph background colours
- Manual line spacing controls inside the Markdown body
- Text boxes
- Floating shapes
- Complex page layout elements
- Absolute-positioned objects

Document-wide presentation features such as fonts, page size, margins, and print layout should be handled through CSS and sidecar metadata, not through hidden inline formatting.

### 5.3 AI-Compatible Files

The app should assume that Markdown files may be touched by other processes, including AI tools, scripts, version control operations, or file sync utilities.

The editor should therefore support:

- External change detection.
- Manual refresh.
- Safe reload prompts when unsaved local edits exist.
- Disk-changed status when an opened file is edited externally.
- Clear conflict handling.
- File watcher resilience.
- Auto-save of user edits so the file on disk generally reflects the current working document.

Auto-save is part of the expected user experience. The app should behave more like a modern living-document editor than a traditional save-only text editor, while still making file state clear and trustworthy.

The expected auto-save behaviour is similar in spirit to Google Docs:

- Edits are saved after the user pauses typing or otherwise becomes idle.
- Untitled/new documents remain unsaved in memory until the user explicitly chooses Save or Save As for the first time.
- After a new document has a file path, auto-save applies normally to subsequent edits.
- The app clearly shows new, unsaved, saving, saved, disk-changed, open-error, and save-error states.
- Manual save remains available as an explicit sync/write-to-disk command.
- Auto-save should reduce conflict risk, but external file changes must still be handled carefully.

### 5.4 Professional Document Output

The app should produce credible exports suitable for client memos, internal reports, technical notes, proposals, and working documents.

Exports should reflect the selected CSS style as much as practical while maintaining predictable output.

### 5.5 Local-First

The application should work fully offline. Files should be stored locally using normal directories and normal Markdown files.

Cloud, sync, repository, and AI-agent integrations may be future enhancements, but should not be required for the base app.

## 6. Target Platforms

The app should compile to native desktop builds for:

- macOS
- Windows
- Linux

The assumed technical foundation is:

- **Electron** for desktop shell, native packaging, and Node-based system integration.
- **A TypeScript renderer** for the frontend UI. Svelte or SvelteKit may be adopted later if the UI grows complex enough to justify it.
- **TypeScript** for frontend logic.
- **Node.js** for main-process file system access, native menus, file watching, export command orchestration, and desktop integration.

## 7. Suggested Technical Stack

### 7.1 Desktop Shell

- Electron
- Node.js main process
- Secure preload bridge using `contextBridge`
- Native file system access through Node APIs
- Native file watching through `fs.watch`, `chokidar`, or a comparable cross-platform watcher
- Electron Builder, Electron Forge, or a comparable packaging system

### 7.2 Frontend

- TypeScript renderer
- Optional future migration to Svelte or SvelteKit if component complexity warrants it
- TypeScript
- CSS variables for theming
- Component-based layout

### 7.3 Markdown Processing

Candidate libraries to evaluate:

- `markdown-it`
- `micromark`
- `remark` / `rehype`
- `mdast` / `hast` ecosystem

The working default should be **GitHub Flavoured Markdown**, because it is widely used, familiar to AI tooling, and naturally aligned with repository-based workflows.

The app should still avoid over-fitting to GitHub-specific rendering quirks where those quirks reduce portability.

Required GFM-aligned features:

- Tables
- Task lists
- Strikethrough
- Autolinks, if supported cleanly
- Fenced code blocks

Current implementation direction:

- Use `markdown-it` for preview rendering.
- Use a task-list plugin for GitHub-style task lists.
- Keep raw HTML disabled by default.

### 7.4 Editor Engine

Candidate editor engines:

- CodeMirror 6
- Monaco Editor
- ProseMirror / Milkdown
- TipTap with strict Markdown schema

Initial recommendation for the Markdown text editor mode:

- **CodeMirror 6** for raw Markdown editing.

The Electron menu should route editor-specific commands such as undo and redo into CodeMirror directly rather than relying only on native menu roles. This avoids focus-target ambiguity between the Electron shell and the editor surface.

Possible future styled editing mode:

- ProseMirror, Milkdown, or a custom constrained editing layer if true WYSIWYG-like Markdown editing is required.

### 7.5 Export Pipeline

Export quality is a first-class requirement, especially for DOCX.

The export system should support professional, Word-continuable output rather than merely dumping approximate converted content.

Candidate export approaches:

- Markdown → HTML → CSS-styled PDF using a controlled print renderer.
- Markdown → DOCX using Pandoc or a comparable conversion engine.
- Markdown → intermediate AST → DOCX with explicit style mapping.
- Optional use of a DOCX reference template for Word style mapping.

The key export design principle is:

> CSS controls visual intent, while sidecar metadata controls page/export configuration.

The app should distinguish between:

- **CSS style file:** typography, heading appearance, paragraph spacing, table styling, blockquote styling, code styling, and general visual presentation.
- **Sidecar JSON metadata:** page size, margins, selected CSS file, export defaults, DOCX template path, title metadata, and other app/export settings.

A practical first implementation may use Pandoc for DOCX export if it provides the most authentic Word document structure. However, the spec should treat Pandoc as an implementation candidate, not a settled requirement.

Pandoc should be explored early because DOCX quality is a major product risk. Other export options should also be evaluated before committing to a final distribution approach, including JavaScript DOCX libraries, Markdown AST to DOCX pipelines, HTML-to-DOCX approaches, and template-driven export systems.

DOCX export should consider:

- Word styles for headings, paragraphs, blockquotes, code, lists, and tables.
- Font family and font size mapping from CSS or sidecar settings.
- Page size.
- Margins.
- Title and metadata.
- Optional reference `.docx` template.
- Clean re-opening and continued editing in Microsoft Word.

PDF export should consider:

- CSS print rules.
- Page size and margins from sidecar metadata.
- Font support.
- Headers and footers, if later supported.
- Page numbering, if later supported.

## 8. Core Modes

The app should support three primary document modes.

### 8.1 Markdown Mode

This is a raw text editor mode for directly editing `.md` files.

Features:

- Syntax highlighting.
- Line numbers, optional.
- Markdown shortcuts.
- Find and replace.
- Word count.
- Character count.
- Current heading/path indicator.
- Auto-save on changes.
- Manual save command for user confidence and explicit flush-to-disk behaviour.
- File reload / refresh.
- Undo/redo.
- Spellcheck, preferably optional.

Mode behaviour:

- Markdown syntax is visible and directly editable.
- This mode is the most transparent source-editing mode.
- It should always reflect the same underlying Markdown document used by split mode and Word-lite mode.

### 8.2 Split Mode

This mode shows Markdown source and rendered preview side-by-side.

Features:

- Left pane: Markdown source.
- Right pane: rendered preview using selected CSS style.
- Synchronized scrolling, optional.
- Adjustable pane width.
- Toggle source left/right, optional.
- Preview refresh as user types.
- Preview refresh from file reload.

Mode behaviour:

- Markdown syntax is visible in the source pane.
- The preview pane shows the styled rendering.
- Both panes reflect the same underlying Markdown document.

### 8.3 CSS-Styled Mode / Word-Lite Mode

This mode presents a styled document view that feels closer to a lightweight word processor, but remains constrained to Markdown-compatible structures.

This mode is a hard product requirement, not merely a preview mode.

Important principle:

> The user edits visually in Word-lite mode, while the app updates the underlying Markdown in the background.

The Word-lite editor should allow direct interaction with the styled document surface. Toolbar actions and keyboard shortcuts should modify the Markdown source indirectly, without requiring the user to manually edit Markdown syntax unless they choose to switch to Markdown mode.

Required behaviour:

- User can click into the styled document and edit text directly.
- Markdown syntax is hidden in this mode unless the user switches to Markdown or split mode.
- The hidden Markdown source updates in the background as the user edits visually.
- User can select text and apply Markdown-compatible formatting through toolbar buttons.
- Toolbar operations write valid Markdown in the background.
- The user can toggle between Word-lite, Markdown, and split mode without corrupting the document.
- The Markdown source remains inspectable and editable by switching modes.
- Unsupported Word-style formatting must not be available as normal controls.

Examples of supported Word-lite editing actions:

- Change paragraph to H1, H2, H3, etc.
- Apply bold or italic.
- Insert or edit links.
- Create bullet lists and numbered lists.
- Create task lists.
- Insert blockquotes.
- Insert fenced code blocks.
- Insert tables.
- Insert horizontal rules.

Implementation direction:

- The app likely needs a constrained rich-text/structured editor layer that maps reliably to Markdown.
- Candidate technologies include ProseMirror, Milkdown, TipTap with a strict Markdown schema, or a custom constrained editor.
- CodeMirror remains appropriate for raw Markdown mode.
- The Word-lite editor should be tested against Markdown round-trip integrity from the beginning.
- MVP should keep structural editing simple. No block-level drag/drop or advanced section rearrangement is required initially.
- Table support can begin with toolbar-assisted table insertion and basic editing rather than a full visual table editor.

The app should not rely on HTML as the source format for Word-lite editing. HTML may be used internally for rendering, but Markdown remains the authoritative saved content.

## 9. File Model

### 9.1 Supported File Types

Primary:

- `.md`
- `.markdown`

Possible secondary support:

- `.txt`
- `.mdown`

The initial product should assume a **single Markdown file** as the primary workflow, rather than a full workspace/project model.

Workspace and folder-tree features may be considered later, but should not distract from getting the single-file editing, styling, refresh, and export workflows correct.

### 9.2 Source of Truth

The Markdown file on disk is authoritative.

The app may maintain local UI state, recent files, preferences, and style selections, but document content should remain standard Markdown.

### 9.3 Sidecar Metadata

Sidecar metadata is a core part of the app design, but it must remain optional and non-invasive.

Possible sidecar file:

```text
filename.md
filename.md.meta.json
```

The Markdown file remains the canonical document content. The sidecar stores app-specific and export-specific settings that should not pollute the Markdown file.

Sidecar creation rule:

- When a Markdown file is opened and then saved or auto-saved using the editor, the app should create or update the sidecar metadata file.
- Merely opening a Markdown file should not necessarily create a sidecar until the user saves, auto-saves, or changes app-specific settings.

Potential sidecar uses:

- Last selected CSS style.
- Export preferences.
- Page size.
- Margins.
- PDF export profile.
- View mode preference.
- Folded heading state.
- Last scroll position.
- App-specific notes.

Example sidecar structure:

```json
{
  "schemaVersion": "1.0",
  "style": {
    "id": "memo",
    "cssPath": ""
  },
  "view": {
    "mode": "split",
    "wordWrap": true,
    "lastScrollPosition": 0,
    "foldedHeadings": []
  },
  "document": {
    "title": "",
    "author": "",
    "subject": "",
    "keywords": [],
    "notes": ""
  },
  "page": {
    "size": "letter",
    "orientation": "portrait",
    "margins": {
      "top": "0.75in",
      "right": "0.75in",
      "bottom": "0.75in",
      "left": "0.75in"
    }
  },
  "export": {
    "pdf": {
      "enabled": true,
      "includePageNumbers": false,
      "profile": "standard"
    },
    "docx": {
      "enabled": true,
      "templatePath": "",
      "mapCssFonts": true
    }
  },
  "updatedAt": ""
}
```

The development reference for this structure lives in `templates/markleaf-sidecar.template.jsonc`.

Sidecar metadata must never be required to understand or edit the Markdown file.

### 9.4 External Change Detection

The app must watch opened files for external changes.

When external changes are detected:

- Set the document status to `Disk changed`.
- Do not auto-reload the file into the editor.
- Pause auto-save while `Disk changed` is active so the external version is not overwritten silently.
- Keep manual Reload from disk available so the user explicitly pulls in the external or AI-generated version.
- Allow user to compare at a simple level, reload, save as copy, or keep local version.
- Provide a clear timestamp of the external change if available.

Because the app uses auto-save, conflict risk should be reduced but not ignored. The app should still handle cases where an AI tool or external script modifies the file at nearly the same time as the user.

### 9.5 AI-Agent Compatibility

The app should work well when another tool modifies Markdown files in the background.

Expected workflow:

1. User opens a Markdown file in the app.
2. User asks an AI tool or script to revise the same file externally.
3. The app detects that the file changed.
4. The document status changes to `Disk changed` and auto-save pauses.
5. User clicks Reload from disk to explicitly pull in the external version.
6. The updated Markdown renders in the app.

Optional future workflow:

- The app can expose a watched workspace folder for AI tools.
- The app can preserve scroll position after reload where possible.

## 10. Markdown Compatibility

### 10.1 Markdown Flavour

The working default is **GitHub Flavoured Markdown**.

Reasons:

- It is widely used.
- It aligns well with repository-based workflows.
- It is familiar to AI tools.
- It supports practical features such as tables, task lists, strikethrough, and fenced code blocks.

The app should define its exact supported Markdown profile and avoid silently accepting features that cannot be rendered or exported reliably.

### 10.2 Supported Markdown Features

Required:

- Headings H1–H6
- Paragraphs
- Bold
- Italic
- Bold italic
- Strikethrough
- Blockquotes
- Ordered lists
- Unordered lists
- Nested lists
- Inline code
- Fenced code blocks
- Links
- Images
- Horizontal rules
- Tables
- Task lists

Strongly preferred:

- YAML frontmatter
- Table of contents generation
- Heading anchors
- Footnotes, if the selected Markdown library supports them cleanly

Optional / future:

- Mermaid diagram rendering
- Math notation
- Callouts / admonitions
- Citations / bibliography
- Cross-references

Mermaid-specific note:

AI tools commonly generate Mermaid fenced code blocks. The app should preserve Mermaid blocks as ordinary fenced code blocks in the MVP. Future versions should render Mermaid diagrams visually while preserving the original fenced Markdown block as the source.

### 10.3 HTML in Markdown

Raw HTML should not be a normal authoring path.

The app may use HTML internally as a rendering/intermediate layer, but the user-facing document model should remain Markdown.

Recommended default:

- Do not encourage raw HTML in Markdown documents.
- Render raw HTML only if explicitly enabled in settings.
- Sanitise raw HTML before preview rendering.
- Warn users that raw HTML may reduce portability and AI compatibility.

The app should not rely on HTML to provide Word-lite features.

## 11. Toolbar and Word-Lite Controls

The toolbar should provide common document controls while inserting or modifying Markdown syntax.

### 11.1 Basic Formatting Controls

- Heading dropdown: Paragraph, H1, H2, H3, H4, H5, H6
- Heading dropdown should reflect the current cursor line's block format instead of resetting after use.
- Bold
- Italic
- Strikethrough, if supported
- Inline code
- Link insertion via an `Insert Link` dialog with `Text to display`, explicit `Address` and `Email` modes, and smart Markdown link normalization.
- Image insertion via an `Insert Image` dialog with `Alt text`, native image picker, drag/drop support, and a temporary selected-image thumbnail.
- Blockquote
- Bullet list
- Numbered list
- Task list
- Code block
- Table insertion
- Horizontal rule

Deferred Markdown control refinements:

- Fenced code block language selection.
- List indent and outdent controls.
- Task list checked/unchecked toggle controls.
- Table helpers for adding rows, adding columns, and setting alignment.
- Link editing for existing links.
- Image editing for existing image references.
- Optional footnote support if a Markdown plugin is adopted.
- Optional definition lists, admonitions/callouts, and Mermaid rendering as extension features rather than MVP requirements.

Frontmatter should remain out of the main app metadata flow for MVP because app-controlled metadata belongs in sidecar JSON.

Rendered links in the Styled pane should not navigate the Electron app window away from MarkLeaf. Web and email links should open externally through the operating system; unsupported local/document links should be blocked until a deliberate local-link workflow is designed.

Local image insertion should require the Markdown document to be saved first so the app has a stable document-relative asset location. Image insertion is capped at one image per dialog submission; additional file selections or drops replace the pending image. The dialog should prominently explain before the alt-text field that inserted images are copied into a sibling `<filename>.md.assets/` folder and inserted as relative Markdown image references. The asset folder should include the full Markdown filename to mirror sidecar metadata naming, for example `memo.md.assets/` beside `memo.md` and `memo.md.meta.json`. A selected image should appear as a temporary thumbnail; hovering or focusing the thumbnail should make clear that clicking it removes the pending image. MVP supported image types are PNG, JPG/JPEG, GIF, WebP, and SVG.

### 11.2 Document Structure Controls

- Insert table of contents, if supported
- Promote/demote heading
- Move section up/down, future
- Collapse heading sections, future
- Outline panel, initially showing H1-H3 only to avoid clutter while still allowing H4-H6 in the editor.

### 11.3 Export Controls

- Export PDF
- Export DOCX
- Export HTML, optional
- Copy rendered HTML, optional
- Print

### 11.4 Style Controls

- Select CSS style/theme
- Preview style
- Export style
- Set default style
- Manage style library

The toolbar should feel familiar to Word users but should remain honest about Markdown limitations.

## 12. CSS Style System

### 12.0 Visual Identity Palette

MarkLeaf should use a restrained, document-focused colour palette that supports a professional local-first editor experience.

| Role | Colour | Use |
| --- | ---: | --- |
| Primary green | `#2F6F5E` | Leaf mark, primary buttons, active states |
| Deep ink | `#1F2933` | Text, outlines, dark UI anchors |
| Soft mint | `#DDEFE8` | Light backgrounds, icon fill accents |
| Paper white | `#FAFAF7` | App background / document feel |
| Muted slate | `#6B7280` | Secondary UI text |
| Optional accent | `#D99A3D` | Small highlight only, e.g. save state / export badge |

The optional accent should be used sparingly. The app should remain quiet and document-oriented rather than visually loud.

Document status indicators should use consistent icon-and-text treatments in both the title bar and sidebar:

| State | Icon direction | Colour | Text |
| --- | --- | ---: | --- |
| New clean document | File/new document | `#1F2933` | `New document` |
| Unsaved changes | Caution / alert triangle | `#9A6A18` | `Unsaved` |
| Saving | Spinner / circular loader | `#1F2933` | `Saving...` |
| Saved | Check circle | `#2F6F5E` | `Saved` |
| Disk changed | File warning | `#9A6A18` | `Disk changed` |
| Save or open error | Alert circle | `#B42318` | `Save error` or `Open error` |

### 12.0.1 Brand Assets

Brand and logo source files should live under:

```text
assets/brand/
```

This folder is the source of truth for working logo and brand artwork. Generated build output such as `dist/` must not be treated as a second source asset location. During local development, renderer output should reference source brand assets rather than copying logo files into `dist/`.

The current working logo asset is:

```text
assets/brand/markleaf-logo-concept-1.png
```

The matching vector concept asset is:

```text
assets/brand/markleaf-logo-concept-1.svg
```

Packaging-specific application icons may be added later under a clearly named packaging resource folder, such as `assets/app-icons/` or `build/icons/`. They should not be mixed into `dist/` as source assets.

### 12.1 Style Library

The app should ship with a small set of predefined plain CSS files for common document types.

Initial built-in styles should be simple, consistent, and extensible rather than overly elaborate.

Default built-in styles should use system font stacks for portability across macOS, Windows, and Linux. Users may still specify other installed fonts in custom CSS.

Example starter style presets:

- Clean technical memo
- Report
- Proposal
- Meeting notes
- Compact draft
- Minimal/plain

The app should include a basic style preview/gallery using sample lorem ipsum content and common Markdown renderings. This allows the user to quickly see how headings, paragraphs, lists, tables, blockquotes, and code blocks will appear under each style.

A simple style dropdown may still be used in the main editor toolbar, but the style management view should support visual preview cards.

### 12.2 CSS Template Standard

The app should include a standard CSS template so that built-in and user-created styles follow a consistent structure.

The template should define common selectors for Markdown-rendered content, such as:

- `body`
- `.document`
- `h1` through `h6`
- `p`
- `ul`, `ol`, `li`
- `blockquote`
- `table`, `th`, `td`
- `code`, `pre`
- `a`
- `img`
- `hr`

This gives users a clear starting point for custom CSS without introducing a proprietary style language.

### 12.3 User Styles

Users should be able to add custom plain `.css` files.

Possible storage:

```text
App config folder/styles/
```

or, for file-adjacent styles:

```text
same-folder-as-document/styles/
```

CSS should remain a universal, portable styling layer.

### 12.3.1 Style Reference

`STYLES.md` is the current development reference for a first JKTS-inspired document style. It captures Word-to-CSS layout guidance and extracted JKTS heading colours:

- JKTS blue: `#2E5E94`
- JKTS green: `#29A94F`

This reference should inform future built-in CSS styles, but it is not itself an active app style until converted into a real CSS file and registered in the style selector.

### 12.4 Style Scope

CSS styles should affect rendered output only, not the underlying Markdown.

Styles may define:

- Font stack
- Font sizes
- Heading styles
- Paragraph spacing
- Table styling
- Code block styling
- Blockquote styling
- Print appearance

Styles should not define app-specific document settings such as selected page size or saved export profile. Those should live in the sidecar JSON metadata.

For the current sidecar schema, `style.cssPath` should point to an active CSS file when custom CSS support exists. `style.id` should remain the built-in fallback when `cssPath` is empty, missing, or invalid.

### 12.5 Page and Export Settings

Page size, margins, orientation, selected export profile, and similar document/export settings should be stored in sidecar JSON rather than embedded in the CSS file.

The CSS file should express visual styling. The sidecar should express app/export configuration.

This keeps CSS reusable across documents and keeps document-specific export decisions explicit.

### 12.6 Print CSS

CSS files may include print-specific rules.

Example:

```css
@media screen { }
@media print { }
```

However, the app should still use sidecar metadata as the authoritative source for page size and margins unless explicitly overridden.

## 13. Export Requirements

### 13.1 PDF Export

PDF export should be treated as the fixed-layout counterpart to DOCX export.

The same document settings and selected CSS style should drive both DOCX and PDF exports as much as practical.

Required:

- Export current document to PDF.
- Choose output path.
- Apply selected CSS style.
- Apply page size and margins from sidecar metadata.
- Apply document fonts where practical.
- Preserve headings, lists, tables, links, blockquotes, code blocks, and images.

Preferred:

- Page numbering.
- Link preservation.
- Image embedding.
- Print preview.

Clarification:

The intent is not to create a separate, special print-publication workflow. PDF export should represent the same styled document as DOCX export, but as a final fixed-format output.

### 13.2 DOCX Export

DOCX export is a major product requirement, not a minor convenience feature.

The app should aim to produce Word documents that can be opened, reviewed, edited, and continued in Microsoft Word without feeling like a broken conversion artifact.

Required:

- Export current document to `.docx`.
- Preserve headings, lists, tables, links, code blocks, blockquotes, and basic emphasis.
- Map Markdown structure to real Word styles where possible.
- Apply document-level font choices where practical.
- Apply page size and margins from sidecar metadata.
- Support continued editing in Word.

Preferred:

- Map Markdown heading levels to Word styles.
- Preserve tables cleanly.
- Include title, author, and date metadata from frontmatter or sidecar metadata where available.
- Support CSS-informed style mapping where possible.

Not assumed for the core design:

- User-provided reference `.docx` templates.

Important implementation note:

CSS and DOCX do not map perfectly. The app may need an explicit style-mapping layer so that visual intent expressed in CSS can be translated into Word styles with reasonable fidelity.

The export pipeline should therefore consider a defined internal style model rather than assuming that raw CSS alone can authentically produce Word styles.

### 13.3 HTML Export

Optional but useful:

- Export standalone HTML.
- Export HTML with linked CSS.
- Export HTML with embedded CSS.

### 13.4 Export Philosophy

Exports are derived products. The Markdown file remains authoritative.

### 13.5 Early Export Spike

Export quality should be validated early rather than deferred until the rest of the app is complete.

The early export spike should test a representative Markdown document containing:

- Headings.
- Paragraphs.
- Ordered and unordered lists.
- Task lists.
- Tables.
- Links.
- Images.
- Blockquotes.
- Inline code.
- Fenced code blocks.
- Horizontal rules.

The spike should compare PDF and DOCX output quality across candidate export approaches. Pandoc should be one candidate, but not the only option explored. The goal is to determine whether the app can produce credible, Word-continuable DOCX output and CSS-faithful PDF output before the broader editor experience depends on a fragile export pipeline.

## 14. Document Metadata

The app should use sidecar JSON metadata as the authoritative location for document/app/export metadata.

The Markdown file should remain focused on document content.

Metadata fields may include:

- title
- subtitle
- author
- date
- version
- client
- project
- status
- selected style
- page size
- margins
- export preferences

YAML frontmatter may still appear in user-authored Markdown files, but the app should not depend on frontmatter for its core metadata model in the MVP.

The MVP assumption is:

> App-controlled metadata lives in the sidecar JSON file beside the Markdown file.

## 15. Document Model

### 15.1 Single-File First

The initial product should focus on a single Markdown document plus optional sidecar metadata.

This keeps the app focused on the user’s immediate need:

- Open a Markdown file.
- Edit it comfortably.
- Let AI or external tools update it.
- Refresh safely.
- Apply CSS styling.
- Export credibly to PDF and DOCX.

### 15.2 Sidecar Pairing

The app should automatically detect or create an optional sidecar file next to the Markdown file.

Example:

```text
memo.md
memo.md.meta.json
```

The sidecar should be stored beside the Markdown file for the initial product.

The sidecar should be easy to ignore, delete, or recreate.

Future versions may consider hidden app metadata folders, but that is not part of the current assumed design.

### 15.3 Future Workspace Mode

Workspace features may be considered later but are not part of the initial core assumption.

Future workspace features could include:

- Folder tree.
- Recent files.
- Search across files.
- Workspace-level assets folder support.
- Relative links.
- Image references.
- Multi-document export.

Suggested future structure:

```text
project-folder/
  docs/
  assets/
  styles/
  exports/
```

## 16. AI Workflow Features

The app does not need built-in AI in the first version, but it should be architected for AI workflows.

### 16.0 First Golden Workflow

The first implementation should optimize around one concrete workflow:

1. User opens a single `.md` file.
2. User edits the Markdown document in MarkLeaf.
3. User previews the rendered document with the selected CSS style.
4. An external AI tool, script, or editor modifies the same Markdown file.
5. MarkLeaf detects the external change.
6. MarkLeaf shows `Disk changed` without a banner and waits for the user to reload from disk.
7. User exports the document to PDF and DOCX.

This workflow should be used as the main acceptance path for early builds.

### 16.1 External AI Edits

Required:

- Detect file changes from AI tools or scripts.
- Refresh document from disk.
- Preserve user trust through clear conflict handling.

### 16.2 AI-Friendly Markdown

The app should encourage clean Markdown structures that are easy for AI tools to read and modify.

Potential features:

- Heading outline.
- Stable heading anchors.
- Section copy buttons.
- Copy section as Markdown.
- Copy document as Markdown.
- Copy selected block as Markdown.
- Insert AI instruction comments, optional.

### 16.3 Future Native AI Integration

Optional future features:

- Send selected section to AI.
- Rewrite selected section.
- Summarise document.
- Apply tracked AI suggestions.
- Compare AI revision to current file.
- AI-safe document locking.
- MCP integration.
- Local model integration.

These should be future-facing and not required for the first release.

## 17. Version Control and Diffing

### 17.1 Basic Version Awareness

The app should support safe editing where files may be changed by external processes.

Required features:

- File modification timestamp display.
- Unsaved changes indicator.
- Icon-and-colour document status shown consistently in the title bar and sidebar.
- Reload from disk.
- Save as copy.
- Clear non-banner `Disk changed` status when external changes are detected.

### 17.2 Diff Support

Advanced diffing, AI edit comparison, and Git integration are not MVP requirements.

Future or advanced features could include:

- Compare current buffer to disk version.
- Compare two Markdown files.
- Show AI-generated changes.
- Git diff awareness if the folder is a repository.

### 17.3 Git Support

Optional future feature only.

Potential features:

- Show Git branch.
- Show modified files.
- Commit from app.
- View file history.

Git should not be required for normal use.

## 18. UI Layout

### 18.1 Main Window

Suggested layout:

- Native-feeling app chrome with fixed top bars, not a scrolling webpage header.
- Compact app/title bar showing product identity, current document name, and saved/saving/error state.
- Command bar for file-level actions such as New, Open, Save, Save As, and Refresh.
- Grouped toolbar with Markdown-compatible formatting controls, similar in spirit to lightweight Word controls.
- Left sidebar for document metadata, outline, recent files, styles, or later file/workspace panels.
- Left sidebar sections should be independently collapsible so the user can keep only the currently useful panels open.
- Main editing area using pane headers and app-like split panes.
- Right `Styled` pane in split mode, representing the CSS-applied document view that informs export output.
- Markdown and Styled panes should be resizable with a draggable divider while preserving practical minimum widths for both panes.
- Bottom status bar.

The top app bar, command bar, toolbar, and status bar should remain fixed. Scrolling should be contained inside the sidebar, source editor, and preview panes. The app should present as a desktop productivity tool, taking practical UX cues from VS Code's editor density and Word's document command surface, rather than as a web page.

The Markdown/Split mode switch should present as a connected segmented control rather than two unrelated buttons. The selected segment should use the active/darker state.

### 18.1.1 Iconography

MarkLeaf should use **Lucide** as the default application icon set for toolbar, command bar, status, and utility icons.

Guidelines:

- Use icon-only buttons for familiar commands such as new, open, save, refresh, formatting, lists, links, images, tables, and split view.
- Every icon-only button must have an accessible label and a hover/focus tooltip that names the action.
- Avoid mixing icon packs unless a needed concept is unavailable in Lucide.
- Keep icons visually restrained: line icons, consistent stroke weight, and no decorative icon colours unless communicating state.

### 18.2 Status Bar

Status bar may include:

- File path.
- Saved/unsaved state.
- Word count.
- Character count.
- Current mode.
- Current CSS style.
- External change status.
- Line/column in Markdown mode.

The status bar should behave like native app chrome and remain fixed at the bottom of the window.

### 18.3 Sidebar Panels

Possible panels:

- Files
- Outline
- Styles
- Exports
- Document metadata
- Search

### 18.4 Command Palette

Preferred feature:

- Keyboard-driven command palette similar to VS Code.

Commands:

- Open file
- Save
- Export PDF
- Export DOCX
- Toggle split mode
- Apply style
- Insert table
- Insert link
- Reload from disk

## 19. Keyboard Shortcuts

The app should support common editor shortcuts.

Examples:

- Save
- Open
- New
- Export
- Bold
- Italic
- Heading levels
- Find
- Replace
- Toggle preview
- Toggle split mode
- Command palette

Shortcuts should follow platform conventions where appropriate.

## 20. Settings

Settings should include:

- Default view mode.
- Default CSS style.
- Auto-save on/off, default on.
- Disk-changed detection on/off, default on.
- Prompt before reload on/off.
- Spellcheck on/off.
- Line numbers on/off.
- Theme: light/dark/system.
- Editor font size.
- Preview zoom.
- Export defaults.
- Markdown flavour/extensions.

## 21. Security and Privacy

The app should be local-first and privacy-preserving.

Requirements:

- No telemetry by default.
- No cloud dependency.
- No AI API calls unless explicitly configured in future versions.
- Clear permissions for file access.
- Safe rendering of Markdown and optional HTML.
- Avoid unsafe script execution in rendered preview.

## 22. Accessibility

The app should support:

- Keyboard navigation.
- Screen reader-friendly controls where practical.
- High contrast themes.
- Adjustable font size.
- Reduced-motion settings.

## 23. Packaging and Distribution

The app should support native builds for:

- macOS `.dmg` or `.app`
- Windows installer
- Linux AppImage, `.deb`, or equivalent

Current alpha packaging baseline:

- `make package-mac` builds an unsigned local macOS `.app` with Electron Builder.
- The output is written under `release/`, currently `release/mac-arm64/MarkLeaf.app` on Apple Silicon.
- The macOS `.app` icon is generated from `assets/brand/markleaf-logo-concept-1.png` into `build/icons/markleaf.icns` during packaging.
- DMG packaging, code signing, notarization, and final production icon treatment are deferred until broader beta distribution.

Open source distribution should include:

- Source repository.
- Build instructions.
- Release workflow.
- Contribution guidelines.
- Licence file.

## 24. Licence

The project should use the **MIT License**.

Rationale:

- Short, simple, and widely understood.
- Permits commercial use, modification, private use, and redistribution.
- Reduces adoption friction for individuals, companies, and downstream package maintainers.
- Fits the goal of an open-source desktop productivity tool intended for broad use.

The repository should include a root-level `LICENSE` file containing the standard MIT License text.

## 25. Suggested MVP Scope

### 25.1 MVP Must-Have

- Cross-platform Electron app shell.
- TypeScript renderer frontend, with Svelte/SvelteKit deferred unless needed.
- Open/save Markdown files.
- Startup and New Document should present a blank untitled workspace, not seeded sample Markdown.
- Auto-save on changes for documents that already have a writable file path.
- New unsaved documents should not trigger save-location prompts through auto-save.
- Manual save command retained as an explicit sync/write-to-disk action.
- Single Markdown file workflow.
- Sidecar JSON metadata created beside the Markdown file once the file is saved or auto-saved through the editor.
- GitHub Flavoured Markdown baseline.
- Markdown mode using CodeMirror or equivalent.
- Undo and redo integrated with CodeMirror and Electron menu shortcuts.
- Split mode with rendered preview.
- Architecture that does not block a future direct editable CSS-styled Word-lite mode.
- Toolbar actions in Markdown and split modes that update the underlying Markdown source.
- Ability to toggle between Markdown mode and split mode.
- CSS style selector using plain `.css` files.
- Built-in starter CSS files using portable system font stacks.
- Standard CSS template for user-created styles.
- Basic style preview/gallery using lorem ipsum and common Markdown renderings.
- Page size and margin settings stored in sidecar metadata.
- File watcher for external changes.
- Manual reload from disk.
- Basic non-banner `Disk changed` status when external changes occur.
- Basic toolbar for Markdown-compatible formatting.
- Toolbar-assisted table insertion.
- Early export pipeline spike covering PDF and DOCX.
- Export to PDF with CSS styling and sidecar page settings, once the export path is validated.
- Export to DOCX with credible Word-continuable structure, once the export path is validated.
- Settings for default mode and default style.

### 25.2 MVP Should-Have

- Recent files capped at five entries, ordered from most to least recent.
- Recent file entries should open the file after user confirmation.
- If the current document is a dirty unsaved new document, confirming a recent-file switch should prompt for the first save before opening the recent file.
- If the current document is an already saved dirty file, confirming a recent-file switch should complete the pending save before opening the recent file.
- Missing recent files should notify the user and then be removed from the list.
- Word count.
- Outline panel based on headings.
- Basic table insertion.
- Print preview.
- Custom CSS folder.
- Basic document metadata fields stored in sidecar JSON.
- Initial constrained Word-lite prototype behind a feature flag or experimental mode, if round-trip integrity is acceptable.

### 25.3 MVP Could-Have

- HTML export.
- Mermaid rendering.
- Math rendering.
- Command palette.
- Git diff awareness.
- Folder/workspace mode.

## 26. Possible Development Phases

### 26.1 Phase 1 — Prototype

Goal: Prove the core editing and rendering workflow.

Deliverables:

- Electron + TypeScript renderer scaffold.
- Open/save Markdown files.
- CodeMirror editor.
- `markdown-it` Markdown preview.
- Split mode.
- Basic CSS style switching.
- Manual refresh from disk.

### 26.2 Phase 1.5 — Early Export Spike

Goal: Validate export quality before the editor experience depends on a fragile export pipeline.

Deliverables:

- Representative export fixture Markdown document.
- PDF export proof using selected CSS and sidecar page settings.
- DOCX export proof with Word-continuable structure.
- Export pipeline comparison, including Pandoc and other viable options.
- Recommendation for the first supported export implementation.

### 26.3 Phase 2 — MVP Editor

Goal: Make it usable for real daily Markdown work.

Deliverables:

- File watcher.
- Unsaved change handling.
- Conflict prompt.
- Toolbar controls.
- Recent files.
- Word count.
- Settings.
- Outline panel.

Current baseline status:

- Implemented: file watcher, unsaved change handling, toolbar controls, recent files, word/character count, outline panel, shared save/disk status, link dialog, image dialog, resizable split panes, and sidecar read/write round trip.
- Partially implemented: conflict handling through `Disk changed` status and manual Reload from disk; a richer conflict prompt/diff is deferred.
- Remaining: settings UI and export/page settings activation.

### 26.4 Phase 3 — Export System

Goal: Produce credible professional outputs.

Deliverables:

- PDF export.
- DOCX export.
- Export style settings.
- Print CSS support.
- Optional DOCX template support.

### 26.5 Phase 4 — Word-Lite Styled Mode

Goal: Deliver the product-destination styled editing experience without compromising Markdown integrity.

Deliverables:

- Styled mode design decision.
- Constrained rich editing prototype.
- Markdown round-trip testing.
- Toolbar/state synchronization.
- Direct visual editing with Markdown syntax hidden.
- Mode switching between Markdown, split, and Word-lite views.

### 26.6 Phase 5 — AI-Workflow Enhancements

Goal: Add explicit AI-assisted workflow features.

Deliverables:

- Section copy tools.
- AI revision diffing.
- External edit review.
- Watched workspace workflows.
- Optional AI/MCP hooks.

## 27. Key Technical Risks

### 27.1 Styled Editing Round-Trip

True WYSIWYG editing that round-trips perfectly to Markdown is difficult. This should be treated carefully and tested heavily.

### 27.2 DOCX Export Quality

DOCX output may require Pandoc, templates, or a specialised conversion pipeline to meet professional expectations.

### 27.3 PDF Export Consistency

CSS-to-PDF export can vary depending on rendering engine and platform. A controlled export pipeline is important.

### 27.4 External Change Conflicts

AI and scripts may update files while the user is editing. Conflict handling must be predictable and trustworthy.

### 27.5 Markdown Extension Creep

Adding many Markdown extensions may reduce portability. The app should distinguish core Markdown support from optional extensions.

## 28. Current Design Decisions

The following decisions are assumed based on current user direction:

1. The app should support raw Markdown mode, split preview mode, and direct editable Word-lite mode.
2. Word-lite mode is the Phase 4 product goal and should be reached through iterative builds, review, and round-trip testing.
3. Word-lite mode must allow direct visual editing while updating the Markdown source in the background.
4. Markdown syntax should be hidden in Word-lite mode and visible in Markdown/split modes.
5. Users should eventually be able to toggle between Markdown-only, split, and Word-lite modes.
6. Initial MVP editing should focus on Markdown and split modes while preserving an architecture that can support Word-lite mode.
7. MVP structural editing should stay simple; no block drag/drop or advanced section movement is required initially.
8. Table support can begin as toolbar-assisted Markdown table insertion rather than a full visual table editor.
9. GitHub Flavoured Markdown is the working default Markdown baseline.
10. The app should focus first on a single Markdown file, not a full workspace model.
11. The first golden workflow is open one `.md` file, edit it, preview it, accept/reload external AI or script changes safely, and export to PDF/DOCX.
12. Auto-save on changes should be the default behaviour for opened/saved files, similar in spirit to Google Docs, using idle/debounced saves with clear saving/saved/error states.
13. Untitled/new documents should stay unsaved in memory until the first explicit Save or Save As, after which auto-save should take over.
14. A manual save command should still exist as an explicit sync/write-to-disk action.
15. Sidecar JSON metadata should be created beside the Markdown file when a Markdown file is saved or auto-saved through the editor.
16. Sidecar JSON metadata should store app-specific, document-specific, and export-specific settings using the `"1.0"` schema reference in `templates/markleaf-sidecar.template.jsonc`.
17. App-controlled metadata should live in the sidecar JSON rather than YAML frontmatter for the MVP.
18. Plain CSS files should remain the universal visual styling layer.
19. `STYLES.md` is the current development reference for the first JKTS-inspired CSS style, but it must be converted into a real CSS file before appearing in the app style selector.
20. The app should ship with several basic predefined CSS files and a standard CSS template for consistency.
21. Built-in CSS styles should use portable system font stacks by default.
22. Users may specify other installed fonts through custom CSS.
23. The app should include a basic lorem ipsum style preview/gallery showing common Markdown renderings.
24. Page size, margins, orientation, export profile, and related document settings should live in the sidecar JSON, not in the CSS file.
25. Raw HTML should not be a normal user-facing authoring method.
26. DOCX export must be treated seriously, with the goal of producing a Word document that can be continued in Word.
27. PDF export should represent the same styled document/export intent as DOCX, but as a fixed final format.
28. Export quality should be validated early, including Pandoc and other viable options.
29. User-provided reference DOCX templates are not assumed for the core product.
30. Fonts should be supported through CSS where practical, with an export mapping layer considered for DOCX.
31. Mermaid blocks should be preserved as fenced code blocks in the MVP, with visual Mermaid rendering marked as a good future feature.
32. Advanced diffing, AI edit comparison, and Git integration are future features, not MVP requirements.
33. The product name is **MarkLeaf**.
34. The project should use the MIT License.
35. The desktop application should use Electron so the project can stay primarily in TypeScript/JavaScript and use Node.js for native file system workflows.
36. The first renderer implementation should remain a minimal TypeScript renderer bundled with esbuild; Svelte/SvelteKit is optional future work, not a current MVP blocker.
37. Markdown mode should use CodeMirror 6, with undo/redo routed explicitly from Electron menus into CodeMirror.
38. Preview rendering should use `markdown-it` with GFM-aligned extensions rather than a hand-rolled renderer.
39. The UI should use fixed native-app chrome: top app bar, command bar, toolbar, pane headers, and status bar should not scroll with document content.
40. Lucide should be the default icon system for app command and toolbar icons, with accessible labels and hover/focus tooltips on icon-only buttons.
41. Brand/logo source files should live only under `assets/brand/`; generated `dist/` files are runtime build output and not source assets.
42. Common project commands should be exposed through the root `Makefile` so Electron development, checks, and cleanup stay consistent.
43. Startup and New Document should clear the workspace to a blank untitled Markdown document; sample content belongs in examples or style previews, not the live editor by default.
44. Recent files should be path-backed links capped at five entries; opening a recent file should confirm first, save or prompt to save the current dirty document, and remove missing files after notifying the user.
45. Document status should be rendered through a shared icon-and-colour status component in both the title bar and sidebar.
46. External file edits, including AI/script edits, should set `Disk changed`, pause auto-save, and wait for an explicit Reload from disk.
47. The Electron watcher should ignore MarkLeaf-owned saves by tracking known file modification times so autosave does not falsely trigger `Disk changed`.
48. Link insertion should use a dialog with display text plus explicit Address/Email modes; rendered web and email links should open through the operating system rather than navigating the Electron app window.
49. Image insertion should use a dialog, support one pending image at a time, require a saved Markdown file first, show a removable temporary thumbnail, and copy inserted images into `[filename].md.assets/`.
50. Existing link/image references can be inserted through dialogs now, but edit-existing-reference workflows remain deferred.
51. Local alpha testing should use `make package-mac` to produce an unsigned `.app`; DMG, signing, notarization, and final production icon treatment remain follow-up packaging work.
52. The alpha macOS `.app` should use an `.icns` generated from the current PNG logo concept so standalone builds are identifiable in Finder and the Dock.
53. Opening a Markdown file should read its sidecar if present and apply supported fields; saving should preserve unsupported sidecar sections where practical.

## 29. Deferred Design Questions

The core first-draft product direction is now considered converged.

The following items are intentionally deferred for future design or implementation planning rather than treated as unresolved product-scope questions:

1. Final editor engine selection for Word-lite mode.
2. Exact Markdown-to-DOCX export pipeline.
3. Exact CSS-to-DOCX style mapping method.
4. Future Mermaid rendering support.
5. Future AI-native features such as revision comparison, prompt hooks, or MCP integration.
6. Future workspace/folder mode.
7. Future Git or version-control integration.

These should not block the first product specification. They should be revisited during technical architecture and implementation planning.
