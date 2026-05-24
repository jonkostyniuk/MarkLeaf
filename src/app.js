import { extractHeadings, getWordCount, renderMarkdown } from "./markdown.js";

const AUTOSAVE_DELAY_MS = 1200;
const WATCH_INTERVAL_MS = 3000;
const RECENT_FILES_KEY = "markleaf.recentFiles";
const desktopApi = window.markleaf;
const isElectron = desktopApi?.platform === "electron";

const sampleMarkdown = `# Untitled MarkLeaf Document

Write Markdown on the left and preview the styled document on the right.

## Getting started

- Use the toolbar to insert Markdown structures.
- Pick a style to change the preview.
- Open a local Markdown file to enable native save, reload, sidecar, and external-change workflows.

> MarkLeaf keeps Markdown as the source of truth.

| Item | Status |
| --- | --- |
| Markdown editor | Ready |
| Preview | Ready |
| Electron shell | Pending |
`;

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
  markdown: sampleMarkdown,
  fileHandle: null,
  filePath: null,
  fileName: "Untitled.md",
  lastModified: null,
  dirty: false,
  saving: false,
  saveError: "",
  externalChange: false,
  mode: "split",
  selectedStyle: "memo",
  autosaveTimer: null,
  watchTimer: null,
  recentFiles: loadRecentFiles()
};

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div>
        <h1>MarkLeaf</h1>
        <p class="subtitle">Markdown-first document editor prototype</p>
      </div>
      <div class="file-actions">
        <button type="button" data-action="new">New</button>
        <button type="button" data-action="open">Open</button>
        <label class="file-fallback" id="importLabel">
          Import
          <input id="fileInput" type="file" accept=".md,.markdown,.txt,.mdown,text/markdown,text/plain">
        </label>
        <button type="button" data-action="save">Save</button>
        <button type="button" data-action="saveAs">Save As</button>
        <button type="button" data-action="refresh">Refresh</button>
      </div>
    </header>

    <section class="toolbar" aria-label="Markdown toolbar">
      <select id="blockSelect" aria-label="Block format">
        <option value="paragraph">Paragraph</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="blockquote">Quote</option>
        <option value="codeblock">Code block</option>
      </select>
      <button type="button" data-wrap="**|**" title="Bold">B</button>
      <button type="button" data-wrap="*|*" title="Italic">I</button>
      <button type="button" data-wrap="~~|~~" title="Strikethrough">S</button>
      <button type="button" data-wrap="\`|\`" title="Inline code">Code</button>
      <button type="button" data-insert="link">Link</button>
      <button type="button" data-insert="image">Image</button>
      <button type="button" data-insert="ul">Bullet</button>
      <button type="button" data-insert="ol">Numbered</button>
      <button type="button" data-insert="task">Task</button>
      <button type="button" data-insert="table">Table</button>
      <button type="button" data-insert="hr">Rule</button>
      <select id="styleSelect" aria-label="Preview style"></select>
      <div class="mode-switch" role="group" aria-label="View mode">
        <button type="button" data-mode="markdown">Markdown</button>
        <button type="button" data-mode="split">Split</button>
      </div>
    </section>

    <section id="externalBanner" class="external-banner" hidden>
      <span>File changed externally.</span>
      <button type="button" data-action="acceptExternal">Reload from disk</button>
      <button type="button" data-action="dismissExternal">Keep local version</button>
    </section>

    <section class="workspace">
      <aside class="sidebar">
        <section>
          <h2>Document</h2>
          <dl class="document-meta">
            <dt>File</dt>
            <dd id="fileName"></dd>
            <dt>Status</dt>
            <dd id="saveState"></dd>
            <dt>Words</dt>
            <dd id="wordCount"></dd>
            <dt>Characters</dt>
            <dd id="characterCount"></dd>
          </dl>
        </section>
        <section>
          <h2>Outline</h2>
          <nav id="outline" class="outline"></nav>
        </section>
        <section>
          <h2>Recent</h2>
          <ul id="recentFiles" class="recent-files"></ul>
        </section>
      </aside>

      <section id="editorRegion" class="editor-region">
        <textarea id="editor" spellcheck="true" aria-label="Markdown source"></textarea>
        <article id="preview" class="preview document" aria-label="Rendered preview"></article>
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
const externalBanner = document.querySelector("#externalBanner");
const pathStatus = document.querySelector("#pathStatus");
const modeStatus = document.querySelector("#modeStatus");
const watchStatus = document.querySelector("#watchStatus");
const fileInput = document.querySelector("#fileInput");
const importLabel = document.querySelector("#importLabel");

initialize();

function initialize() {
  populateStyleSelect();
  editor.value = state.markdown;
  bindEvents();
  bindDesktopEvents();
  render();
}

function bindEvents() {
  editor.addEventListener("input", () => {
    state.markdown = editor.value;
    state.dirty = true;
    state.saveError = "";
    scheduleAutoSave();
    render();
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.action) {
      handleAction(target.dataset.action);
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

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await openImportedFile(file);
    fileInput.value = "";
  });

  window.addEventListener("beforeunload", (event) => {
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
  if (action === "acceptExternal") await refreshFromDisk(true);
  if (action === "dismissExternal") {
    state.externalChange = false;
    render();
  }
}

function populateStyleSelect() {
  styleSelect.innerHTML = Object.entries(styles)
    .map(([value, style]) => `<option value="${value}">${style.label}</option>`)
    .join("");
  styleSelect.value = state.selectedStyle;
}

function render() {
  if (editor.value !== state.markdown) {
    editor.value = state.markdown;
  }
  preview.innerHTML = renderMarkdown(state.markdown);
  preview.className = `preview document ${styles[state.selectedStyle].className}`;
  editorRegion.dataset.mode = state.mode;
  externalBanner.hidden = !state.externalChange;

  fileName.textContent = state.fileName;
  saveState.textContent = getSaveStateLabel();
  wordCount.textContent = String(getWordCount(state.markdown));
  characterCount.textContent = String(state.markdown.length);
  pathStatus.textContent = getPathStatus();
  modeStatus.textContent = `Mode: ${state.mode}`;
  watchStatus.textContent = getWatchStatus();
  importLabel.hidden = isElectron;

  renderOutline();
  renderRecentFiles();
  updateModeButtons();
}

function getSaveStateLabel() {
  if (state.saveError) return `Save error: ${state.saveError}`;
  if (state.saving) return "Saving...";
  if (state.dirty) return "Unsaved";
  return "Saved";
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
  recentFiles.innerHTML = state.recentFiles.map((name) => `<li>${name}</li>`).join("");
}

function updateModeButtons() {
  app.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
}

function scheduleAutoSave() {
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    saveNow();
  }, AUTOSAVE_DELAY_MS);
}

async function saveNow() {
  if (isElectron) {
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
    addRecentFile(state.fileName);
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
    state.saveError = "Browser file picker handles are unavailable. Use Import instead.";
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
  const file = await handle.getFile();
  state.fileHandle = handle;
  state.filePath = null;
  state.fileName = file.name;
  state.markdown = await file.text();
  state.lastModified = file.lastModified;
  state.dirty = false;
  state.saveError = "";
  state.externalChange = false;
  editor.value = state.markdown;
  addRecentFile(file.name);
  startWatching();
  render();
}

async function openImportedFile(file) {
  state.fileHandle = null;
  state.filePath = null;
  state.fileName = file.name;
  state.markdown = await file.text();
  state.lastModified = file.lastModified;
  state.dirty = false;
  state.saveError = "";
  state.externalChange = false;
  editor.value = state.markdown;
  addRecentFile(file.name);
  stopWatching();
  render();
}

async function refreshFromDisk(force = false) {
  if (isElectron) {
    if (!state.filePath) {
      state.saveError = "Refresh requires an opened file.";
      render();
      return;
    }

    if (state.dirty && !force) {
      state.externalChange = true;
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

  if (state.dirty && !force) {
    state.externalChange = true;
    render();
    return;
  }

  const file = await state.fileHandle.getFile();
  state.markdown = await file.text();
  state.lastModified = file.lastModified;
  state.dirty = false;
  state.saveError = "";
  state.externalChange = false;
  editor.value = state.markdown;
  render();
}

function startWatching() {
  stopWatching();
  state.watchTimer = window.setInterval(async () => {
    if (!state.fileHandle || state.saving) return;
    try {
      const file = await state.fileHandle.getFile();
      if (state.lastModified && file.lastModified !== state.lastModified) {
        if (state.dirty) {
          state.externalChange = true;
          render();
        } else {
          state.markdown = await file.text();
          state.lastModified = file.lastModified;
          editor.value = state.markdown;
          render();
        }
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
  state.fileHandle = null;
  state.filePath = null;
  state.fileName = "Untitled.md";
  state.lastModified = null;
  state.markdown = sampleMarkdown;
  state.dirty = true;
  state.saveError = "";
  state.externalChange = false;
  stopWatching();
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

async function saveWithDesktopApi(saveAsDocument) {
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

    if (result?.ok) {
      applyOpenedDocument(result);
    } else if (!result?.canceled) {
      state.saveError = result?.error || "Unable to save file";
      state.saving = false;
      render();
    } else {
      state.saving = false;
      render();
    }
  } catch (error) {
    state.saving = false;
    state.saveError = error.message || "Unable to save file";
    render();
  }
}

function applyOpenedDocument(result) {
  state.fileHandle = null;
  state.filePath = result.filePath || null;
  state.fileName = result.fileName || "Untitled.md";
  state.markdown = result.markdown || "";
  state.lastModified = result.lastModified || null;
  state.dirty = false;
  state.saving = false;
  state.saveError = "";
  state.externalChange = false;
  editor.value = state.markdown;
  addRecentFile(state.fileName);
  if (!isElectron) startWatching();
  render();
}

function bindDesktopEvents() {
  if (!isElectron) return;

  desktopApi.onExternalChange((payload) => {
    if (payload.filePath !== state.filePath) return;
    state.externalChange = true;
    render();
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
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
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
  replaceSelection(inserts[type] || "", editor.selectionStart, editor.selectionEnd);
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
  const cursor = editor.selectionStart;
  const before = state.markdown.lastIndexOf("\n", cursor - 1);
  const after = state.markdown.indexOf("\n", cursor);
  return {
    start: before === -1 ? 0 : before + 1,
    end: after === -1 ? state.markdown.length : after
  };
}

function replaceSelection(value, start, end) {
  state.markdown = `${state.markdown.slice(0, start)}${value}${state.markdown.slice(end)}`;
  editor.value = state.markdown;
  editor.focus();
  editor.setSelectionRange(start, start + value.length);
  state.dirty = true;
  state.saveError = "";
  scheduleAutoSave();
  render();
}

function jumpToLine(lineNumber) {
  const lines = state.markdown.split("\n");
  const position = lines.slice(0, Math.max(0, lineNumber - 1)).join("\n").length + (lineNumber > 1 ? 1 : 0);
  editor.focus();
  editor.setSelectionRange(position, position);
}

function addRecentFile(name) {
  state.recentFiles = [name, ...state.recentFiles.filter((item) => item !== name)].slice(0, 5);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(state.recentFiles));
}

function loadRecentFiles() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
