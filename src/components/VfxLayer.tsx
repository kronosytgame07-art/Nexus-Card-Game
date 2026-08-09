import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Couche d'effets de combat en WebGL, posée au-dessus du plateau (DOM) mais
// sous les fenêtres modales. Deux systèmes dans un seul contexte GL :
//  - des particules point-sprite (invocation, évolution, impacts, pioche,
//    flash de fissure) simulées analytiquement dans le vertex shader à
//    partir de leur temps de départ — aucune boucle CPU par frame ;
//  - des éclats texturés (la carte qui se déchire à sa mort), un petit
//    groupe de quads par évènement, chacun animé de la même façon.

export type BurstPreset = 'summon' | 'evolution' | 'attack' | 'draw' | 'crack' | 'effect-ally' | 'effect-enemy';

export type DashTone = 'fire' | 'frost' | 'blood';

type VfxQuality = 'auto' | 'low' | 'balanced' | 'high' | 'ultra';

export type VfxHandle = {
  spawnBurst: (x: number, y: number, preset: BurstPreset) => void;
  spawnShatter: (x: number, y: number, width: number, height: number, imageUrl: string) => void;
  spawnDashTrail: (x1: number, y1: number, x2: number, y2: number, durationSec: number, tone: DashTone) => void;
};

const PARTICLE_VERT = `
attribute vec2 a_spawnPos;
attribute vec2 a_velocity;
attribute float a_gravity;
attribute float a_life;
attribute float a_startTime;
attribute float a_size;
attribute vec3 a_color;
attribute float a_seed;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_dpr;

varying vec3 v_color;
varying float v_alpha;

void main() {
  float t = u_time - a_startTime;
  float lifeT = clamp(t / a_life, 0.0, 1.0);
  float drag = exp(-1.6 * t);
  vec2 pos = a_spawnPos + a_velocity * t * drag + vec2(0.0, 0.5 * a_gravity * t * t);
  vec2 clip = vec2(pos.x / u_resolution.x * 2.0 - 1.0, 1.0 - pos.y / u_resolution.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  float visible = step(0.0, t) * step(t, a_life);
  float fade = (1.0 - lifeT) * smoothstep(0.0, 0.06, t) * visible;
  v_alpha = fade;
  v_color = a_color;
  float twinkle = 0.85 + 0.15 * sin(t * (18.0 + a_seed * 6.0));
  gl_PointSize = max(0.0, a_size * u_dpr * (1.0 - lifeT * 0.35) * twinkle);
}
`;

const PARTICLE_FRAG = `
precision mediump float;
varying vec3 v_color;
varying float v_alpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d) * v_alpha;
  gl_FragColor = vec4(v_color * a, a);
}
`;

const SHARD_VERT = `
attribute vec2 a_shardCenter;
attribute vec2 a_localPos;
attribute vec2 a_uv;
attribute float a_seed;

uniform float u_time;
uniform float u_startTime;
uniform float u_life;
uniform vec2 u_center;
uniform vec2 u_resolution;

varying vec2 v_uv;
varying float v_alpha;

void main() {
  float t = max(0.0, u_time - u_startTime);
  float lifeT = clamp(t / u_life, 0.0, 1.0);
  vec2 dir = normalize(a_shardCenter + vec2(0.0001, 0.0001));
  float speed = 70.0 + a_seed * 260.0;
  vec2 vel = dir * speed + vec2((a_seed - 0.5) * 90.0, -30.0 - a_seed * 70.0);
  vec2 explode = vel * t;
  explode.y += 0.5 * 480.0 * t * t;
  float ramp = smoothstep(0.0, 0.14, t);
  float ang = t * (2.2 + a_seed * 5.0) * (a_seed > 0.5 ? 1.0 : -1.0);
  float c = cos(ang), s = sin(ang);
  vec2 rotatedLocal = mat2(c, -s, s, c) * a_localPos;
  vec2 pos = u_center + a_shardCenter + explode * ramp + rotatedLocal;
  vec2 clip = vec2(pos.x / u_resolution.x * 2.0 - 1.0, 1.0 - pos.y / u_resolution.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
  v_alpha = (1.0 - smoothstep(0.5, 1.0, lifeT)) * step(t, u_life);
}
`;

const SHARD_FRAG = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
varying float v_alpha;
void main() {
  vec4 tex = texture2D(u_texture, v_uv);
  gl_FragColor = vec4(tex.rgb, tex.a * v_alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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

function linkProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

const MAX_PARTICLES = 2600;
const FLOATS_PER_PARTICLE = 12;
const STRIDE = FLOATS_PER_PARTICLE * 4;
const MAX_SHATTER_EVENTS = 6;
const SHATTER_GRID_X = 4;
const SHATTER_GRID_Y = 3;
const SHATTER_LIFE = 1.05;

const PRESETS: Record<BurstPreset, { count: number; speed: [number, number]; life: [number, number]; size: [number, number]; gravity: number; colors: [number, number, number][] }> = {
  summon: { count: 46, speed: [70, 240], life: [0.55, 0.95], size: [3, 9], gravity: 70, colors: [[0.95, 0.8, 0.4], [1, 0.65, 0.25], [0.55, 0.85, 1]] },
  evolution: { count: 100, speed: [130, 440], life: [0.75, 1.4], size: [4, 12], gravity: 20, colors: [[0.5, 0.95, 1], [1, 0.85, 0.4], [1, 1, 1]] },
  attack: { count: 24, speed: [140, 380], life: [0.22, 0.42], size: [2, 6], gravity: 260, colors: [[1, 0.9, 0.6], [1, 0.55, 0.2], [1, 1, 1]] },
  draw: { count: 18, speed: [25, 80], life: [0.6, 1.0], size: [2, 5], gravity: -40, colors: [[0.7, 0.85, 1], [1, 1, 1]] },
  crack: { count: 30, speed: [220, 540], life: [0.16, 0.3], size: [2, 5], gravity: 160, colors: [[1, 1, 1], [1, 0.9, 0.6]] },
  'effect-ally': { count: 64, speed: [80, 270], life: [0.45, 0.9], size: [3, 9], gravity: -20, colors: [[0.2, 1, 0.8], [0.45, 0.85, 1], [1, 0.9, 0.4]] },
  'effect-enemy': { count: 64, speed: [80, 270], life: [0.45, 0.9], size: [3, 9], gravity: -20, colors: [[1, 0.2, 0.4], [0.8, 0.25, 1], [1, 0.55, 0.25]] },
};

const DASH_COLORS: Record<DashTone, [number, number, number][]> = {
  fire: [[1, 0.55, 0.15], [1, 0.75, 0.3], [1, 0.35, 0.1]],
  frost: [[0.4, 0.75, 1], [0.7, 0.9, 1], [0.55, 0.85, 1]],
  blood: [[0.85, 0.1, 0.15], [0.6, 0.05, 0.1], [0.95, 0.35, 0.15]],
};
const TRAIL_PARTICLES = 26;

type ShatterEvent = {
  texture: WebGLTexture;
  buffer: WebGLBuffer;
  vertexCount: number;
  startTime: number;
  centerX: number;
  centerY: number;
};

const VfxLayer = forwardRef<VfxHandle, { active?: boolean; quality?: VfxQuality }>(function VfxLayer({ active = true, quality = 'auto' }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const qualityRef = useRef<VfxQuality>('auto');
  qualityRef.current = quality === 'auto' ? ((document.documentElement.dataset.quality as VfxQuality | undefined) ?? 'auto') : quality;
  const spawnQueue = useRef<Array<{ x: number; y: number; preset: BurstPreset }>>([]);
  const shatterQueue = useRef<Array<{ x: number; y: number; w: number; h: number; url: string }>>([]);
  const trailQueue = useRef<Array<{ x1: number; y1: number; x2: number; y2: number; duration: number; tone: DashTone }>>([]);

  useImperativeHandle(ref, () => ({
    spawnBurst: (x, y, preset) => { spawnQueue.current.push({ x, y, preset }); },
    spawnShatter: (x, y, w, h, url) => { shatterQueue.current.push({ x, y, w, h, url }); },
    spawnDashTrail: (x1, y1, x2, y2, durationSec, tone) => { trailQueue.current.push({ x1, y1, x2, y2, duration: durationSec, tone }); },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false })) as WebGLRenderingContext | null;
    if (!gl) return;

    const particleProgram = linkProgram(gl, PARTICLE_VERT, PARTICLE_FRAG);
    const shardProgram = linkProgram(gl, SHARD_VERT, SHARD_FRAG);
    if (!particleProgram || !shardProgram) return;

    const particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_PARTICLES * STRIDE, gl.DYNAMIC_DRAW);

    const pLoc = {
      spawnPos: gl.getAttribLocation(particleProgram, 'a_spawnPos'),
      velocity: gl.getAttribLocation(particleProgram, 'a_velocity'),
      gravity: gl.getAttribLocation(particleProgram, 'a_gravity'),
      life: gl.getAttribLocation(particleProgram, 'a_life'),
      startTime: gl.getAttribLocation(particleProgram, 'a_startTime'),
      size: gl.getAttribLocation(particleProgram, 'a_size'),
      color: gl.getAttribLocation(particleProgram, 'a_color'),
      seed: gl.getAttribLocation(particleProgram, 'a_seed'),
    };
    const pUniform = {
      time: gl.getUniformLocation(particleProgram, 'u_time'),
      resolution: gl.getUniformLocation(particleProgram, 'u_resolution'),
      dpr: gl.getUniformLocation(particleProgram, 'u_dpr'),
    };
    const sLoc = {
      shardCenter: gl.getAttribLocation(shardProgram, 'a_shardCenter'),
      localPos: gl.getAttribLocation(shardProgram, 'a_localPos'),
      uv: gl.getAttribLocation(shardProgram, 'a_uv'),
      seed: gl.getAttribLocation(shardProgram, 'a_seed'),
    };
    const sUniform = {
      time: gl.getUniformLocation(shardProgram, 'u_time'),
      startTime: gl.getUniformLocation(shardProgram, 'u_startTime'),
      life: gl.getUniformLocation(shardProgram, 'u_life'),
      center: gl.getUniformLocation(shardProgram, 'u_center'),
      resolution: gl.getUniformLocation(shardProgram, 'u_resolution'),
      texture: gl.getUniformLocation(shardProgram, 'u_texture'),
    };

    let writeCursor = 0;
    let totalSpawned = 0;
    const scratch = new Float32Array(400 * FLOATS_PER_PARTICLE);

    const uploadParticles = (view: Float32Array, n: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
      const spaceToEnd = MAX_PARTICLES - writeCursor;
      if (n <= spaceToEnd) {
        gl.bufferSubData(gl.ARRAY_BUFFER, writeCursor * STRIDE, view);
      } else {
        gl.bufferSubData(gl.ARRAY_BUFFER, writeCursor * STRIDE, view.subarray(0, spaceToEnd * FLOATS_PER_PARTICLE));
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view.subarray(spaceToEnd * FLOATS_PER_PARTICLE));
      }
      writeCursor = (writeCursor + n) % MAX_PARTICLES;
      totalSpawned += n;
    };

    const consumeSpawnQueue = (elapsed: number) => {
      const queue = spawnQueue.current;
      if (!queue.length) return;
      spawnQueue.current = [];
      for (const job of queue) {
        const preset = PRESETS[job.preset];
        const n = Math.min(preset.count, scratch.length / FLOATS_PER_PARTICLE);
        for (let i = 0; i < n; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = preset.speed[0] + Math.random() * (preset.speed[1] - preset.speed[0]);
          const life = preset.life[0] + Math.random() * (preset.life[1] - preset.life[0]);
          const size = preset.size[0] + Math.random() * (preset.size[1] - preset.size[0]);
          const color = preset.colors[Math.floor(Math.random() * preset.colors.length)];
          const off = i * FLOATS_PER_PARTICLE;
          scratch[off + 0] = job.x;
          scratch[off + 1] = job.y;
          scratch[off + 2] = Math.cos(angle) * speed;
          scratch[off + 3] = Math.sin(angle) * speed;
          scratch[off + 4] = preset.gravity;
          scratch[off + 5] = life;
          scratch[off + 6] = elapsed;
          scratch[off + 7] = size;
          scratch[off + 8] = color[0];
          scratch[off + 9] = color[1];
          scratch[off + 10] = color[2];
          scratch[off + 11] = Math.random();
        }
        uploadParticles(scratch.subarray(0, n * FLOATS_PER_PARTICLE), n);
      }
    };

    // Traînée d'attaque : au lieu d'une explosion isotrope, des étincelles
    // réparties le long du trajet attaquant → cible, chacune allumée à un
    // instant décalé proportionnel à sa position sur le chemin — elles
    // s'illuminent donc en séquence, comme une comète qui prend de la
    // vitesse, en phase avec la propre animation de saut de la carte.
    const trailScratch = new Float32Array(TRAIL_PARTICLES * FLOATS_PER_PARTICLE);
    const consumeTrailQueue = (elapsed: number) => {
      const queue = trailQueue.current;
      if (!queue.length) return;
      trailQueue.current = [];
      for (const job of queue) {
        const colors = DASH_COLORS[job.tone];
        const dx = job.x2 - job.x1;
        const dy = job.y2 - job.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        for (let i = 0; i < TRAIL_PARTICLES; i++) {
          const frac = i / (TRAIL_PARTICLES - 1);
          const jitter = (Math.random() - 0.5) * 12;
          const px = job.x1 + dx * frac + nx * jitter;
          const py = job.y1 + dy * frac + ny * jitter;
          const jitterAngle = Math.random() * Math.PI * 2;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const off = i * FLOATS_PER_PARTICLE;
          trailScratch[off + 0] = px;
          trailScratch[off + 1] = py;
          trailScratch[off + 2] = Math.cos(jitterAngle) * 22;
          trailScratch[off + 3] = Math.sin(jitterAngle) * 22;
          trailScratch[off + 4] = -30;
          trailScratch[off + 5] = 0.26 + Math.random() * 0.18;
          trailScratch[off + 6] = elapsed + frac * job.duration * 0.82;
          trailScratch[off + 7] = 4 + Math.random() * 5 * (1 - frac * 0.35);
          trailScratch[off + 8] = color[0];
          trailScratch[off + 9] = color[1];
          trailScratch[off + 10] = color[2];
          trailScratch[off + 11] = Math.random();
        }
        uploadParticles(trailScratch, TRAIL_PARTICLES);
      }
    };

    const textureCache = new Map<string, { texture: WebGLTexture; loaded: boolean }>();
    const getTexture = (url: string) => {
      let entry = textureCache.get(url);
      if (entry) return entry;
      const texture = gl.createTexture();
      if (!texture) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      entry = { texture, loaded: false };
      textureCache.set(url, entry);
      const image = new Image();
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (entry) entry.loaded = true;
      };
      image.src = url;
      return entry;
    };

    let shatterEvents: ShatterEvent[] = [];
    const consumeShatterQueue = (elapsed: number) => {
      const queue = shatterQueue.current;
      if (!queue.length) return;
      shatterQueue.current = [];
      for (const job of queue) {
        const entry = getTexture(job.url);
        if (!entry) continue;
        const cols = SHATTER_GRID_X;
        const rows = SHATTER_GRID_Y;
        const cellW = job.w / cols;
        const cellH = job.h / rows;
        const verts: number[] = [];
        for (let gy = 0; gy < rows; gy++) {
          for (let gx = 0; gx < cols; gx++) {
            const centerX = -job.w / 2 + cellW * (gx + 0.5);
            const centerY = -job.h / 2 + cellH * (gy + 0.5);
            const seed = Math.random();
            const hw = cellW / 2, hh = cellH / 2;
            const u0 = gx / cols, u1 = (gx + 1) / cols;
            const v0 = gy / rows, v1 = (gy + 1) / rows;
            const corners = [
              [-hw, -hh, u0, v0], [hw, -hh, u1, v0], [hw, hh, u1, v1],
              [-hw, -hh, u0, v0], [hw, hh, u1, v1], [-hw, hh, u0, v1],
            ];
            for (const [lx, ly, u, v] of corners) {
              verts.push(centerX, centerY, lx, ly, u, v, seed);
            }
          }
        }
        const buffer = gl.createBuffer();
        if (!buffer) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        if (shatterEvents.length >= MAX_SHATTER_EVENTS) {
          const stale = shatterEvents.shift();
          if (stale) gl.deleteBuffer(stale.buffer);
        }
        shatterEvents.push({
          texture: entry.texture,
          buffer,
          vertexCount: verts.length / 7,
          startTime: elapsed,
          centerX: job.x,
          centerY: job.y,
        });
      }
    };

    const renderDpr = () => {
      const deviceDpr = window.devicePixelRatio || 1;
      if (qualityRef.current === 'low') return Math.min(deviceDpr, 1);
      if (qualityRef.current === 'balanced') return Math.min(deviceDpr, 1.35);
      if (qualityRef.current === 'high') return Math.min(deviceDpr, 1.75);
      return Math.min(deviceDpr, 2);
    };
    const particleBudget = () => qualityRef.current === 'low' ? 700 : qualityRef.current === 'balanced' ? 1200 : qualityRef.current === 'high' ? 1900 : MAX_PARTICLES;
    const resize = () => {
      const dpr = renderDpr();
      const width = Math.round(window.innerWidth * dpr);
      const height = Math.round(window.innerHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const onContextLost = (event: Event) => event.preventDefault();
    canvas.addEventListener('webglcontextlost', onContextLost);

    gl.enable(gl.BLEND);

    let rafId = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      if (!activeRef.current) { spawnQueue.current = []; shatterQueue.current = []; return; }
      elapsed += dt;

      consumeSpawnQueue(elapsed);
      consumeTrailQueue(elapsed);
      consumeShatterQueue(elapsed);
      shatterEvents = shatterEvents.filter((event) => {
        if (elapsed - event.startTime > SHATTER_LIFE) {
          gl.deleteBuffer(event.buffer);
          return false;
        }
        return true;
      });

      gl.clear(gl.COLOR_BUFFER_BIT);
      const dpr = renderDpr();

      if (shatterEvents.length) {
        gl.useProgram(shardProgram);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(sUniform.time, elapsed);
        gl.uniform2f(sUniform.resolution, canvas.clientWidth, canvas.clientHeight);
        gl.uniform1f(sUniform.life, SHATTER_LIFE);
        for (const event of shatterEvents) {
          gl.bindBuffer(gl.ARRAY_BUFFER, event.buffer);
          const stride = 7 * 4;
          gl.enableVertexAttribArray(sLoc.shardCenter); gl.vertexAttribPointer(sLoc.shardCenter, 2, gl.FLOAT, false, stride, 0);
          gl.enableVertexAttribArray(sLoc.localPos); gl.vertexAttribPointer(sLoc.localPos, 2, gl.FLOAT, false, stride, 8);
          gl.enableVertexAttribArray(sLoc.uv); gl.vertexAttribPointer(sLoc.uv, 2, gl.FLOAT, false, stride, 16);
          gl.enableVertexAttribArray(sLoc.seed); gl.vertexAttribPointer(sLoc.seed, 1, gl.FLOAT, false, stride, 24);
          gl.uniform1f(sUniform.startTime, event.startTime);
          gl.uniform2f(sUniform.center, event.centerX, event.centerY);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, event.texture);
          gl.uniform1i(sUniform.texture, 0);
          gl.drawArrays(gl.TRIANGLES, 0, event.vertexCount);
        }
      }

      if (totalSpawned > 0) {
        gl.useProgram(particleProgram);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.enableVertexAttribArray(pLoc.spawnPos); gl.vertexAttribPointer(pLoc.spawnPos, 2, gl.FLOAT, false, STRIDE, 0);
        gl.enableVertexAttribArray(pLoc.velocity); gl.vertexAttribPointer(pLoc.velocity, 2, gl.FLOAT, false, STRIDE, 8);
        gl.enableVertexAttribArray(pLoc.gravity); gl.vertexAttribPointer(pLoc.gravity, 1, gl.FLOAT, false, STRIDE, 16);
        gl.enableVertexAttribArray(pLoc.life); gl.vertexAttribPointer(pLoc.life, 1, gl.FLOAT, false, STRIDE, 20);
        gl.enableVertexAttribArray(pLoc.startTime); gl.vertexAttribPointer(pLoc.startTime, 1, gl.FLOAT, false, STRIDE, 24);
        gl.enableVertexAttribArray(pLoc.size); gl.vertexAttribPointer(pLoc.size, 1, gl.FLOAT, false, STRIDE, 28);
        gl.enableVertexAttribArray(pLoc.color); gl.vertexAttribPointer(pLoc.color, 3, gl.FLOAT, false, STRIDE, 32);
        gl.enableVertexAttribArray(pLoc.seed); gl.vertexAttribPointer(pLoc.seed, 1, gl.FLOAT, false, STRIDE, 44);
        gl.uniform1f(pUniform.time, elapsed);
        gl.uniform2f(pUniform.resolution, canvas.clientWidth, canvas.clientHeight);
        gl.uniform1f(pUniform.dpr, dpr);
        const drawCount = Math.min(totalSpawned, MAX_PARTICLES, particleBudget());
        gl.drawArrays(gl.POINTS, 0, drawCount);
      }
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      for (const event of shatterEvents) gl.deleteBuffer(event.buffer);
      for (const entry of textureCache.values()) gl.deleteTexture(entry.texture);
      gl.deleteBuffer(particleBuffer);
      gl.deleteProgram(particleProgram);
      gl.deleteProgram(shardProgram);
    };
  }, []);

  return <canvas ref={canvasRef} className="vfx-layer" aria-hidden="true" />;
});

export default VfxLayer;
