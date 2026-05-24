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
const WATCH_INTERVAL_MS = 3000;
const RECENT_FILES_KEY = "markleaf.recentFiles";
const MAX_RECENT_FILES = 5;
const EMPTY_DOCUMENT = "";
const desktopApi = window.markleaf;
const isElectron = desktopApi?.platform === "electron";

const styles = {
  memo: {
    label: "Technical memo",
    className: "doc-style-memo"
  },
  report: {
    label: "Report",
    className: "doc-style-report"
  },
  compact: {
    label: "Compact draft",
    className: "doc-style-compact"
  }
};

const state = {
  markdown: EMPTY_DOCUMENT,
  fileHandle: null,
  filePath: null,
  fileName: "Untitled.md",
  lastModified: null,
  dirty: false,
  saving: false,
  saveError: "",
  diskChanged: false,
  mode: "split",
  selectedStyle: "memo",
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
        <div class="mode-switch" role="group" aria-label="View mode">
          <button type="button" data-mode="markdown" class="icon-button text-icon tooltip-right" aria-label="Markdown mode" data-tooltip="Markdown mode">MD</button>
          <button type="button" data-mode="split" class="icon-button tooltip-right" aria-label="Split mode" data-tooltip="Split mode">${icon(Columns2)}</button>
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
        <section class="pane preview-pane">
          <header class="pane-header">
            <span>Preview</span>
          </header>
          <article id="preview" class="preview document" aria-label="Rendered preview"></article>
        </section>
      </section>
    </section>

    <footer class="statusbar">
      <span id="pathStatus"></span>
      <span id="modeStatus"></span>
      <span id="watchStatus"></span>
    </footer>
  </main>
`;

const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const editorRegion = document.querySelector("#editorRegion");
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

initialize();

function initialize() {
  document.body.classList.toggle("platform-darwin", desktopApi?.os === "darwin");
  populateStyleSelect();
  initializeEditor();
  bindEvents();
  bindDesktopEvents();
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
        if (!update.docChanged || suppressEditorUpdate) return;
        state.markdown = getEditorText();
        state.dirty = true;
        state.saveError = "";
        scheduleAutoSave();
        render();
      })
    ]
  });
}

function bindEvents() {
  app.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

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
    blockSelect.value = "paragraph";
  });

  styleSelect.addEventListener("change", () => {
    state.selectedStyle = styleSelect.value;
    state.dirty = true;
    scheduleAutoSave();
    render();
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

function render() {
  if (getEditorText() !== state.markdown) {
    setEditorText(state.markdown);
  }
  const documentStatus = getDocumentStatus();
  preview.innerHTML = renderMarkdown(state.markdown);
  preview.className = `preview document ${styles[state.selectedStyle].className}`;
  editorRegion.dataset.mode = state.mode;

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
  if (!state.filePath && !state.fileHandle && state.fileName === "Untitled.md") {
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
  const headings = extractHeadings(state.markdown);
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
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
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
  return isElectron ? Boolean(state.filePath) : Boolean(state.fileHandle);
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

  if (!state.fileHandle) {
    state.dirty = true;
    render();
    return;
  }

  try {
    state.saving = true;
    state.saveError = "";
    render();
    const writable = await state.fileHandle.createWritable();
    await writable.write(state.markdown);
    await writable.close();
    const file = await state.fileHandle.getFile();
    state.lastModified = file.lastModified;
    state.dirty = false;
    state.saving = false;
    state.diskChanged = false;
  } catch (error) {
    state.saving = false;
    state.saveError = error.message || "Unable to save";
  }

  render();
}

async function openWithPicker() {
  if (isElectron) {
    const result = await desktopApi.openDocument();
    if (result?.ok) {
      applyOpenedDocument(result);
    } else if (!result?.canceled) {
      state.saveError = result?.error || "Unable to open file";
      render();
    }
    return;
  }

  if (!window.showOpenFilePicker) {
    state.saveError = "Browser file picker handles are unavailable in this environment.";
    render();
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Markdown files",
          accept: {
            "text/markdown": [".md", ".markdown", ".mdown"],
            "text/plain": [".txt"]
          }
        }
      ]
    });
    await openFileHandle(handle);
  } catch (error) {
    if (error.name !== "AbortError") {
      state.saveError = error.message || "Unable to open file";
      render();
    }
  }
}

async function openFileHandle(handle) {
  clearAutoSave();
  const file = await handle.getFile();
  state.fileHandle = handle;
  state.filePath = null;
  state.fileName = file.name;
  state.markdown = await file.text();
  state.lastModified = file.lastModified;
  state.dirty = false;
  state.saveError = "";
  state.diskChanged = false;
  resetEditorDocument(state.markdown);
  startWatching();
  render();
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

  if (state.fileHandle) {
    await saveNow();
    return !state.dirty && !state.saveError;
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

  if (!state.fileHandle) {
    state.saveError = "Refresh requires a browser file handle. Use Open in a supported browser.";
    render();
    return;
  }

  const file = await state.fileHandle.getFile();
  state.markdown = await file.text();
  state.lastModified = file.lastModified;
  state.dirty = false;
  state.saveError = "";
  state.diskChanged = false;
  resetEditorDocument(state.markdown);
  render();
}

function startWatching() {
  stopWatching();
  state.watchTimer = window.setInterval(async () => {
    if (!state.fileHandle || state.saving) return;
    try {
      const file = await state.fileHandle.getFile();
      if (state.lastModified && file.lastModified !== state.lastModified) {
        state.diskChanged = true;
        render();
      }
    } catch (error) {
      state.saveError = error.message || "Unable to watch file";
      render();
    }
  }, WATCH_INTERVAL_MS);
}

function stopWatching() {
  window.clearInterval(state.watchTimer);
  state.watchTimer = null;
}

function createNewDocument() {
  desktopApi?.newDocument();
  clearAutoSave();
  state.fileHandle = null;
  state.filePath = null;
  state.fileName = "Untitled.md";
  state.lastModified = null;
  state.markdown = EMPTY_DOCUMENT;
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
  state.fileHandle = null;
  state.filePath = result.filePath || null;
  state.fileName = result.fileName || "Untitled.md";
  state.markdown = result.markdown || "";
  state.lastModified = result.lastModified || null;
  state.dirty = false;
  state.saving = false;
  state.saveError = "";
  state.diskChanged = false;
  resetEditorDocument(state.markdown);
  addRecentFile(result);
  if (!isElectron) startWatching();
  render();
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
  if (state.fileHandle) return `Opened with browser file handle: ${state.fileName}`;
  return isElectron ? "No file opened" : "No writable file handle";
}

function getWatchStatus() {
  if (state.filePath) return "Native file watcher active";
  if (state.fileHandle) return "External change polling active";
  return isElectron ? "Open a file to enable native watching" : "External watch unavailable until a file handle is opened";
}

function wrapSelection(pattern) {
  const [before, after] = pattern.split("|");
  const { start, end } = getSelectionRange();
  const selected = state.markdown.slice(start, end) || "text";
  replaceSelection(`${before}${selected}${after}`, start, end);
}

function insertMarkdown(type) {
  const inserts = {
    link: "[link text](https://example.com)",
    image: "![image alt](image.png)",
    ul: "- List item",
    ol: "1. List item",
    task: "- [ ] Task item",
    table: "| Column A | Column B |\n| --- | --- |\n| Value | Value |",
    hr: "\n---\n"
  };
  const { start, end } = getSelectionRange();
  replaceSelection(inserts[type] || "", start, end);
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
    blockquote: `> ${stripped || "Quote"}`,
    codeblock: `\`\`\`\n${line || "code"}\n\`\`\``
  };
  replaceSelection(replacements[format] || line, lineRange.start, lineRange.end);
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
