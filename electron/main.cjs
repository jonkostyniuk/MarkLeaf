const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const rendererIndex = path.join(__dirname, "..", "dist", "index.html");
const OWN_WRITE_SUPPRESSION_MS = 1500;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

let mainWindow = null;
let watchedPath = null;
let watcher = null;
let watchedMtimeMs = null;
let suppressWatchUntil = 0;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "MarkLeaf",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: process.platform === "darwin" ? { x: 14, y: 11 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(rendererIndex);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openAllowedExternalUrl(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url === mainWindow.webContents.getURL()) return;
    event.preventDefault();
    openAllowedExternalUrl(url);
  });

  mainWindow.on("close", () => {
    if (!isQuitting) {
      isQuitting = true;
      app.quit();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  installMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopWatching();
  app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
});

function installMenu() {
  const template = [
    {
      label: "MarkLeaf",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        { label: "New", accelerator: "CmdOrCtrl+N", click: () => mainWindow?.webContents.send("menu:new") },
        { label: "Open...", accelerator: "CmdOrCtrl+O", click: () => mainWindow?.webContents.send("menu:open") },
        { label: "Save", accelerator: "CmdOrCtrl+S", click: () => mainWindow?.webContents.send("menu:save") },
        { label: "Save As...", accelerator: "CmdOrCtrl+Shift+S", click: () => mainWindow?.webContents.send("menu:save-as") },
        { type: "separator" },
        { label: "Export PDF...", accelerator: "CmdOrCtrl+E", click: () => mainWindow?.webContents.send("menu:export-pdf") },
        { type: "separator" },
        { label: "Reload from Disk", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.webContents.send("menu:refresh") },
        { type: "separator" },
        { label: "Document Settings...", accelerator: "CmdOrCtrl+,", click: () => mainWindow?.webContents.send("menu:settings") }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => mainWindow?.webContents.send("menu:undo") },
        { label: "Redo", accelerator: process.platform === "darwin" ? "CmdOrCtrl+Shift+Z" : "Ctrl+Y", click: () => mainWindow?.webContents.send("menu:redo") },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("document:new", async () => {
  stopWatching();
  return { ok: true };
});

ipcMain.handle("document:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Markdown File",
    properties: ["openFile"],
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown"] },
      { name: "Text", extensions: ["txt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }

  return openFile(result.filePaths[0]);
});

ipcMain.handle("document:openRecent", async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, missing: true, filePath };
  }

  try {
    return openFile(filePath);
  } catch (error) {
    return { ok: false, error: error.message || "Unable to open recent file.", filePath };
  }
});

ipcMain.handle("document:recentExists", async (_event, filePath) => {
  return { exists: Boolean(filePath && fs.existsSync(filePath)), filePath };
});

ipcMain.handle("document:save", async (_event, payload) => {
  if (!payload?.filePath) {
    return saveAs(payload);
  }

  await writeDocument(payload.filePath, payload.markdown, payload.metadata);
  return readFileResult(payload.filePath);
});

ipcMain.handle("document:saveAs", async (_event, payload) => {
  return saveAs(payload);
});

ipcMain.handle("export:pdf", async (_event, payload) => {
  try {
    return await exportPdf(payload);
  } catch (error) {
    return { ok: false, error: error.message || "Unable to export PDF." };
  }
});

ipcMain.handle("document:refresh", async (_event, filePath) => {
  if (!filePath) {
    return { ok: false, error: "No file is open." };
  }
  return openFile(filePath);
});

ipcMain.handle("link:openExternal", async (_event, url) => {
  return openAllowedExternalUrl(url);
});

ipcMain.handle("style:readBuiltin", async (_event, styleId) => {
  return readBuiltinStyle(styleId);
});

ipcMain.handle("image:choose", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose Image",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }

  return { ok: true, filePath: result.filePaths[0] };
});

ipcMain.handle("image:prepare", async (_event, payload) => {
  try {
    return await prepareImageAsset(payload);
  } catch (error) {
    return { ok: false, error: error.message || "Unable to prepare image." };
  }
});

ipcMain.handle("dialog:confirmOpenRecent", async (_event, payload) => {
  const fileName = payload?.fileName || "this file";
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Yes", "No"],
    defaultId: 0,
    cancelId: 1,
    title: "Open Recent File",
    message: `Open ${fileName}?`,
    detail: payload?.filePath || ""
  });

  return { confirmed: result.response === 0 };
});

ipcMain.handle("dialog:notifyMissingRecent", async (_event, payload) => {
  await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["OK"],
    defaultId: 0,
    title: "Recent File Missing",
    message: "The recent file could not be found.",
    detail: payload?.filePath || ""
  });

  return { ok: true };
});

function openFile(filePath) {
  const markdown = fs.readFileSync(filePath, "utf8");
  const result = readFileResult(filePath, markdown);
  watchFile(filePath, result.lastModified);
  return result;
}

function openAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return { ok: false, error: "Only web and email links can be opened externally." };
    }
    shell.openExternal(parsed.toString());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to open external link." };
  }
}

function readBuiltinStyle(styleId) {
  if (!/^[a-z0-9-]+$/.test(styleId || "")) {
    return { ok: false, error: "Invalid built-in style id." };
  }

  const stylePath = path.join(__dirname, "..", "styles", "builtin", `${styleId}.css`);
  try {
    return {
      ok: true,
      id: styleId,
      css: fs.readFileSync(stylePath, "utf8")
    };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to read built-in style." };
  }
}

async function prepareImageAsset(payload = {}) {
  const sourcePath = payload.sourcePath;
  const documentPath = payload.documentPath;
  if (!documentPath) {
    return { ok: false, error: "Save the Markdown document before inserting local images." };
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: "The selected image could not be found." };
  }

  const stats = fs.statSync(sourcePath);
  if (!stats.isFile()) {
    return { ok: false, error: "The selected image is not a file." };
  }

  const extension = path.extname(sourcePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return { ok: false, error: "Supported image types are PNG, JPG, GIF, WebP, and SVG." };
  }

  const documentDir = path.dirname(documentPath);
  const normalizedSource = path.resolve(sourcePath);
  const finalPath = await copyImageBesideDocument(normalizedSource, documentPath);

  return {
    ok: true,
    filePath: finalPath,
    markdownPath: toMarkdownRelativePath(documentDir, finalPath),
    copied: true
  };
}

async function copyImageBesideDocument(sourcePath, documentPath) {
  const documentDir = path.dirname(documentPath);
  const documentFileName = path.basename(documentPath);
  const assetDir = path.join(documentDir, `${documentFileName}.assets`);
  await fs.promises.mkdir(assetDir, { recursive: true });

  const parsed = path.parse(sourcePath);
  const destination = await getAvailableAssetPath(assetDir, parsed.name, parsed.ext);
  await fs.promises.copyFile(sourcePath, destination);
  return destination;
}

async function getAvailableAssetPath(assetDir, baseName, extension) {
  let index = 0;
  while (true) {
    const suffix = index === 0 ? "" : `-${index}`;
    const candidate = path.join(assetDir, `${baseName}${suffix}${extension}`);
    try {
      await fs.promises.access(candidate);
      index += 1;
    } catch {
      return candidate;
    }
  }
}

function toMarkdownRelativePath(documentDir, filePath) {
  return path.relative(documentDir, filePath).split(path.sep).join("/");
}

async function saveAs(payload) {
  const defaultPath = payload?.fileName || "Untitled.md";
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save Markdown File",
    defaultPath,
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "Text", extensions: ["txt"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  await writeDocument(result.filePath, payload?.markdown || "", payload?.metadata);
  return readFileResult(result.filePath);
}

async function exportPdf(payload = {}) {
  if (!payload.filePath) {
    return { ok: false, error: "Save the Markdown document before exporting PDF." };
  }

  const defaultPath = path.join(
    path.dirname(payload.filePath),
    `${path.basename(payload.filePath, path.extname(payload.filePath))}.pdf`
  );
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: "Export PDF",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { ok: false, canceled: true };
  }

  const exportWindow = new BrowserWindow({
    width: 960,
    height: 1200,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const includePageNumbers = Boolean(payload.exportSettings?.pdf?.includePageNumbers);
  const tempDir = await fs.promises.mkdtemp(path.join(app.getPath("temp"), "markleaf-pdf-"));
  const tempHtmlPath = path.join(tempDir, "export.html");
  await fs.promises.writeFile(tempHtmlPath, buildPdfExportHtml(payload), "utf8");

  try {
    await exportWindow.loadFile(tempHtmlPath);
    const pdfBuffer = await exportWindow.webContents.printToPDF({
      displayHeaderFooter: includePageNumbers,
      headerTemplate: includePageNumbers ? buildBlankPdfHeaderTemplate() : undefined,
      footerTemplate: includePageNumbers ? buildPdfFooterTemplate(payload.styleCss || "") : undefined,
      printBackground: true,
      preferCSSPageSize: true
    });
    await fs.promises.writeFile(saveResult.filePath, pdfBuffer);
    return { ok: true, filePath: saveResult.filePath, pageNumbers: includePageNumbers };
  } finally {
    exportWindow.close();
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

function buildPdfExportHtml(payload) {
  const page = normalizePdfPageSettings(payload.pageSettings);
  const documentDirUrl = pathToFileURL(path.dirname(payload.filePath)).toString();
  const title = payload.documentInfo?.title || path.basename(payload.filePath);
  const profile = payload.exportSettings?.pdf?.profile || "standard";
  const pageBackground = getCssCustomProperty(payload.styleCss || "", "--doc-color-background") || "#ffffff";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${escapeHtml(`${documentDirUrl}/`)}">
  <title>${escapeHtml(title)}</title>
  <style>${payload.styleCss || ""}</style>
  <style>
    :root {
      --markleaf-pdf-page-background: ${pageBackground};
    }

    @page {
      size: ${page.size} ${page.orientation};
      margin: ${page.margins.top} ${page.margins.right} ${page.margins.bottom} ${page.margins.left};
      background: var(--markleaf-pdf-page-background);
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: var(--markleaf-pdf-page-background);
    }

    body {
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: -1;
      background: var(--markleaf-pdf-page-background);
    }

    .markleaf-pdf-export {
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
    }

    .markleaf-pdf-export.document.doc-style {
      max-width: none;
      margin: 0;
      box-sizing: border-box;
      padding: 0;
      background: var(--doc-color-background, var(--markleaf-pdf-page-background));
    }

    .markleaf-pdf-export img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body data-pdf-profile="${escapeAttribute(profile)}">
  <main class="markleaf-pdf-export document doc-style ${escapeAttribute(payload.styleClassName || "")}">
    ${payload.html || ""}
  </main>
</body>
</html>`;
}

function getCssCustomProperty(css, propertyName) {
  const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedName}\\s*:\\s*([^;{}]+);`).exec(css);
  if (!match) return "";

  const value = match[1].trim();
  if (!value || /[;{}]/.test(value)) return "";
  return value;
}

function buildBlankPdfHeaderTemplate() {
  return '<div style="width:100%; font-size:1px;"></div>';
}

function buildPdfFooterTemplate(styleCss) {
  const pageBackground = getCssCustomProperty(styleCss, "--doc-color-background") || "#ffffff";
  const fontFamily = getCssDeclaration(styleCss, "font-family") || "Arial, Helvetica, sans-serif";
  const textColor = getContrastingTextColor(pageBackground);

  return `
    <div style="width:100%; text-align:center; color:${escapeAttribute(textColor)}; font-family:${escapeAttribute(fontFamily)}; font-size:9px; line-height:1; -webkit-print-color-adjust:exact;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `;
}

function getCssDeclaration(css, propertyName) {
  const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedName}\\s*:\\s*([^;{}]+);`).exec(css);
  if (!match) return "";

  const value = match[1].trim();
  if (!value || /[;{}]/.test(value)) return "";
  return value;
}

function getContrastingTextColor(backgroundColor) {
  const rgb = parseCssColor(backgroundColor);
  if (!rgb) return "#000000";

  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#000000" : "#ffffff";
}

function parseCssColor(value) {
  const color = String(value || "").trim();
  const hex = /^#([a-f\d]{3}|[a-f\d]{6})$/i.exec(color);
  if (hex) {
    const normalized = hex[1].length === 3
      ? hex[1].split("").map((char) => `${char}${char}`).join("")
      : hex[1];
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ];
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(color);
  if (rgb) {
    return rgb.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Number(channel))));
  }

  return null;
}

function normalizePdfPageSettings(pageSettings = {}) {
  const sizeMap = {
    letter: "Letter",
    a4: "A4",
    legal: "Legal"
  };
  const margins = pageSettings.margins || {};
  return {
    size: sizeMap[pageSettings.size] || "Letter",
    orientation: pageSettings.orientation === "landscape" ? "landscape" : "portrait",
    margins: {
      top: normalizeCssLength(margins.top, "1in"),
      right: normalizeCssLength(margins.right, "1in"),
      bottom: normalizeCssLength(margins.bottom, "1in"),
      left: normalizeCssLength(margins.left, "1in")
    }
  };
}

function normalizeCssLength(value, fallback) {
  const trimmed = String(value || "").trim();
  return /^(\d+|\d*\.\d+)(in|cm|mm|pt|px)$/.test(trimmed) ? trimmed : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function writeDocument(filePath, markdown, metadata = {}) {
  suppressWatchUntil = Date.now() + OWN_WRITE_SUPPRESSION_MS;
  await fs.promises.writeFile(filePath, markdown, "utf8");
  watchedMtimeMs = fs.statSync(filePath).mtimeMs;
  await writeMetadata(filePath, metadata);
  suppressWatchUntil = Date.now() + OWN_WRITE_SUPPRESSION_MS;
  watchFile(filePath, watchedMtimeMs);
}

async function writeMetadata(filePath, metadata) {
  const metaPath = `${filePath}.meta.json`;
  const existing = readMetadata(filePath);
  const sidecar = mergeMetadata(existing, metadata);

  await fs.promises.writeFile(metaPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
}

function mergeMetadata(existing = {}, metadata = {}) {
  return {
    ...existing,
    schemaVersion: "1.0",
    style: {
      ...(existing.style || {}),
      id: metadata?.style?.id || metadata?.styleId || existing.style?.id || "markleaf-light",
      cssPath: metadata?.style?.cssPath ?? existing.style?.cssPath ?? ""
    },
    view: {
      ...(existing.view || {}),
      mode: metadata?.view?.mode || metadata?.mode || existing.view?.mode || "split",
      wordWrap: metadata?.view?.wordWrap ?? metadata?.wordWrap ?? existing.view?.wordWrap ?? true,
      lastScrollPosition: existing.view?.lastScrollPosition || 0,
      foldedHeadings: Array.isArray(existing.view?.foldedHeadings) ? existing.view.foldedHeadings : []
    },
    document: {
      title: "",
      author: "",
      subject: "",
      keywords: [],
      notes: "",
      ...(existing.document || {}),
      ...(metadata.document || {})
    },
    page: {
      size: "letter",
      orientation: "portrait",
      ...(existing.page || {}),
      ...(metadata.page || {}),
      margins: {
        top: "1in",
        right: "1in",
        bottom: "1in",
        left: "1in",
        ...(existing.page?.margins || {}),
        ...(metadata.page?.margins || {})
      }
    },
    export: {
      ...(existing.export || {}),
      ...(metadata.export || {}),
      pdf: {
        enabled: true,
        includePageNumbers: false,
        profile: "standard",
        ...(existing.export?.pdf || {}),
        ...(metadata.export?.pdf || {})
      },
      docx: {
        enabled: metadata.export?.docx?.enabled ?? existing.export?.docx?.enabled ?? true,
        mapCssFonts: metadata.export?.docx?.mapCssFonts ?? existing.export?.docx?.mapCssFonts ?? true
      }
    },
    updatedAt: new Date().toISOString()
  };
}

function readMetadata(filePath) {
  const metaPath = `${filePath}.meta.json`;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return {};
  }
}

function readFileResult(filePath, markdown) {
  const stats = fs.statSync(filePath);
  return {
    ok: true,
    filePath,
    fileName: path.basename(filePath),
    markdown: markdown ?? fs.readFileSync(filePath, "utf8"),
    lastModified: stats.mtimeMs,
    metadata: readMetadata(filePath)
  };
}

function watchFile(filePath, knownMtimeMs = null) {
  if (knownMtimeMs !== null) {
    watchedMtimeMs = knownMtimeMs;
  }

  if (watchedPath === filePath && watcher) return;

  stopWatching();
  watchedPath = filePath;
  watcher = fs.watch(filePath, { persistent: false }, () => {
    let currentMtimeMs;
    try {
      currentMtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      currentMtimeMs = null;
    }

    if (currentMtimeMs !== null && currentMtimeMs === watchedMtimeMs) {
      return;
    }

    if (Date.now() < suppressWatchUntil) {
      if (currentMtimeMs !== null) {
        watchedMtimeMs = currentMtimeMs;
      }
      return;
    }

    if (currentMtimeMs !== null) {
      watchedMtimeMs = currentMtimeMs;
    }

    mainWindow?.webContents.send("document:external-change", {
      filePath,
      fileName: path.basename(filePath)
    });
  });
}

function stopWatching() {
  watcher?.close();
  watcher = null;
  watchedPath = null;
  watchedMtimeMs = null;
}
