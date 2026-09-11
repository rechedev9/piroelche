/* Fluid orb shader adapted from rare-ui (swamimalode07/rare-ui, MIT).
   The WebGL setup lives outside React so the component stays a thin leaf. */

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.22;

  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.7 + 1.3),
    cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1)
  );

  vec2 p = vec2(uv.x * 1.8, uv.y * 1.0) + drift * 0.7;

  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  float f = fbm(p + 1.2 * q);

  float g = clamp(1.0 - uv.y, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, uv.y);
  float shade = clamp(g + (f - 0.5) * 0.8 * anchor, 0.0, 1.0);

  vec3 white = vec3(0.99, 1.0, 1.0);
  vec3 light = mix(white, u_color, 0.5);
  vec3 dark = u_color;

  vec3 col = white;
  col = mix(col, light, smoothstep(0.28, 0.52, shade));
  col = mix(col, dark, smoothstep(0.58, 0.88, shade));

  float edge = smoothstep(0.5, 0.49, distance(uv, vec2(0.5)));

  gl_FragColor = vec4(col * edge, edge);
}
`;

const FALLBACK_RGB: [number, number, number] = [0.77, 0.06, 0.44];

export type FluidOrbOptions = {
  /** Rendered size in CSS pixels; the canvas is square. */
  size: number;
  /** Dark side of the orb: `#rgb`, `#rrggbb` or a `--token` from globals.css. */
  color: string;
  /** Seconds offset so several orbs do not drift in lockstep. */
  phase?: number;
};

export type FluidOrbController = {
  setPlaying(value: boolean): void;
  dispose(): void;
};

/** Accepts `#rgb`, `#rrggbb` or a `--token` defined on `:root` in globals.css. */
function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.startsWith("--")
    ? getComputedStyle(document.documentElement).getPropertyValue(hex)
    : hex;
  let value = raw.replace("#", "").trim();
  if (value.length === 3)
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  const number = parseInt(value, 16);
  if (value.length !== 6 || Number.isNaN(number)) return FALLBACK_RGB;
  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ];
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Draw a slowly drifting colour orb on `canvas`.
 * Returns `null` when WebGL is unavailable so callers can keep a static fallback.
 * The first frame is drawn immediately; call `setPlaying(true)` to animate.
 */
export function createFluidOrbScene(
  canvas: HTMLCanvasElement,
  { size, color, phase = 0 }: FluidOrbOptions,
): FluidOrbController | null {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
  if (!gl) return null;

  const program = gl.createProgram();
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!program || !vertex || !fragment) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");
  gl.uniform3f(gl.getUniformLocation(program, "u_color"), ...hexToRgb(color));

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(size * dpr);
  canvas.width = pixels;
  canvas.height = pixels;
  gl.viewport(0, 0, pixels, pixels);
  gl.uniform2f(resolution, pixels, pixels);

  const start = performance.now();
  let frame = 0;
  let playing = false;

  const draw = (now: number) => {
    gl.uniform1f(time, phase + (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  const loop = (now: number) => {
    draw(now);
    frame = playing ? requestAnimationFrame(loop) : 0;
  };
  draw(start);

  return {
    setPlaying(value) {
      if (playing === value) return;
      playing = value;
      if (playing) frame = requestAnimationFrame(loop);
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    dispose() {
      playing = false;
      cancelAnimationFrame(frame);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
    },
  };
}
