// Detect deliberate horizontal reversals, not one-way movement or cursor jitter.
class Shake {
  start(x, now, size) {
    this.x = x;
    this.time = now;
    this.direction = 0;
    this.distance = 0;
    this.turns = [];
    this.threshold = Math.max(28, size * 0.24);
    this.lastMotion = now;
  }
  sample(x, now) {
    const dx = x - this.x;
    const dt = Math.max(1, now - this.time);
    this.x = x;
    this.time = now;
    if (dt > 180 || Math.abs(dx) / dt < 0.28) {
      if (now - this.lastMotion > 220) {
        this.direction = 0;
        this.distance = 0;
        this.turns = [];
      }
      return false;
    }
    this.lastMotion = now;
    const direction = Math.sign(dx);
    if (direction !== this.direction) {
      if (this.direction && this.distance >= this.threshold)
        this.turns.push(now);
      this.direction = direction;
      this.distance = Math.abs(dx);
    } else this.distance += Math.abs(dx);
    this.turns = this.turns.filter((t) => now - t < 1400);
    return this.turns.length >= 4;
  }
  shaking(now) {
    return this.turns.length >= 1 && now - this.lastMotion < 180;
  }
}
module.exports = { Shake };
