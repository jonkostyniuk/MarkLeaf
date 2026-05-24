const { contextBridge, ipcRenderer } = require("electron");

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
