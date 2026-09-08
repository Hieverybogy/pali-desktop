const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clampPosition,
  hitPet,
} = require("../../src/main/services/geometry.cjs");
test("negative-origin display keeps pet visible", () =>
  assert.deepEqual(
    clampPosition(
      { x: -2000, y: 1000 },
      { x: -1440, y: 0, width: 1440, height: 900 },
      280,
    ),
    { x: -1440, y: 620 },
  ));
test("display smaller than pet anchors at origin", () =>
  assert.deepEqual(
    clampPosition(
      { x: 300, y: 300 },
      { x: 10, y: 20, width: 200, height: 180 },
      280,
    ),
    { x: 10, y: 20 },
  ));
test("transparent corners pass through, body remains interactive at all sizes", () => {
  for (const size of [220, 280, 340]) {
    assert.equal(hitPet(0, 0, size), false);
    assert.equal(hitPet(size * 0.5, size * 0.55, size), true);
    assert.equal(hitPet(size, size, size), false);
  }
});

test("all character interaction regions scale with the window", () => {
  const pets = require("../../src/shared/pets.json");
  for (const pet of pets)
    for (const size of [220, 280, 340]) {
      for (const [x, y] of pet.hitRegions)
        assert.equal(
          hitPet((x / 280) * size, (y / 280) * size, size, pet.id),
          true,
          pet.id,
        );
      assert.equal(hitPet(0, 0, size, pet.id), false, pet.id);
    }
});
test("rabbit ears and fox tail are interactive without enlarging penguin hit area", () => {
  assert.equal(hitPet(101, 30, 280, "rabbit"), true);
  assert.equal(hitPet(101, 30, 280, "penguin"), false);
  assert.equal(hitPet(235, 204, 280, "fox"), true);
  assert.equal(hitPet(235, 204, 280, "penguin"), false);
});
