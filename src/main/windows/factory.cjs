const { app, BrowserWindow } = require("electron");
const path = require("node:path");
function send(win, data) {
  if (win && !win.isDestroyed() && !win.webContents.isLoading())
    win.webContents.send("frame", data);
}
function load(win, view) {
  if (process.argv.includes("--dev"))
    win.loadURL(`http://127.0.0.1:5173/?view=${view}`);
  else
    win.loadFile(path.join(app.getAppPath(), "dist/index.html"), {
      query: { view },
    });
}
function createWindow(options, view) {
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: path.join(__dirname, "../../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  load(win, view);
  return win;
}
module.exports = { createWindow, send };
