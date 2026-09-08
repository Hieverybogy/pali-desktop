const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
// Isolate settings and the single-instance lock before Electron becomes ready.
const instance = process.argv
  .find((arg) => arg.startsWith("--instance="))
  ?.slice(11);
if (instance !== undefined) {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(instance)) {
    throw new Error(
      "--instance must contain 1–32 letters, digits, underscores or hyphens",
    );
  }
  const directory = path.join(app.getPath("appData"), `pali-test-${instance}`);
  fs.mkdirSync(directory, { recursive: true });
  app.setPath("userData", directory);
}
const { startApplication } = require("./runtime.cjs");
startApplication();
