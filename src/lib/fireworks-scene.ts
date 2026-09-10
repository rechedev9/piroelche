import {
  FIREWORKS,
  INITIAL_TIME,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  advanceSpring,
  emberPosition,
  fireworkAge,
  flightDuration,
  launchPosition,
  project,
  smoothstep,
  type Ember,
  type Firework,
} from "@/lib/fireworks-motion";

export type FireworksAssets = {
  sky: HTMLImageElement;
  atlas: HTMLImageElement;
};

function random(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Prepare an emissive texture once; black contributes no light or opacity. */
function lightTexture(atlas: HTMLImageElement, sprite: number) {
  const texture = document.createElement("canvas");
  const cell = atlas.naturalWidth / 2;
  texture.width = cell;
  texture.height = cell;
  const context = texture.getContext("2d", { willReadFrequently: true });
  if (!context) return texture;
  context.drawImage(
    atlas,
    (sprite % 2) * cell,
    Math.floor(sprite / 2) * cell,
    cell,
    cell,
    0,
    0,
    cell,
    cell,
  );
  const image = context.getImageData(0, 0, cell, cell);
  for (let pixel = 0; pixel < image.data.length; pixel += 4) {
    const alpha = Math.max(
      image.data[pixel],
      image.data[pixel + 1],
      image.data[pixel + 2],
    );
    image.data[pixel + 3] = alpha > 5 ? alpha : 0;
    if (alpha <= 5) continue;
    for (let channel = 0; channel < 3; channel++)
      image.data[pixel + channel] = (image.data[pixel + channel] * 255) / alpha;
  }
  context.putImageData(image, 0, 0);
  return texture;
}

/** Sample the generated artwork into luminous points, preserving its palette and shape. */
function sampleEmbers(atlas: HTMLImageElement, firework: Firework): Ember[] {
  const sample = document.createElement("canvas");
  sample.width = 256;
  sample.height = 256;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  const cell = atlas.naturalWidth / 2;
  context.drawImage(
    atlas,
    (firework.sprite % 2) * cell,
    Math.floor(firework.sprite / 2) * cell,
    cell,
    cell,
    0,
    0,
    256,
    256,
  );
  const pixels = context.getImageData(0, 0, 256, 256).data;
  const originY = [0.4, 0.5, 0.43, 0.5][firework.sprite];
  const candidates: { ember: Ember; rank: number }[] = [];

  for (let y = 4; y < 252; y += 6) {
    for (let x = 4; x < 252; x += 6) {
      let brightest = 0;
      let index = 0;
      let pointX = x;
      let pointY = y;
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          const pixel = ((y + dy) * 256 + x + dx) * 4;
          const brightness = Math.max(
            pixels[pixel],
            pixels[pixel + 1],
            pixels[pixel + 2],
          );
          if (brightness > brightest) {
            brightest = brightness;
            index = pixel;
            pointX = x + dx;
            pointY = y + dy;
          }
        }
      }
      const nx = (pointX / 256 - 0.51) / 0.45;
      const ny = (pointY / 256 - originY) / 0.45;
      if (brightest < 105 || Math.hypot(nx, ny) < 0.13) continue;
      const seed = y * 256 + x + firework.sprite * 10000;
      const gold = firework.sprite === 0 || firework.sprite === 2;
      const color = [pixels[index], pixels[index + 1], pixels[index + 2]]
        .map((channel) => Math.round((channel / brightest) * 255))
        .join(",");
      candidates.push({
        rank: brightest * (0.35 + random(seed)),
        ember: {
          vx: nx * 310 * firework.spread,
          vy: ny * 310 * firework.spread,
          vz: (random(seed + 1) - 0.5) * 140 * firework.spread,
          life: (gold ? 4.2 : 3.2) + random(seed + 2) * 1.25,
          size: 1.3 + random(seed + 3) * 1.3,
          color: `rgb(${color})`,
        },
      });
    }
  }
  return candidates
    .toSorted((a, b) => b.rank - a.rank)
    .slice(0, 260)
    .map(({ ember }) => ember);
}

function backdrop(image: HTMLImageElement, foreground: boolean) {
  const layer = document.createElement("canvas");
  layer.width = SCENE_WIDTH;
  layer.height = Math.ceil(SCENE_HEIGHT);
  const context = layer.getContext("2d");
  if (!context) return layer;
  const scale = Math.max(
    layer.width / image.naturalWidth,
    layer.height / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    (layer.width - width) / 2,
    (layer.height - height) / 2,
    width,
    height,
  );
  context.globalCompositeOperation = "destination-in";
  const mask = context.createLinearGradient(0, 0, 0, layer.height);
  mask.addColorStop(
    foreground ? 0.72 : 0.62,
    foreground ? "transparent" : "black",
  );
  mask.addColorStop(
    foreground ? 0.84 : 0.85,
    foreground ? "black" : "transparent",
  );
  context.fillStyle = mask;
  context.fillRect(0, 0, layer.width, layer.height);
  return layer;
}

export function createFireworksScene(
  canvas: HTMLCanvasElement,
  assets: FireworksAssets,
) {
  const context = canvas.getContext("2d");
  const surface = canvas.closest("figure");
  if (!context || !surface) return null;

  const sky = backdrop(assets.sky, false);
  const palms = backdrop(assets.sky, true);
  const canopies = [0, 1, 2, 3].map((sprite) =>
    lightTexture(assets.atlas, sprite),
  );
  const shots = FIREWORKS.map((firework) => ({
    firework,
    embers: sampleEmbers(assets.atlas, firework),
  }));
  if (shots.some(({ embers }) => embers.length === 0)) return null;

  let time = INITIAL_TIME;
  let frame = 0;
  let previousTime: number | null = null;
  let playing = false;
  let cameraX = { position: 0, velocity: 0 };
  let cameraY = { position: 0, velocity: 0 };
  let target = { x: 0, y: 0 };
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const draw = () => {
    const camera = { x: cameraX.position, y: cameraY.position };
    context.setTransform(
      canvas.width / SCENE_WIDTH,
      0,
      0,
      canvas.height / SCENE_HEIGHT,
      0,
      0,
    );
    context.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    const drawLayer = (
      layer: HTMLCanvasElement,
      depth: number,
      padding: number,
    ) => {
      const center = project(
        { x: SCENE_WIDTH / 2, y: SCENE_HEIGHT / 2, z: depth },
        camera,
      );
      const width = SCENE_WIDTH * center.scale * padding;
      const height = SCENE_HEIGHT * center.scale * padding;
      context.drawImage(
        layer,
        center.x - width / 2,
        center.y - height / 2,
        width,
        height,
      );
    };
    drawLayer(sky, -150, 1.18);
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    for (const { firework, embers } of shots) {
      const age = fireworkAge(firework, time);
      const flight = flightDuration(firework);
      if (age < flight) {
        const head = project(launchPosition(firework, age), camera);
        const tail = project(
          launchPosition(firework, Math.max(0, age - 0.13)),
          camera,
        );
        context.globalAlpha =
          smoothstep(0, 0.12, age) *
          (1 - smoothstep(flight - 0.1, flight, age));
        context.strokeStyle = `rgb(${firework.color})`;
        context.lineWidth = 1.8 * head.scale;
        context.beginPath();
        context.moveTo(tail.x, tail.y);
        context.lineTo(head.x, head.y);
        context.stroke();
        context.fillStyle = "#fff3d9";
        context.fillRect(head.x - 1.2, head.y - 1.2, 2.4, 2.4);
        continue;
      }

      const burstAge = age - flight;
      if (burstAge > 5.5) continue;
      // The generated canopy shares the particles' drag and gravity, then
      // its afterglow fades into the independently travelling embers.
      const center = project(
        emberPosition(firework, { vx: 0, vy: 0, vz: 0 }, burstAge),
        camera,
      );
      const edge = project(
        emberPosition(
          firework,
          { vx: 310 * firework.spread, vy: 0, vz: 0 },
          burstAge,
        ),
        camera,
      );
      const canopyWidth = (edge.x - center.x) / 0.45;
      const ignitionY = [0.4, 0.5, 0.43, 0.5][firework.sprite];
      context.globalAlpha =
        0.5 *
        smoothstep(0, 0.25, burstAge) *
        (1 - smoothstep(1.6, 3.8, burstAge));
      context.drawImage(
        canopies[firework.sprite],
        center.x - canopyWidth * 0.51,
        center.y - canopyWidth * ignitionY,
        canopyWidth,
        canopyWidth,
      );
      const origin = project(
        {
          x: firework.x * SCENE_WIDTH,
          y: firework.y * SCENE_HEIGHT,
          z: firework.z,
        },
        camera,
      );
      const glow =
        (1 - smoothstep(0.1, 0.85, burstAge)) * smoothstep(0, 0.06, burstAge);
      if (glow > 0) {
        const radius = (10 + burstAge * 28) * origin.scale;
        const light = context.createRadialGradient(
          origin.x,
          origin.y,
          0,
          origin.x,
          origin.y,
          radius,
        );
        light.addColorStop(0, `rgba(${firework.color}, 0.7)`);
        light.addColorStop(1, `rgba(${firework.color}, 0)`);
        context.fillStyle = light;
        context.globalAlpha = glow;
        context.fillRect(
          origin.x - radius,
          origin.y - radius,
          radius * 2,
          radius * 2,
        );
      }

      for (const ember of embers) {
        if (burstAge >= ember.life) continue;
        const alpha =
          smoothstep(0, 0.09, burstAge) *
          (1 - smoothstep(ember.life * 0.3, ember.life, burstAge));
        const point = project(emberPosition(firework, ember, burstAge), camera);
        const trailDuration = Math.min(
          burstAge,
          firework.sprite === 0 || firework.sprite === 2 ? 1.35 : 0.65,
        );
        context.strokeStyle = ember.color;
        context.lineWidth = ember.size * point.scale * 0.7;
        for (let segment = 0; segment < 3; segment++) {
          const startAge = burstAge - trailDuration * (1 - segment / 3);
          const endAge = burstAge - trailDuration * (1 - (segment + 1) / 3);
          const tail = project(
            emberPosition(firework, ember, startAge),
            camera,
          );
          const middle = project(
            emberPosition(firework, ember, (startAge + endAge) / 2),
            camera,
          );
          const end = project(emberPosition(firework, ember, endAge), camera);
          context.globalAlpha = alpha * ((segment + 1) / 3) ** 1.5 * 0.65;
          context.beginPath();
          context.moveTo(tail.x, tail.y);
          context.quadraticCurveTo(middle.x, middle.y, end.x, end.y);
          context.stroke();
        }
        context.globalAlpha = alpha;
        context.fillStyle = ember.color;
        const size = ember.size * point.scale;
        context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      }
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    drawLayer(palms, 125, 1);
  };

  const tick = (timestamp: number) => {
    const seconds =
      previousTime === null
        ? 0
        : Math.min((timestamp - previousTime) / 1000, 0.1);
    previousTime = timestamp;
    time += seconds;
    cameraX = advanceSpring(cameraX, target.x, seconds);
    cameraY = advanceSpring(cameraY, target.y, seconds);
    draw();
    frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    draw();
  };
  const move = (event: PointerEvent) => {
    if (!pointer.matches || event.pointerType !== "mouse") return;
    const bounds = surface.getBoundingClientRect();
    target = {
      x:
        Math.max(
          -1,
          Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
        ) * 75,
      y:
        Math.max(
          -1,
          Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
        ) * 45,
    };
  };
  const reset = () => {
    target = { x: 0, y: 0 };
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  surface.addEventListener("pointermove", move, { passive: true });
  surface.addEventListener("pointerleave", reset);
  pointer.addEventListener("change", reset);
  resize();

  return {
    setPlaying(value: boolean) {
      if (playing === value) return;
      playing = value;
      previousTime = null;
      if (playing) frame = requestAnimationFrame(tick);
      else cancelAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", reset);
      pointer.removeEventListener("change", reset);
    },
  };
}
