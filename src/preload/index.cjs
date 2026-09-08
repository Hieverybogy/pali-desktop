const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pali", {
  command: (action, value) => ipcRenderer.send("command", action, value),
  subscribe: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on("frame", listener);
    return () => ipcRenderer.removeListener("frame", listener);
  },
});
