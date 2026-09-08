const test = require("node:test");
const assert = require("node:assert/strict");
const { Shake } = require("../../src/main/services/shake.cjs");
test("fast deliberate horizontal reversals trigger at all pet sizes", () => {
  for (const size of [120, 160, 200]) {
    const s = new Shake();
    s.start(0, 0, size);
    let triggered = false;
    for (let i = 1; i <= 6; i++)
      triggered ||= s.sample(i % 2 ? 80 : 0, i * 100);
    assert.equal(triggered, true);
  }
});
test("one-way dragging, jitter and slow dragging do not trigger", () => {
  for (const positions of [
    Array.from({ length: 30 }, (_, i) => i * 40),
    Array.from({ length: 30 }, (_, i) => (i % 2 ? 4 : 0)),
  ]) {
    const s = new Shake();
    s.start(0, 0, 160);
    positions.forEach((x, i) => assert.equal(s.sample(x, (i + 1) * 33), false));
  }
  const slow = new Shake();
  slow.start(0, 0, 160);
  for (let i = 1; i < 20; i++)
    assert.equal(slow.sample(i % 2 ? 70 : 0, i * 400), false);
});
test("pause and new drag reset accumulated shaking", () => {
  const s = new Shake();
  s.start(0, 0, 160);
  s.sample(80, 100);
  s.sample(0, 200);
  assert.equal(s.shaking(200), true);
  s.sample(0, 800);
  assert.equal(s.shaking(800), false);
  s.start(0, 900, 160);
  assert.equal(s.sample(80, 1000), false);
});
