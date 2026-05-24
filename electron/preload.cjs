const { contextBridge, ipcRenderer, webUtils } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

contextBridge.exposeInMainWorld("markleaf", {
  platform: "electron",
  os: process.platform,
  newDocument: () => ipcRenderer.invoke("document:new"),
  openDocument: () => ipcRenderer.invoke("document:open"),
  recentDocumentExists: (filePath) => ipcRenderer.invoke("document:recentExists", filePath),
  openRecentDocument: (filePath) => ipcRenderer.invoke("document:openRecent", filePath),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  saveDocumentAs: (payload) => ipcRenderer.invoke("document:saveAs", payload),
  refreshDocument: (filePath) => ipcRenderer.invoke("document:refresh", filePath),
  openExternalLink: (url) => ipcRenderer.invoke("link:openExternal", url),
  chooseImage: () => ipcRenderer.invoke("image:choose"),
  prepareImage: (payload) => ipcRenderer.invoke("image:prepare", payload),
  getDroppedFilePath: (file) => webUtils.getPathForFile(file),
  resolveDocumentAssetUrl: (documentPath, assetPath) => resolveDocumentAssetUrl(documentPath, assetPath),
  confirmOpenRecent: (payload) => ipcRenderer.invoke("dialog:confirmOpenRecent", payload),
  notifyMissingRecent: (payload) => ipcRenderer.invoke("dialog:notifyMissingRecent", payload),
  onExternalChange: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("document:external-change", listener);
    return () => ipcRenderer.removeListener("document:external-change", listener);
  },
  onMenuCommand: (callback) => {
    const channels = ["menu:new", "menu:open", "menu:save", "menu:save-as", "menu:refresh", "menu:undo", "menu:redo"];
    const listeners = channels.map((channel) => {
      const listener = () => callback(channel.replace("menu:", ""));
      ipcRenderer.on(channel, listener);
      return { channel, listener };
    });
    return () => {
      listeners.forEach(({ channel, listener }) => ipcRenderer.removeListener(channel, listener));
    };
  }
});

function resolveDocumentAssetUrl(documentPath, assetPath) {
  if (!documentPath || !assetPath) return assetPath;
  if (/^(https?:|mailto:|data:|file:)/i.test(assetPath)) return assetPath;

  const [cleanPath, suffix = ""] = assetPath.split(/([?#].*)/, 2);
  const decodedPath = safeDecodeUriComponent(cleanPath);
  const absolutePath = path.resolve(path.dirname(documentPath), decodedPath);
  return `${pathToFileURL(absolutePath).toString()}${suffix}`;
}

function safeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
