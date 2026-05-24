const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let mainWindow = null;
let watchedPath = null;
let watcher = null;
let suppressNextWatchEvent = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "MarkLeaf",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopWatching();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

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

function openFile(filePath) {
  const markdown = fs.readFileSync(filePath, "utf8");
  const result = readFileResult(filePath, markdown);
  watchFile(filePath);
  return result;
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
  suppressNextWatchEvent = true;
  await fs.promises.writeFile(filePath, markdown, "utf8");
  await writeMetadata(filePath, metadata);
  watchFile(filePath);
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

function watchFile(filePath) {
  if (watchedPath === filePath && watcher) return;

  stopWatching();
  watchedPath = filePath;
  watcher = fs.watch(filePath, { persistent: false }, () => {
    if (suppressNextWatchEvent) {
      suppressNextWatchEvent = false;
      return;
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
}
