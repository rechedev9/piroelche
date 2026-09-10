export const SCENE_WIDTH = 1000;
export const SCENE_HEIGHT = (SCENE_WIDTH * 7) / 6;
export const FIREWORKS_CYCLE = 14;
export const INITIAL_TIME = 4.2;

const LAUNCH_Y = SCENE_HEIGHT * 0.87;
const LAUNCH_GRAVITY = 230;
const DRAG = 0.85;
const GRAVITY = 42;

export type Point3 = { x: number; y: number; z: number };
export type SpringAxis = { position: number; velocity: number };
export type Firework = {
  x: number;
  y: number;
  z: number;
  originX: number;
  offset: number;
  sprite: number;
  spread: number;
  color: string;
};
export type Ember = {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  color: string;
};

export const FIREWORKS: readonly Firework[] = [
  {
    x: 0.54,
    y: 0.35,
    z: 55,
    originX: 0.48,
    offset: 0,
    sprite: 0,
    spread: 1,
    color: "255, 193, 116",
  },
  {
    x: 0.27,
    y: 0.47,
    z: -80,
    originX: 0.38,
    offset: 2.33,
    sprite: 1,
    spread: 0.54,
    color: "255, 83, 164",
  },
  {
    x: 0.73,
    y: 0.51,
    z: 85,
    originX: 0.59,
    offset: 4.67,
    sprite: 3,
    spread: 0.48,
    color: "255, 138, 169",
  },
  {
    x: 0.43,
    y: 0.31,
    z: -25,
    originX: 0.51,
    offset: 7,
    sprite: 2,
    spread: 0.95,
    color: "255, 193, 116",
  },
  {
    x: 0.71,
    y: 0.3,
    z: -120,
    originX: 0.58,
    offset: 9.33,
    sprite: 1,
    spread: 0.55,
    color: "255, 83, 164",
  },
  {
    x: 0.32,
    y: 0.5,
    z: 35,
    originX: 0.43,
    offset: 11.67,
    sprite: 3,
    spread: 0.6,
    color: "255, 138, 169",
  },
];

export function flightDuration(firework: Firework) {
  return Math.sqrt(
    (2 * (LAUNCH_Y - firework.y * SCENE_HEIGHT)) / LAUNCH_GRAVITY,
  );
}

export function fireworkAge(firework: Firework, time: number) {
  return (
    (((time - firework.offset) % FIREWORKS_CYCLE) + FIREWORKS_CYCLE) %
    FIREWORKS_CYCLE
  );
}

export function launchPosition(firework: Firework, age: number): Point3 {
  const progress = Math.max(0, Math.min(1, age / flightDuration(firework)));
  return {
    x:
      (firework.originX + (firework.x - firework.originX) * progress) *
      SCENE_WIDTH,
    y:
      LAUNCH_Y -
      (LAUNCH_Y - firework.y * SCENE_HEIGHT) *
        (2 * progress - progress * progress),
    z: 100 + (firework.z - 100) * progress,
  };
}

/** Analytical drag + gravity: positions depend on time, never on frame count. */
export function emberPosition(
  firework: Firework,
  ember: Pick<Ember, "vx" | "vy" | "vz">,
  age: number,
): Point3 {
  const travel = -Math.expm1(-DRAG * age) / DRAG;
  return {
    x: firework.x * SCENE_WIDTH + ember.vx * travel + 5 * age,
    y:
      firework.y * SCENE_HEIGHT +
      ember.vy * travel +
      (GRAVITY / DRAG) * (age - travel),
    z: firework.z + ember.vz * travel,
  };
}

export function project(point: Point3, camera: { x: number; y: number }) {
  const scale = 900 / (900 - point.z);
  return {
    x:
      SCENE_WIDTH / 2 +
      (point.x - SCENE_WIDTH / 2 - camera.x) * scale +
      camera.x,
    y:
      SCENE_HEIGHT * 0.45 +
      (point.y - SCENE_HEIGHT * 0.45 - camera.y) * scale +
      camera.y,
    scale,
  };
}

/** Exact critically damped spring, including velocity through direction changes. */
export function advanceSpring(
  axis: SpringAxis,
  target: number,
  seconds: number,
): SpringAxis {
  const frequency = 7;
  const displacement = axis.position - target;
  const impulse = axis.velocity + frequency * displacement;
  const decay = Math.exp(-frequency * seconds);
  return {
    position: target + (displacement + impulse * seconds) * decay,
    velocity: (axis.velocity - frequency * impulse * seconds) * decay,
  };
}

export function smoothstep(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
