const { ipcMain } = require("electron");
const { SIZES, MOODS } = require("../services/companion.cjs");
const { isCharacter } = require("../services/settings.cjs");
function validCommand(action, value) {
  if (action === "social-config")
    return (
      value &&
      typeof value.url === "string" &&
      value.url.length <= 2048 &&
      typeof value.enabled === "boolean" &&
      (value.accessKey === undefined ||
        (typeof value.accessKey === "string" && value.accessKey.length <= 256))
    );
  if (action === "social-action") {
    if (!value || typeof value !== "object") return false;
    const id = (v) => typeof v === "string" && v.length > 0 && v.length <= 64;
    if (value.type === "interaction.send")
      return (
        id(value.to) &&
        ["tea", "kiss", "hug", "cheer", "ball"].includes(value.action)
      );
    if (value.type === "ball.invite") return id(value.to);
    if (value.type === "ball.reply")
      return id(value.inviteId) && typeof value.accept === "boolean";
    if (value.type === "ball.leave") return id(value.roomId);
    if (value.type === "ball.pass")
      return (
        id(value.roomId) &&
        Number.isSafeInteger(value.sequence) &&
        value.sequence >= 0
      );
    return false;
  }
  if (
    ["drag-start", "drag-end", "panel", "pet-menu", "pet", "quit"].includes(
      action,
    )
  )
    return value === undefined;
  if (["roaming", "sleeping", "visible", "reminders"].includes(action))
    return typeof value === "boolean";
  if (action === "character") return isCharacter(value);
  if (action === "size") return SIZES.includes(value);
  if (action === "mood") return MOODS.includes(value);
  return false;
}
function registerCommands(getWindows, handle) {
  const listener = (event, action, value) => {
    const { pet, panel } = getWindows();
    const fromPet =
      pet && !pet.isDestroyed() && event.sender === pet.webContents;
    const fromPanel =
      panel && !panel.isDestroyed() && event.sender === panel.webContents;
    if ((!fromPet && !fromPanel) || !validCommand(action, value)) return;
    handle(action, value, fromPet);
  };
  ipcMain.on("command", listener);
  return () => ipcMain.removeListener("command", listener);
}
module.exports = { registerCommands, validCommand };
