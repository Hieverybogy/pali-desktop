const { ipcMain } = require("electron");
const { SIZES, MOODS } = require("../services/companion.cjs");
const { isCharacter } = require("../services/settings.cjs");
function validCommand(action, value) {
  if (action === "pet-part") return ["hand", "foot", "ear"].includes(value);
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
    if (value.type === "chat.send")
      return (
        id(value.to) &&
        typeof value.text === "string" &&
        value.text.trim().length > 0 &&
        value.text.length <= 1000
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
    [
      "drag-start",
      "drag-end",
      "panel",
      "pet-menu",
      "pet",
      "quit",
      "chat-close",
      "ai-open",
      "ai-close",
    ].includes(action)
  )
    return value === undefined;
  if (action === "chat-open")
    return typeof value === "string" && value.length > 0 && value.length <= 64;
  if (action === "ai-ask")
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 2000
    );
  if (
    ["roaming", "sleeping", "visible", "reminders", "speech-hover"].includes(
      action,
    )
  )
    return typeof value === "boolean";
  if (action === "character") return isCharacter(value);
  if (action === "size") return SIZES.includes(value);
  if (action === "mood") return MOODS.includes(value);
  return false;
}
function registerCommands(getWindows, handle) {
  const listener = (event, action, value) => {
    const { pet, panel, bubble } = getWindows();
    const fromPet =
      pet && !pet.isDestroyed() && event.sender === pet.webContents;
    const fromPanel =
      panel && !panel.isDestroyed() && event.sender === panel.webContents;
    const fromBubble =
      bubble && !bubble.isDestroyed() && event.sender === bubble.webContents;
    if ((!fromPet && !fromPanel && !fromBubble) || !validCommand(action, value))
      return;
    handle(action, value, fromPet);
  };
  ipcMain.on("command", listener);
  return () => ipcMain.removeListener("command", listener);
}
module.exports = { registerCommands, validCommand };
