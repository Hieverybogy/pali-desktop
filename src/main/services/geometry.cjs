const pets = require("../../shared/pets.json");
function clampPosition(point, area, size) {
  return {
    x: Math.round(
      Math.max(
        area.x,
        Math.min(point.x, area.x + Math.max(0, area.width - size)),
      ),
    ),
    y: Math.round(
      Math.max(
        area.y,
        Math.min(point.y, area.y + Math.max(0, area.height - size)),
      ),
    ),
  };
}
function hitPet(x, y, size, character = "penguin") {
  const px = (x / size) * 280,
    py = (y / size) * 280;
  const regions = pets.find((p) => p.id === character)?.hitRegions ?? [];
  return [[140, 157, 85, 101], ...regions].some(
    ([cx, cy, rx, ry]) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1,
  );
}
module.exports = { clampPosition, hitPet };
