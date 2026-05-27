import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching, defaultHighlightStyle, foldGutter, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import {
  AlertCircle,
  AlertTriangle,
  Bold,
  CheckCircle2,
  Code,
  Columns2,
  FileWarning,
  FilePlus,
  FolderOpen,
  Image,
  Link,
  List,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  Minus,
  RefreshCw,
  Save,
  SaveAll,
  Strikethrough,
  Table
} from "lucide";
import { extractHeadings, getWordCount, renderMarkdown } from "./markdown.js";

const AUTOSAVE_DELAY_MS = 1200;
const RECENT_FILES_KEY = "markleaf.recentFiles";
const MAX_RECENT_FILES = 5;
const MIN_PANE_WIDTH_PX = 280;
const EMPTY_DOCUMENT = "";
const desktopApi = window.markleaf;
const isElectron = desktopApi?.platform === "electron";

const styles = {
  "markleaf-light": {
    label: "MarkLeaf Light",
    className: "doc-style-markleaf-light",
    fileName: "markleaf-light.css"
  },
  "markleaf-dark": {
    label: "MarkLeaf Dark",
    className: "doc-style-markleaf-dark",
    fileName: "markleaf-dark.css"
  },
  memo: {
    label: "Technical memo",
    className: "doc-style-memo",
    fileName: "memo.css"
  },
  report: {
    label: "Report",
    className: "doc-style-report",
    fileName: "report.css"
  },
  compact: {
    label: "Compact draft",
    className: "doc-style-compact",
    fileName: "compact.css"
  }
};

const state = {
  markdown: EMPTY_DOCUMENT,
  filePath: null,
  fileName: "Untitled.md",
  lastModified: null,
  dirty: false,
  saving: false,
  saveError: "",
  diskChanged: false,
  mode: "split",
  selectedStyle: "markleaf-light",
  selectedStyleCss: "",
  splitRatio: 0.5,
  resizingSplit: false,
  linkSelection: null,
  linkKind: "web",
  imageSelection: null,
  imageAsset: null,
  autosaveTimer: null,
  watchTimer: null,
  recentFiles: loadRecentFiles()
};

const app = document.querySelector("#app");
let editorView = null;
let suppressEditorUpdate = false;

function icon(nodes) {
  const paths = nodes
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(" ");
      return `<${tag} ${attributes}></${tag}>`;
    })
    .join("");

  return `<svg class="lucide-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

app.innerHTML = `
  <main class="shell">
    <header class="appbar">
      <div class="app-identity">
        <img class="app-logo" src="../assets/brand/markleaf-logo-concept-1.png" alt="" aria-hidden="true">
        <div class="title-stack">
          <h1>MarkLeaf</h1>
          <span id="titleFileName" class="title-file"></span>
        </div>
      </div>
      <div class="title-status">
        <span id="titleSaveState"></span>
      </div>
    </header>

    <section class="commandbar" aria-label="Document commands">
      <div class="command-group">
        <button type="button" data-action="new" class="icon-button tooltip-left" aria-label="New document" data-tooltip="New document">${icon(FilePlus)}</button>
        <button type="button" data-action="open" class="icon-button" aria-label="Open Markdown file" data-tooltip="Open Markdown file">${icon(FolderOpen)}</button>
        <button type="button" data-action="save" class="icon-button" aria-label="Save document" data-tooltip="Save document">${icon(Save)}</button>
        <button type="button" data-action="saveAs" class="icon-button" aria-label="Save document as" data-tooltip="Save document as">${icon(SaveAll)}</button>
        <button type="button" data-action="refresh" class="icon-button" aria-label="Reload from disk" data-tooltip="Reload from disk">${icon(RefreshCw)}</button>
      </div>
    </section>

    <section class="toolbar" aria-label="Markdown toolbar">
      <div class="tool-group">
        <select id="blockSelect" aria-label="Block format">
          <option value="paragraph">Paragraph</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
          <option value="blockquote">Quote</option>
          <option value="codeblock">Code block</option>
        </select>
      </div>
      <div class="tool-group">
        <button type="button" data-wrap="**|**" class="icon-button" aria-label="Bold" data-tooltip="Bold">${icon(Bold)}</button>
        <button type="button" data-wrap="*|*" class="icon-button italic-icon" aria-label="Italic" data-tooltip="Italic">I</button>
        <button type="button" data-wrap="~~|~~" class="icon-button" aria-label="Strikethrough" data-tooltip="Strikethrough">${icon(Strikethrough)}</button>
        <button type="button" data-wrap="\`|\`" class="icon-button" aria-label="Inline code" data-tooltip="Inline code">${icon(Code)}</button>
      </div>
      <div class="tool-group">
        <button type="button" data-insert="link" class="icon-button" aria-label="Insert link" data-tooltip="Insert link">${icon(Link)}</button>
        <button type="button" data-insert="image" class="icon-button" aria-label="Insert image" data-tooltip="Insert image">${icon(Image)}</button>
        <button type="button" data-insert="ul" class="icon-button" aria-label="Bullet list" data-tooltip="Bullet list">${icon(List)}</button>
        <button type="button" data-insert="ol" class="icon-button" aria-label="Numbered list" data-tooltip="Numbered list">${icon(ListOrdered)}</button>
        <button type="button" data-insert="task" class="icon-button" aria-label="Task list" data-tooltip="Task list">${icon(ListTodo)}</button>
        <button type="button" data-insert="table" class="icon-button" aria-label="Insert table" data-tooltip="Insert table">${icon(Table)}</button>
        <button type="button" data-insert="hr" class="icon-button" aria-label="Horizontal rule" data-tooltip="Horizontal rule">${icon(Minus)}</button>
      </div>
      <div class="tool-spacer"></div>
      <div class="tool-group">
        <select id="styleSelect" aria-label="Preview style"></select>
        <div class="mode-switch segmented-control" role="radiogroup" aria-label="View mode">
          <button type="button" data-mode="markdown" class="icon-button text-icon tooltip-right" role="radio" aria-label="Markdown mode" aria-checked="false" data-tooltip="Markdown mode">MD</button>
          <button type="button" data-mode="split" class="icon-button tooltip-right" role="radio" aria-label="Split mode" aria-checked="false" data-tooltip="Split mode">${icon(Columns2)}</button>
        </div>
      </div>
    </section>

    <section class="workspace">
      <aside class="sidebar">
        <details class="sidebar-panel" open>
          <summary><span>Document</span></summary>
          <dl class="document-meta sidebar-panel-body">
            <dt>File</dt>
            <dd id="fileName"></dd>
            <dt>Status</dt>
            <dd id="saveState"></dd>
            <dt>Words</dt>
            <dd id="wordCount"></dd>
            <dt>Characters</dt>
            <dd id="characterCount"></dd>
          </dl>
        </details>
        <details class="sidebar-panel" open>
          <summary><span>Outline</span></summary>
          <nav id="outline" class="outline sidebar-panel-body"></nav>
        </details>
        <details class="sidebar-panel" open>
          <summary><span>Recent</span></summary>
          <ul id="recentFiles" class="recent-files sidebar-panel-body"></ul>
        </details>
      </aside>

      <section id="editorRegion" class="editor-region">
        <section class="pane source-pane">
          <header class="pane-header">
            <span>Markdown</span>
          </header>
          <div id="editor" class="cm-host" aria-label="Markdown source"></div>
        </section>
        <div id="paneResizeHandle" class="pane-resize-handle" role="separator" aria-label="Resize Markdown and Styled panes" aria-orientation="vertical" tabindex="0"></div>
        <section class="pane preview-pane">
          <header class="pane-header">
            <span>Styled</span>
          </header>
          <div class="preview" aria-label="Styled document viewport">
            <article id="preview" class="styled-page document" aria-label="Styled document"></article>
          </div>
        </section>
      </section>
    </section>

    <footer class="statusbar">
      <span id="pathStatus"></span>
      <span class="statusbar-right">
        <span id="modeStatus"></span>
        <span class="statusbar-separator" aria-hidden="true">|</span>
        <span id="watchStatus"></span>
      </span>
    </footer>

    <div id="linkDialog" class="modal-backdrop" hidden>
      <form id="linkForm" class="modal" aria-labelledby="linkDialogTitle">
        <header class="modal-header">
          <h2 id="linkDialogTitle">Insert Link</h2>
        </header>
        <div class="modal-body">
          <label class="form-field">
            <span>Text to display</span>
            <input id="linkTextInput" type="text" autocomplete="off">
          </label>
          <div class="form-field">
            <span>Link type</span>
            <div class="segmented-control link-type-control" role="radiogroup" aria-label="Link type">
              <button type="button" data-link-type="web" class="icon-button text-icon" role="radio" aria-checked="true">Address</button>
              <button type="button" data-link-type="email" class="icon-button text-icon" role="radio" aria-checked="false">Email</button>
            </div>
          </div>
          <label class="form-field">
            <span id="linkAddressLabel">Address</span>
            <input id="linkAddressInput" type="text" autocomplete="off" placeholder="https://example.com">
          </label>
        </div>
        <footer class="modal-actions">
          <button type="button" data-link-action="cancel">Cancel</button>
          <button type="submit" class="primary-action">Insert</button>
        </footer>
      </form>
    </div>

    <div id="imageDialog" class="modal-backdrop" hidden>
      <form id="imageForm" class="modal" aria-labelledby="imageDialogTitle">
        <header class="modal-header">
          <h2 id="imageDialogTitle">Insert Image</h2>
        </header>
        <div class="modal-body">
          <p class="dialog-note">Images are inserted one at a time and copied into a sibling <code>[filename].md.assets</code> folder beside the saved Markdown file.</p>
          <label class="form-field">
            <span>Alt text</span>
            <input id="imageAltInput" type="text" autocomplete="off">
          </label>
          <div class="form-field">
            <span>Image file</span>
            <button type="button" class="secondary-action" data-image-action="choose">Choose Image...</button>
            <div id="imageDropZone" class="drop-zone" tabindex="0">
              <span>Drop an image file here</span>
            </div>
            <button id="imageThumbButton" type="button" class="image-thumb" data-image-action="remove" title="Click to remove selected image" hidden>
              <img id="imageThumbPreview" alt="">
              <span id="imageThumbLabel"></span>
            </button>
            <p id="imagePathStatus" class="field-help">No image selected</p>
          </div>
        </div>
        <footer class="modal-actions">
          <button type="button" data-image-action="cancel">Cancel</button>
          <button type="submit" class="primary-action">Insert</button>
        </footer>
      </form>
    </div>
  </main>
`;

const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const editorRegion = document.querySelector("#editorRegion");
const paneResizeHandle = document.querySelector("#paneResizeHandle");
const fileName = document.querySelector("#fileName");
const saveState = document.querySelector("#saveState");
const wordCount = document.querySelector("#wordCount");
const characterCount = document.querySelector("#characterCount");
const outline = document.querySelector("#outline");
const recentFiles = document.querySelector("#recentFiles");
const styleSelect = document.querySelector("#styleSelect");
const blockSelect = document.querySelector("#blockSelect");
const pathStatus = document.querySelector("#pathStatus");
const modeStatus = document.querySelector("#modeStatus");
const watchStatus = document.querySelector("#watchStatus");
const titleFileName = document.querySelector("#titleFileName");
const titleSaveState = document.querySelector("#titleSaveState");
const linkDialog = document.querySelector("#linkDialog");
const linkForm = document.querySelector("#linkForm");
const linkTextInput = document.querySelector("#linkTextInput");
const linkAddressInput = document.querySelector("#linkAddressInput");
const linkAddressLabel = document.querySelector("#linkAddressLabel");
const imageDialog = document.querySelector("#imageDialog");
const imageForm = document.querySelector("#imageForm");
const imageAltInput = document.querySelector("#imageAltInput");
const imageDropZone = document.querySelector("#imageDropZone");
const imageThumbButton = document.querySelector("#imageThumbButton");
const imageThumbPreview = document.querySelector("#imageThumbPreview");
const imageThumbLabel = document.querySelector("#imageThumbLabel");
const imagePathStatus = document.querySelector("#imagePathStatus");
const builtInStyleElement = document.createElement("style");
builtInStyleElement.id = "builtinDocumentStyle";
document.head.appendChild(builtInStyleElement);

initialize();

async function initialize() {
  document.body.classList.toggle("platform-darwin", desktopApi?.os === "darwin");
  populateStyleSelect();
  initializeEditor();
  bindEvents();
  bindPaneResize();
  bindDesktopEvents();
  await loadSelectedStyleCss();
  render();
}

function initializeEditor() {
  editorView = new EditorView({
    parent: editor,
    state: createEditorState(state.markdown)
  });
}

function createEditorState(doc) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      foldGutter(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      bracketMatching(),
      highlightSelectionMatches(),
      markdownLanguage(),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressEditorUpdate) {
          state.markdown = getEditorText();
          state.dirty = true;
          state.saveError = "";
          scheduleAutoSave();
          render();
          return;
        }
        if (update.selectionSet) {
          updateBlockSelect();
        }
      })
    ]
  });
}

function bindEvents() {
  app.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.linkAction === "cancel") {
      closeLinkDialog();
      return;
    }

    if (target.dataset.linkType) {
      setLinkKind(target.dataset.linkType);
      return;
    }

    if (target.dataset.imageAction === "cancel") {
      closeImageDialog();
      return;
    }

    if (target.dataset.imageAction === "choose") {
      chooseImageForDialog();
      return;
    }

    if (target.dataset.imageAction === "remove") {
      clearSelectedImage();
      return;
    }

    if (target.dataset.action) {
      handleAction(target.dataset.action);
    }
    if (target.dataset.recentPath) {
      openRecentFile(target.dataset.recentPath);
    }
    if (target.dataset.wrap) {
      wrapSelection(target.dataset.wrap);
    }
    if (target.dataset.insert) {
      insertMarkdown(target.dataset.insert);
    }
    if (target.dataset.mode) {
      state.mode = target.dataset.mode;
      render();
    }
  });

  blockSelect.addEventListener("change", () => {
    applyBlockFormat(blockSelect.value);
  });

  styleSelect.addEventListener("change", async () => {
    state.selectedStyle = styleSelect.value;
    state.dirty = true;
    scheduleAutoSave();
    await loadSelectedStyleCss();
    render();
  });

  preview.addEventListener("click", handlePreviewLinkClick);

  linkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    insertConfiguredLink();
  });

  linkDialog.addEventListener("click", (event) => {
    if (event.target === linkDialog) {
      closeLinkDialog();
    }
  });

  imageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    insertConfiguredImage();
  });

  imageDialog.addEventListener("click", (event) => {
    if (event.target === imageDialog) {
      closeImageDialog();
    }
  });

  imageDropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    imageDropZone.classList.add("drag-over");
  });

  imageDropZone.addEventListener("dragleave", () => {
    imageDropZone.classList.remove("drag-over");
  });

  imageDropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    imageDropZone.classList.remove("drag-over");
    handleDroppedImage(event.dataTransfer?.files);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !linkDialog.hidden) {
      closeLinkDialog();
    }
    if (event.key === "Escape" && !imageDialog.hidden) {
      closeImageDialog();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (isElectron) return;
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function handleAction(action) {
  if (action === "new") createNewDocument();
  if (action === "open") await openWithPicker();
  if (action === "save") await saveNow();
  if (action === "saveAs") await saveAs();
  if (action === "refresh") await refreshFromDisk();
}

function populateStyleSelect() {
  styleSelect.innerHTML = Object.entries(styles)
    .map(([value, style]) => `<option value="${value}">${style.label}</option>`)
    .join("");
  styleSelect.value = state.selectedStyle;
}

async function loadSelectedStyleCss() {
  if (!desktopApi?.readBuiltinStyle) return;
  const styleId = state.selectedStyle;
  const result = await desktopApi.readBuiltinStyle(styleId);
  if (styleId !== state.selectedStyle) return;

  if (result?.ok) {
    state.selectedStyleCss = result.css || "";
    builtInStyleElement.textContent = state.selectedStyleCss;
    return;
  }

  if (styleId !== "markleaf-light") {
    state.selectedStyle = "markleaf-light";
    styleSelect.value = state.selectedStyle;
    await loadSelectedStyleCss();
    return;
  }

  state.selectedStyleCss = "";
  builtInStyleElement.textContent = "";
}

function render() {
  if (getEditorText() !== state.markdown) {
    setEditorText(state.markdown);
  }
  const documentStatus = getDocumentStatus();
  preview.innerHTML = renderMarkdown(state.markdown);
  resolvePreviewImageSources();
  const selectedStyle = styles[state.selectedStyle] ? state.selectedStyle : "markleaf-light";
  preview.className = `styled-page document doc-style ${styles[selectedStyle].className}`;
  styleSelect.value = selectedStyle;
  editorRegion.dataset.mode = state.mode;
  updateSplitLayout();

  fileName.textContent = state.fileName;
  saveState.innerHTML = renderStatus(documentStatus, "sidebar");
  titleFileName.textContent = state.fileName;
  titleSaveState.innerHTML = renderStatus(documentStatus, "title");
  wordCount.textContent = String(getWordCount(state.markdown));
  characterCount.textContent = String(state.markdown.length);
  pathStatus.textContent = getPathStatus();
  modeStatus.textContent = `Mode: ${state.mode}`;
  watchStatus.textContent = getWatchStatus();

  renderOutline();
  renderRecentFiles();
  updateModeButtons();
  updateBlockSelect();
}

function getDocumentStatus() {
  if (state.saveError) {
    return {
      type: "error",
      label: isOpenError(state.saveError) ? "Open error" : "Save error",
      detail: state.saveError,
      icon: AlertCircle
    };
  }
  if (state.saving) {
    return {
      type: "saving",
      label: "Saving...",
      detail: "Writing the current document to disk.",
      icon: LoaderCircle
    };
  }
  if (state.diskChanged) {
    return {
      type: "disk-changed",
      label: "Disk changed",
      detail: "The file changed outside MarkLeaf. Use Reload from disk to pull in the latest version.",
      icon: FileWarning
    };
  }
  if (state.dirty) {
    return {
      type: "unsaved",
      label: "Unsaved",
      detail: "Local changes have not been saved yet.",
      icon: AlertTriangle
    };
  }
  if (!state.filePath && state.fileName === "Untitled.md") {
    return {
      type: "new",
      label: "New document",
      detail: "This document has not been saved to a file yet.",
      icon: FilePlus
    };
  }
  return {
    type: "saved",
    label: "Saved",
    detail: "The current document is saved.",
    icon: CheckCircle2
  };
}

function renderStatus(status, variant) {
  return `
    <span class="document-status document-status-${status.type} document-status-${variant}" title="${escapeAttribute(status.detail)}" aria-label="${escapeAttribute(status.detail)}">
      ${icon(status.icon)}
      <span>${escapeHtml(status.label)}</span>
    </span>
  `;
}

function isOpenError(message) {
  return /open|recent|missing|not found/i.test(message);
}

function renderOutline() {
  const headings = extractHeadings(state.markdown).filter((heading) => heading.level <= 3);
  if (!headings.length) {
    outline.innerHTML = '<p class="empty">No headings yet.</p>';
    return;
  }
  outline.innerHTML = headings
    .map((heading) => {
      const indent = (heading.level - 1) * 12;
      return `<button type="button" style="padding-left:${indent}px" data-line="${heading.line}">${heading.text}</button>`;
    })
    .join("");

  outline.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => jumpToLine(Number(button.dataset.line)));
  });
}

function renderRecentFiles() {
  if (!state.recentFiles.length) {
    recentFiles.innerHTML = '<li class="empty">No recent files.</li>';
    return;
  }
  recentFiles.innerHTML = state.recentFiles
    .map((file) => `
      <li>
        <button type="button" class="recent-file-button" data-recent-path="${escapeAttribute(file.path)}" title="${escapeAttribute(file.path)}">
          <span>${escapeHtml(file.name)}</span>
        </button>
      </li>
    `)
    .join("");
}

function updateModeButtons() {
  app.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
}

function bindPaneResize() {
  paneResizeHandle.addEventListener("pointerdown", (event) => {
    if (state.mode !== "split") return;
    state.resizingSplit = true;
    paneResizeHandle.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-pane");
    updateSplitRatio(event.clientX);
  });

  paneResizeHandle.addEventListener("pointermove", (event) => {
    if (!state.resizingSplit) return;
    updateSplitRatio(event.clientX);
  });

  paneResizeHandle.addEventListener("pointerup", (event) => {
    state.resizingSplit = false;
    paneResizeHandle.releasePointerCapture(event.pointerId);
    document.body.classList.remove("resizing-pane");
  });

  paneResizeHandle.addEventListener("pointercancel", () => {
    state.resizingSplit = false;
    document.body.classList.remove("resizing-pane");
  });

  paneResizeHandle.addEventListener("keydown", (event) => {
    if (state.mode !== "split") return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    state.splitRatio = clampSplitRatio(state.splitRatio + direction * 0.03);
    updateSplitLayout();
  });
}

function updateSplitRatio(clientX) {
  const bounds = editorRegion.getBoundingClientRect();
  if (!bounds.width) return;
  const rawRatio = (clientX - bounds.left) / bounds.width;
  state.splitRatio = clampSplitRatio(rawRatio);
  updateSplitLayout();
}

function clampSplitRatio(ratio) {
  const width = editorRegion.getBoundingClientRect().width || 1;
  const minRatio = Math.min(0.45, MIN_PANE_WIDTH_PX / width);
  return Math.min(1 - minRatio, Math.max(minRatio, ratio));
}

function updateSplitLayout() {
  if (state.mode !== "split") {
    editorRegion.style.removeProperty("--source-pane-width");
    return;
  }
  const ratio = clampSplitRatio(state.splitRatio);
  state.splitRatio = ratio;
  editorRegion.style.setProperty("--source-pane-width", `${(ratio * 100).toFixed(2)}%`);
}

function scheduleAutoSave() {
  window.clearTimeout(state.autosaveTimer);
  if (!canAutoSave()) return;
  state.autosaveTimer = window.setTimeout(() => {
    saveNow({ autosave: true });
  }, AUTOSAVE_DELAY_MS);
}

function clearAutoSave() {
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
}

function canAutoSave() {
  if (state.diskChanged) return false;
  return Boolean(state.filePath);
}

async function saveNow(options = {}) {
  const { autosave = false } = options;

  if (autosave && !canAutoSave()) return;

  if (isElectron) {
    if (!state.filePath && !autosave) {
      await saveWithDesktopApi(true);
      return;
    }
    await saveWithDesktopApi(false);
    return;
  }

  state.saveError = "MarkLeaf must run as the Electron desktop app to save files.";
  render();
}

async function openWithPicker() {
  if (!isElectron) {
    state.saveError = "MarkLeaf must run as the Electron desktop app to open files.";
    render();
    return;
  }

  const result = await desktopApi.openDocument();
  if (result?.ok) {
    applyOpenedDocument(result);
  } else if (!result?.canceled) {
    state.saveError = result?.error || "Unable to open file";
    render();
  }
}

async function openRecentFile(filePath) {
  if (!isElectron) return;

  const recentFile = state.recentFiles.find((file) => file.path === filePath);
  const confirmation = await desktopApi.confirmOpenRecent({
    fileName: recentFile?.name || filePath,
    filePath
  });
  if (!confirmation?.confirmed) return;

  const availability = await desktopApi.recentDocumentExists(filePath);
  if (!availability?.exists) {
    await desktopApi.notifyMissingRecent({ filePath });
    removeRecentFile(filePath);
    render();
    return;
  }

  const ready = await prepareCurrentDocumentForSwitch();
  if (!ready) return;

  const result = await desktopApi.openRecentDocument(filePath);
  if (result?.ok) {
    applyOpenedDocument(result);
    return;
  }

  if (result?.missing) {
    await desktopApi.notifyMissingRecent({ filePath });
    removeRecentFile(filePath);
    render();
    return;
  }

  state.saveError = result?.error || "Unable to open recent file";
  render();
}

async function prepareCurrentDocumentForSwitch() {
  clearAutoSave();

  if (!state.dirty) return true;

  if (isElectron) {
    const saveResult = state.filePath
      ? await saveWithDesktopApi(false, { applyResult: false })
      : await saveWithDesktopApi(true, { applyResult: false });
    return Boolean(saveResult?.ok);
  }

  return false;
}

async function refreshFromDisk() {
  if (isElectron) {
    if (!state.filePath) {
      state.saveError = "Refresh requires an opened file.";
      render();
      return;
    }

    const result = await desktopApi.refreshDocument(state.filePath);
    if (result?.ok) {
      applyOpenedDocument(result);
    } else {
      state.saveError = result?.error || "Unable to refresh file";
      render();
    }
    return;
  }

  state.saveError = "MarkLeaf must run as the Electron desktop app to reload files.";
  render();
}

function stopWatching() {
  state.watchTimer = null;
}

function createNewDocument() {
  desktopApi?.newDocument();
  clearAutoSave();
  state.filePath = null;
  state.fileName = "Untitled.md";
  state.lastModified = null;
  state.markdown = EMPTY_DOCUMENT;
  state.selectedStyle = "markleaf-light";
  state.dirty = false;
  state.saving = false;
  state.saveError = "";
  state.diskChanged = false;
  stopWatching();
  resetEditorDocument(state.markdown);
  render();
}

async function saveAs() {
  if (isElectron) {
    await saveWithDesktopApi(true);
    return;
  }

  const blob = new Blob([state.markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = state.fileName || "document.md";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function saveWithDesktopApi(saveAsDocument, options = {}) {
  const { applyResult = true } = options;
  try {
    state.saving = true;
    state.saveError = "";
    render();
    const payload = {
      filePath: saveAsDocument ? null : state.filePath,
      fileName: state.fileName,
      markdown: state.markdown,
      metadata: {
        mode: state.mode,
        styleId: state.selectedStyle
      }
    };
    const result = saveAsDocument
      ? await desktopApi.saveDocumentAs(payload)
      : await desktopApi.saveDocument(payload);

    if (result?.ok && applyResult) {
      applyOpenedDocument(result);
    } else if (result?.ok) {
      state.filePath = result.filePath || state.filePath;
      state.fileName = result.fileName || state.fileName;
      state.lastModified = result.lastModified || state.lastModified;
      state.dirty = false;
      state.saving = false;
      state.saveError = "";
      state.diskChanged = false;
      addRecentFile(result);
      render();
    } else if (!result?.canceled) {
      state.saveError = result?.error || "Unable to save file";
      state.saving = false;
      render();
    } else {
      state.saving = false;
      render();
    }
    return result;
  } catch (error) {
    state.saving = false;
    state.saveError = error.message || "Unable to save file";
    render();
    return { ok: false, error: state.saveError };
  }
}

function applyOpenedDocument(result) {
  clearAutoSave();
  const metadata = result.metadata || {};
  state.filePath = result.filePath || null;
  state.fileName = result.fileName || "Untitled.md";
  state.markdown = result.markdown || "";
  state.lastModified = result.lastModified || null;
  state.selectedStyle = getSupportedStyleId(metadata.style?.id);
  state.mode = getSupportedMode(metadata.view?.mode);
  void loadSelectedStyleCss();
  state.dirty = false;
  state.saving = false;
  state.saveError = "";
  state.diskChanged = false;
  resetEditorDocument(state.markdown);
  addRecentFile(result);
  render();
}

function getSupportedStyleId(styleId) {
  return styles[styleId] ? styleId : "markleaf-light";
}

function getSupportedMode(mode) {
  return mode === "markdown" || mode === "split" ? mode : "split";
}

function bindDesktopEvents() {
  if (!isElectron) return;

  desktopApi.onExternalChange((payload) => {
    if (payload.filePath !== state.filePath) return;
    state.diskChanged = true;
    render();
  });

  desktopApi.onMenuCommand((command) => {
    if (command === "undo") {
      undo(editorView);
      return;
    }
    if (command === "redo") {
      redo(editorView);
      return;
    }
    const action = command === "save-as" ? "saveAs" : command;
    handleAction(action);
  });
}

function getPathStatus() {
  if (state.filePath) return state.filePath;
  return "No file opened";
}

function getWatchStatus() {
  if (state.filePath) return "Native file watcher active";
  return "Open a file to enable native watching";
}

function wrapSelection(pattern) {
  const [before, after] = pattern.split("|");
  const { start, end } = getSelectionRange();
  const selected = state.markdown.slice(start, end) || "text";
  replaceSelection(`${before}${selected}${after}`, start, end);
}

function insertMarkdown(type) {
  if (type === "link") {
    openLinkDialog();
    return;
  }

  if (type === "image") {
    openImageDialog();
    return;
  }

  const inserts = {
    ul: "- List item",
    ol: "1. List item",
    task: "- [ ] Task item",
    table: "| Column A | Column B |\n| --- | --- |\n| Value | Value |",
    hr: "\n---\n"
  };
  const { start, end } = getSelectionRange();
  replaceSelection(inserts[type] || "", start, end);
}

function openLinkDialog() {
  const selection = getSelectionRange();
  const selectedText = state.markdown.slice(selection.start, selection.end).trim();
  const selectedLooksLikeAddress = looksLikeLinkAddress(selectedText);
  const selectedLooksLikeEmail = looksLikeEmailAddress(selectedText) || /^mailto:/i.test(selectedText);
  state.linkSelection = selection;

  setLinkKind(selectedLooksLikeEmail ? "email" : "web");
  linkTextInput.value = selectedText || "link text";
  linkAddressInput.value = selectedLooksLikeAddress ? normalizeLinkAddress(selectedText) : "";
  linkDialog.hidden = false;

  window.setTimeout(() => {
    if (selectedText) {
      linkAddressInput.focus();
      linkAddressInput.select();
    } else {
      linkTextInput.focus();
      linkTextInput.select();
    }
  });
}

function setLinkKind(kind) {
  state.linkKind = kind === "email" ? "email" : "web";
  app.querySelectorAll("[data-link-type]").forEach((button) => {
    const active = button.dataset.linkType === state.linkKind;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  linkAddressLabel.textContent = state.linkKind === "email" ? "Email address" : "Address";
  linkAddressInput.placeholder = state.linkKind === "email" ? "name@example.com" : "https://example.com";
}

function closeLinkDialog() {
  linkDialog.hidden = true;
  state.linkSelection = null;
  editorView.focus();
}

function insertConfiguredLink() {
  const selection = state.linkSelection || getSelectionRange();
  const text = linkTextInput.value.trim() || "link text";
  const address = normalizeLinkAddress(linkAddressInput.value.trim(), state.linkKind);
  if (!address) {
    linkAddressInput.focus();
    return;
  }

  closeLinkDialog();
  replaceSelection(`[${escapeMarkdownLinkText(text)}](${escapeMarkdownLinkAddress(address)})`, selection.start, selection.end);
}

async function handlePreviewLinkClick(event) {
  const link = event.target.closest("a");
  if (!link || !preview.contains(link)) return;

  const href = link.getAttribute("href") || "";
  if (!href) return;

  event.preventDefault();

  if (href.startsWith("#")) {
    const targetId = href.slice(1);
    if (targetId) {
      preview.querySelector(`#${CSS.escape(targetId)}`)?.scrollIntoView({ block: "start" });
    }
    return;
  }

  if (!desktopApi?.openExternalLink) {
    state.saveError = "MarkLeaf must run as the Electron desktop app to open links externally.";
    render();
    return;
  }

  const result = await desktopApi.openExternalLink(href);
  if (!result?.ok) {
    state.saveError = result?.error || "Unable to open this link.";
    render();
  }
}

function looksLikeLinkAddress(value) {
  return /^(https?:\/\/|mailto:|#|\.{1,2}\/|\/)/i.test(value) || looksLikeEmailAddress(value) || /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(value);
}

function looksLikeEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeLinkAddress(value, kind = "web") {
  if (!value) return "";
  if (kind === "email" && !/^mailto:/i.test(value)) return `mailto:${value.replace(/^mailto:/i, "")}`;
  if (looksLikeEmailAddress(value)) return `mailto:${value}`;
  if (/^(https?:\/\/|mailto:|#|\.{1,2}\/|\/)/i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(value)) return `https://${value}`;
  return value;
}

function escapeMarkdownLinkText(value) {
  return value.replace(/\\/g, "\\\\").replace(/]/g, "\\]");
}

function escapeMarkdownLinkAddress(value) {
  return value.replace(/\\/g, "\\\\").replace(/ /g, "%20").replace(/\)/g, "\\)");
}

async function openImageDialog() {
  const saved = await ensureDocumentSavedForImages();
  if (!saved) return;

  const selection = getSelectionRange();
  const selectedText = state.markdown.slice(selection.start, selection.end).trim();
  state.imageSelection = selection;
  state.imageAsset = null;
  imageAltInput.value = selectedText || "";
  imagePathStatus.textContent = "No image selected";
  renderImageSelection();
  imageDialog.hidden = false;

  window.setTimeout(() => {
    imageAltInput.focus();
    imageAltInput.select();
  });
}

async function ensureDocumentSavedForImages() {
  if (!isElectron) {
    state.saveError = "MarkLeaf must run as the Electron desktop app to insert local images.";
    render();
    return false;
  }

  if (state.filePath) return true;

  const result = await saveWithDesktopApi(true);
  return Boolean(result?.ok && state.filePath);
}

function closeImageDialog() {
  imageDialog.hidden = true;
  state.imageSelection = null;
  state.imageAsset = null;
  imageDropZone.classList.remove("drag-over");
  renderImageSelection();
  editorView.focus();
}

async function chooseImageForDialog() {
  const result = await desktopApi.chooseImage();
  if (!result?.ok) {
    if (!result?.canceled) {
      imagePathStatus.textContent = result?.error || "Unable to choose image";
    }
    return;
  }

  prepareImageForDialog(result.filePath, "choose", getFileNameFromPath(result.filePath));
}

async function handleDroppedImage(files) {
  if (files?.length > 1) {
    imagePathStatus.textContent = "Only one image can be inserted at a time; using the first dropped file";
  }
  const file = files?.[0];
  if (!file) return;
  const sourcePath = desktopApi.getDroppedFilePath?.(file);
  if (!sourcePath) {
    imagePathStatus.textContent = "Unable to read the dropped image path";
    return;
  }

  prepareImageForDialog(sourcePath, "drop", file.name || getFileNameFromPath(sourcePath));
}

function prepareImageForDialog(sourcePath, mode, name) {
  state.imageAsset = { sourcePath, mode, name: name || getFileNameFromPath(sourcePath) };
  imagePathStatus.textContent = "Selected image will be copied beside the document on insert";
  renderImageSelection();
}

function clearSelectedImage() {
  state.imageAsset = null;
  imagePathStatus.textContent = "No image selected";
  renderImageSelection();
}

function renderImageSelection() {
  if (!state.imageAsset?.sourcePath) {
    imageThumbButton.hidden = true;
    imageThumbPreview.removeAttribute("src");
    imageThumbLabel.textContent = "";
    return;
  }

  imageThumbButton.hidden = false;
  imageThumbPreview.src = desktopApi.resolveDocumentAssetUrl(state.filePath, state.imageAsset.sourcePath);
  imageThumbLabel.textContent = state.imageAsset.name;
}

function getFileNameFromPath(filePath) {
  return (filePath || "").split(/[\\/]/).filter(Boolean).pop() || "Selected image";
}

async function insertConfiguredImage() {
  if (!state.imageAsset?.sourcePath) {
    imagePathStatus.textContent = "Choose or drop an image first";
    return;
  }

  const result = await desktopApi.prepareImage({
    sourcePath: state.imageAsset.sourcePath,
    documentPath: state.filePath,
    mode: state.imageAsset.mode
  });
  if (!result?.ok) {
    imagePathStatus.textContent = result?.error || "Unable to prepare image";
    return;
  }

  const selection = state.imageSelection || getSelectionRange();
  const altText = imageAltInput.value.trim() || "image";
  const imagePath = result.markdownPath;
  closeImageDialog();
  replaceSelection(`![${escapeMarkdownLinkText(altText)}](${escapeMarkdownLinkAddress(imagePath)})`, selection.start, selection.end);
}

function resolvePreviewImageSources() {
  if (!desktopApi?.resolveDocumentAssetUrl || !state.filePath) return;

  preview.querySelectorAll("img").forEach((image) => {
    const source = image.getAttribute("src");
    if (!source) return;
    image.setAttribute("src", desktopApi.resolveDocumentAssetUrl(state.filePath, source));
  });
}

function applyBlockFormat(format) {
  const lineRange = getCurrentLineRange();
  const line = state.markdown.slice(lineRange.start, lineRange.end);
  const stripped = line.replace(/^(#{1,6}\s+|>\s+|```\w*\s*)/, "");
  const replacements = {
    paragraph: stripped,
    h1: `# ${stripped || "Heading"}`,
    h2: `## ${stripped || "Heading"}`,
    h3: `### ${stripped || "Heading"}`,
    h4: `#### ${stripped || "Heading"}`,
    h5: `##### ${stripped || "Heading"}`,
    h6: `###### ${stripped || "Heading"}`,
    blockquote: `> ${stripped || "Quote"}`,
    codeblock: `\`\`\`\n${line || "code"}\n\`\`\``
  };
  replaceSelection(replacements[format] || line, lineRange.start, lineRange.end);
}

function updateBlockSelect() {
  if (!editorView || document.activeElement === blockSelect) return;
  blockSelect.value = getCurrentBlockFormat();
}

function getCurrentBlockFormat() {
  const lineRange = getCurrentLineRange();
  const line = state.markdown.slice(lineRange.start, lineRange.end);
  const heading = /^(#{1,6})\s+/.exec(line);
  if (heading) return `h${heading[1].length}`;
  if (/^>\s+/.test(line)) return "blockquote";
  if (/^```\w*\s*$/.test(line)) return "codeblock";
  return "paragraph";
}

function getCurrentLineRange() {
  const cursor = getSelectionRange().start;
  const before = state.markdown.lastIndexOf("\n", cursor - 1);
  const after = state.markdown.indexOf("\n", cursor);
  return {
    start: before === -1 ? 0 : before + 1,
    end: after === -1 ? state.markdown.length : after
  };
}

function replaceSelection(value, start, end) {
  state.markdown = `${state.markdown.slice(0, start)}${value}${state.markdown.slice(end)}`;
  setEditorText(state.markdown);
  setSelectionRange(start, start + value.length);
  editorView.focus();
  state.dirty = true;
  state.saveError = "";
  scheduleAutoSave();
  render();
}

function jumpToLine(lineNumber) {
  const lines = state.markdown.split("\n");
  const position = lines.slice(0, Math.max(0, lineNumber - 1)).join("\n").length + (lineNumber > 1 ? 1 : 0);
  setSelectionRange(position, position);
  editorView.focus();
}

function getEditorText() {
  return editorView?.state.doc.toString() || "";
}

function setEditorText(value) {
  if (!editorView) return;
  suppressEditorUpdate = true;
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: value
    }
  });
  suppressEditorUpdate = false;
}

function resetEditorDocument(value) {
  if (!editorView) return;
  suppressEditorUpdate = true;
  editorView.setState(createEditorState(value));
  suppressEditorUpdate = false;
}

function getSelectionRange() {
  const range = editorView.state.selection.main;
  return {
    start: Math.min(range.from, range.to),
    end: Math.max(range.from, range.to)
  };
}

function setSelectionRange(start, end) {
  editorView.dispatch({
    selection: {
      anchor: start,
      head: end
    },
    scrollIntoView: true
  });
}

function addRecentFile(file) {
  if (!file?.filePath) return;
  const item = {
    name: file.fileName || getBaseName(file.filePath),
    path: file.filePath
  };
  state.recentFiles = [item, ...state.recentFiles.filter((existing) => existing.path !== item.path)].slice(0, MAX_RECENT_FILES);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(state.recentFiles));
}

function removeRecentFile(filePath) {
  state.recentFiles = state.recentFiles.filter((file) => file.path !== filePath);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(state.recentFiles));
}

function loadRecentFiles() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (item && typeof item === "object" && typeof item.path === "string") {
          return {
            name: typeof item.name === "string" ? item.name : getBaseName(item.path),
            path: item.path
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, MAX_RECENT_FILES);
  } catch {
    return [];
  }
}

function getBaseName(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
