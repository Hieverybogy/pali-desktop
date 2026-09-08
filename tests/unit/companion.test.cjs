const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  Activity,
  dialogue,
  migrateSize,
} = require("../../src/main/services/companion.cjs");
test("legacy sizes migrate to smaller sizes", () => {
  assert.deepEqual(
    [220, 280, 340, 120, undefined].map(migrateSize),
    [120, 160, 200, 120, 160],
  );
});
test("dialogue cycles without adjacent repeats and contains current facts", () => {
  const c = {
    name: "小派",
    mood: "開心",
    activity: {
      workSeconds: 600,
      totalSeconds: 900,
      idleSeconds: 0,
      lastBreakSeconds: 0,
    },
    now: new Date(2026, 8, 7, 14, 23),
  };
  const lines = Array.from({ length: 12 }, (_, i) => dialogue(i, c));
  assert.equal(new Set(lines).size, 12);
  assert.equal(dialogue(12, c), lines[0]);
  assert.match(lines[1], /14:23/);
  assert.match(lines[2], /開心/);
  assert.match(lines[3], /10 分鐘/);
});
test("idle reminders are throttled and return retains previous break", () => {
  const a = new Activity(0);
  let notes = [];
  for (let s = 1; s <= 601; s++) {
    const n = a.sample(s * 1000, s);
    if (n) notes.push(n);
  }
  assert.equal(notes.length, 2);
  assert.equal(a.snapshot(601000).idleSeconds, 601);
  a.sample(602000, 0);
  assert.equal(a.snapshot(602000).lastBreakSeconds, 601);
  assert.equal(a.snapshot(602000).idleSeconds, 0);
});
test("work reminds at 30 min, suspension does not count as work or idle", () => {
  const a = new Activity(0);
  let count = 0;
  for (let s = 1; s <= 1801; s++) if (a.sample(s * 1000, 0)) count++;
  assert.equal(count, 1);
  const total = a.total;
  a.pause(1802000);
  a.sample(9000000, 8000);
  assert.equal(a.total, total);
  assert.equal(a.idle, 0);
  a.resume(10000000);
  a.sample(10001000, 0);
  assert.equal(a.total, total + 1);
  assert.equal(a.work, 1);
});
