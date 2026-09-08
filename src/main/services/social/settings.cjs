const fs = require("node:fs");
const path = require("node:path");
const { safeStorage } = require("electron");
const DEFAULT_SOCIAL_URL = "ws://47.113.228.135:8060/pali/ws";
function loadSocial(dir) {
  try {
    const c = JSON.parse(
      fs.readFileSync(path.join(dir, "pali-social.json"), "utf8"),
    );
    return {
      url:
        typeof c.url === "string" && c.url.trim() ? c.url : DEFAULT_SOCIAL_URL,
      enabled: true,
      accessKey:
        c.key && safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(Buffer.from(c.key, "base64"))
          : "",
    };
  } catch {
    return { url: DEFAULT_SOCIAL_URL, enabled: true, accessKey: "" };
  }
}
function saveSocial(dir, c) {
  fs.writeFileSync(
    path.join(dir, "pali-social.json"),
    JSON.stringify({
      url: c.url,
      enabled: c.enabled,
      key:
        c.accessKey && safeStorage.isEncryptionAvailable()
          ? safeStorage.encryptString(c.accessKey).toString("base64")
          : null,
    }),
    { mode: 0o600 },
  );
}
module.exports = { loadSocial, saveSocial };
