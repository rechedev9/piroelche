import assert from "node:assert/strict";
import test from "node:test";
import {
  FIREWORKS,
  FIREWORKS_CYCLE,
  advanceSpring,
  emberPosition,
  fireworkAge,
  flightDuration,
  launchPosition,
  project,
} from "../src/lib/fireworks-motion";

void test("every explosion starts at the rocket endpoint at every camera depth", () => {
  for (const firework of FIREWORKS) {
    const launch = launchPosition(firework, flightDuration(firework));
    const explosion = emberPosition(firework, { vx: 280, vy: -180, vz: 60 }, 0);
    for (const camera of [
      { x: 0, y: 0 },
      { x: -75, y: 45 },
      { x: 75, y: -45 },
    ]) {
      const a = project(launch, camera);
      const b = project(explosion, camera);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8);
    }
  }
});

void test("camera response is equivalent at 30, 60 and 144 Hz, including a reversal", () => {
  const results = [30, 60, 144].map((fps) => {
    let axis = { position: 0, velocity: 0 };
    for (const target of [75, -60, 0]) {
      for (let frame = 0; frame < fps; frame++)
        axis = advanceSpring(axis, target, 1 / fps);
    }
    return axis;
  });
  for (const result of results) {
    assert.ok(Math.abs(result.position - results[0].position) < 1e-9);
    assert.ok(Math.abs(result.velocity - results[0].velocity) < 1e-9);
  }
});

void test("a change of pointer direction preserves instantaneous position and velocity", () => {
  const moving = advanceSpring({ position: 0, velocity: 0 }, 75, 0.1);
  assert.deepEqual(advanceSpring(moving, -75, 0), moving);
  const after = advanceSpring(moving, -75, 1 / 144);
  assert.ok(Math.abs(after.position - moving.position) < 2);
});

void test("the sequence repeats deterministically and resets only after all embers expire", () => {
  for (const firework of FIREWORKS) {
    assert.ok(flightDuration(firework) + 5.5 < FIREWORKS_CYCLE);
    for (const time of [0, 2.5, 8, 13.9, 120]) {
      assert.ok(
        Math.abs(
          fireworkAge(firework, time) -
            fireworkAge(firework, time + FIREWORKS_CYCLE),
        ) < 1e-8,
      );
    }
  }
});
