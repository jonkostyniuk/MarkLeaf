const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("markleaf", {
  platform: "electron",
  newDocument: () => ipcRenderer.invoke("document:new"),
  openDocument: () => ipcRenderer.invoke("document:open"),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  saveDocumentAs: (payload) => ipcRenderer.invoke("document:saveAs", payload),
  refreshDocument: (filePath) => ipcRenderer.invoke("document:refresh", filePath),
  onExternalChange: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("document:external-change", listener);
    return () => ipcRenderer.removeListener("document:external-change", listener);
  }
});
