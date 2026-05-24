const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

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
        { label: "Reload from Disk", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.webContents.send("menu:refresh") }
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

ipcMain.handle("document:refresh", async (_event, filePath) => {
  if (!filePath) {
    return { ok: false, error: "No file is open." };
  }
  return openFile(filePath);
});

ipcMain.handle("link:openExternal", async (_event, url) => {
  return openAllowedExternalUrl(url);
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
  const sidecar = {
    schemaVersion: 1,
    style: {
      id: metadata?.styleId || "memo"
    },
    view: {
      mode: metadata?.mode || "split",
      wordWrap: true
    },
    export: {
      pdf: {},
      docx: {}
    },
    updatedAt: new Date().toISOString()
  };

  await fs.promises.writeFile(metaPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
}

function readFileResult(filePath, markdown) {
  const stats = fs.statSync(filePath);
  return {
    ok: true,
    filePath,
    fileName: path.basename(filePath),
    markdown: markdown ?? fs.readFileSync(filePath, "utf8"),
    lastModified: stats.mtimeMs
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
