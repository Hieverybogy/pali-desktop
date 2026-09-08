const fs = require("node:fs");
const path = require("node:path");
const { migrateSize, MOODS } = require("./companion.cjs");
const pets = require("../../shared/pets.json");
const isCharacter = (value) =>
  typeof value === "string" && pets.some((p) => p.id === value);
const defaults = {
  character: "penguin",
  size: 160,
  mood: "平靜",
  reminders: true,
  roaming: true,
  sleeping: false,
  x: null,
  y: null,
};
function loadSettings(userData) {
  const settings = { ...defaults };
  try {
    const value = JSON.parse(
      fs.readFileSync(path.join(userData, "pali-settings.json"), "utf8"),
    );
    if (isCharacter(value.character)) settings.character = value.character;
    settings.size = migrateSize(value.size);
    if (MOODS.includes(value.mood)) settings.mood = value.mood;
    for (const key of ["reminders", "roaming", "sleeping"])
      if (typeof value[key] === "boolean") settings[key] = value[key];
    if (Number.isFinite(value.x) && Number.isFinite(value.y)) {
      settings.x = value.x;
      settings.y = value.y;
    }
  } catch (error) {
    if (error.code !== "ENOENT")
      console.warn("Unable to read settings:", error.message);
  }
  return settings;
}
function saveSettings(userData, settings, position) {
  try {
    const [x, y] = position;
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(
      path.join(userData, "pali-settings.json"),
      JSON.stringify({ ...settings, x, y }),
    );
  } catch (error) {
    console.error("Unable to save settings:", error.message);
  }
}
module.exports = { defaults, isCharacter, loadSettings, saveSettings };
