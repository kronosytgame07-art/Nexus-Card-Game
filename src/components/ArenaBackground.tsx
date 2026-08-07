import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type ArenaBackgroundHandle = { triggerCrack: (clientX: number, clientY: number) => void };

// Fond d'arène 100% procédural en WebGL — plus aucune image source. Tout
// (ciel, crêtes de glace/lave, cercle runique, cristal central, piliers,
// particules) est dessiné par le shader à partir de fonctions de bruit et
// de distance. Rien n'est figé : chaque trait est recalculé image par
// image, donc net à n'importe quelle résolution et jamais répétitif.

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_crackPos[3];
uniform float u_crackStart[3];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.05;
    amp *= 0.5;
  }
  return v;
}

// Grille de particules éparses qui dérivent et scintillent — sert aux
// étoiles lointaines, aux braises montantes et aux éclats de givre.
float sparkles(vec2 uv, float density, vec2 drift, float t, float seedOffset, float rarity) {
  vec2 p = uv * density + drift * t;
  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;
  float rnd = hash(id + seedOffset);
  if (rnd < rarity) return 0.0;
  float twinkle = 0.5 + 0.5 * sin(t * (1.5 + rnd * 3.0) + rnd * 12.0);
  float d = length(gv);
  float pt = smoothstep(0.09, 0.0, d);
  return pt * twinkle;
}

// Crête montagneuse/volcanique procédurale : silhouette dont l'altitude
// suit un fbm 1D, mélangée en aplat de couleur sous une ligne de crête.
float ridgeMask(float x, float baseline, float amp, float freq, float seed, float y, bool grows) {
  float h = fbm(vec2(x * freq + seed, seed * 4.1)) - 0.5;
  float peakY = baseline + h * amp;
  return grows ? smoothstep(peakY, peakY - 0.012, y) : smoothstep(peakY, peakY + 0.012, y);
}

// Pilier de garde stylisé : colonne fine surmontée d'un foyer lumineux
// pulsant, plantée sur le bord du plateau.
vec3 pillar(vec2 p, float side, float t, vec3 glowColor) {
  vec2 pp = vec2(p.x - side, p.y);
  float halfW = 0.014;
  float colTop = -0.62;
  float colBottom = 0.62;
  float col = smoothstep(halfW, halfW - 0.004, abs(pp.x)) * smoothstep(colBottom, colBottom - 0.02, pp.y) * smoothstep(colTop, colTop + 0.02, pp.y);
  vec3 color = vec3(0.05, 0.04, 0.06) * col;
  float orbY = colTop - 0.05;
  float orbPulse = 0.6 + 0.4 * sin(t * 2.2 + side * 3.0);
  float orbDist = length(vec2(pp.x, pp.y - orbY));
  float orb = smoothstep(0.05, 0.0, orbDist) * orbPulse;
  float orbGlow = smoothstep(0.16, 0.0, orbDist) * 0.5 * orbPulse;
  color += glowColor * (orb * 1.4 + orbGlow);
  color += glowColor * col * 0.35 * orbPulse;
  return color;
}

void main() {
  float zoom = 1.0 + 0.018 * sin(u_time * 0.11);
  vec2 zoomedUv = (v_uv - 0.5) / zoom + 0.5;
  vec2 uv = zoomedUv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  bool lowerHalf = uv.y > 0.5;

  // --- Ciel : dégradé nuit profonde -> teinte du camp, de part et d'autre
  // de la ligne d'horizon centrale. ---
  vec3 skyTopFar = vec3(0.035, 0.05, 0.10);
  vec3 skyTopNear = vec3(0.08, 0.16, 0.28);
  vec3 skyBotFar = vec3(0.06, 0.02, 0.02);
  vec3 skyBotNear = vec3(0.22, 0.09, 0.05);
  vec3 color;
  if (!lowerHalf) {
    float t = uv.y / 0.5;
    color = mix(skyTopFar, skyTopNear, t);
  } else {
    float t = (uv.y - 0.5) / 0.5;
    color = mix(skyBotNear, skyBotFar, t);
  }

  // --- Étoiles lointaines côté Meute, cendres en suspension côté Chevalier. ---
  if (!lowerHalf) {
    float stars = sparkles(uv, 140.0, vec2(0.0, 0.0), u_time * 0.15, 71.0, 0.965);
    color += vec3(0.85, 0.9, 1.0) * stars * 0.8;
  } else {
    float ash = sparkles(uv, 90.0, vec2(0.01, -0.03), u_time, 22.0, 0.93);
    color += vec3(0.6, 0.35, 0.2) * ash * 0.5;
  }

  // --- Crêtes de glace (haut) et coulées volcaniques (bas), en plusieurs
  // plans pour la profondeur. ---
  float iceFar = ridgeMask(p.x, 0.5 - 0.16, 0.05, 2.1, 5.0, uv.y, false);
  color = mix(color, vec3(0.14, 0.24, 0.34), iceFar * 0.85);
  float iceNear = ridgeMask(p.x, 0.5 - 0.09, 0.045, 3.4, 19.0, uv.y, false);
  color = mix(color, vec3(0.20, 0.34, 0.46), iceNear * 0.9);

  float fireFar = ridgeMask(p.x, 0.5 + 0.17, 0.06, 1.8, 41.0, uv.y, true);
  color = mix(color, vec3(0.20, 0.08, 0.05), fireFar * 0.85);
  float fireNear = ridgeMask(p.x, 0.5 + 0.10, 0.05, 3.0, 63.0, uv.y, true);
  color = mix(color, vec3(0.32, 0.12, 0.05), fireNear * 0.9);
  // Veines de lave qui rampent sur la crête proche.
  float lavaVein = smoothstep(0.62, 1.0, fbm(vec2(p.x * 6.0, uv.y * 10.0 - u_time * 0.4)));
  color += vec3(1.0, 0.4, 0.08) * lavaVein * fireNear * 0.7;

  // --- Cercle runique au sol, de chaque côté de l'horizon. ---
  float ringY = lowerHalf ? uv.y - 0.5 : 0.5 - uv.y;
  vec2 ringP = vec2(p.x, ringY * 1.35);
  float ringR = length(ringP);
  float ringTheta = atan(ringP.y, ringP.x);
  float ticks = smoothstep(0.986, 1.0, fract(ringTheta * 24.0 / 6.28318 + u_time * 0.03));
  float ringBand = smoothstep(0.34, 0.335, ringR) * smoothstep(0.30, 0.305, -ringR + 0.34);
  vec3 runeColor = lowerHalf ? vec3(1.0, 0.5, 0.15) : vec3(0.4, 0.75, 1.0);
  float runePulse = 0.5 + 0.5 * sin(u_time * 1.1 + ringR * 8.0);
  color += runeColor * ringBand * (0.35 + 0.35 * runePulse);
  color += runeColor * ringBand * ticks * 0.6;
  float ringBand2 = smoothstep(0.20, 0.198, ringR) * smoothstep(0.185, 0.187, -ringR + 0.20);
  color += runeColor * ringBand2 * 0.4;

  // --- Cristal central : losange à facettes, coeur de l'arène. ---
  float diamond = abs(p.x) * 0.85 + abs(p.y - 0.0) * 1.3;
  float core = smoothstep(0.05, 0.0, diamond);
  float facet = smoothstep(0.12, 0.02, diamond) - core;
  float centerPulse = 0.5 + 0.5 * sin(u_time * 1.6);
  vec3 crystalColor = mix(vec3(0.4, 0.7, 1.0), vec3(1.0, 0.55, 0.2), 0.5 + 0.5 * sin(u_time * 0.6));
  color += vec3(1.0, 0.97, 0.9) * core * (0.8 + 0.5 * centerPulse);
  color += crystalColor * facet * (0.5 + 0.4 * centerPulse);
  float crystalGlow = smoothstep(0.30, 0.0, diamond);
  color += crystalColor * crystalGlow * 0.18;
  // Rayons tournants issus du cristal.
  float rayTheta = atan(p.y, p.x);
  float rays = smoothstep(0.985, 1.0, fract(rayTheta * 6.0 / 6.28318 + u_time * 0.08));
  color += vec3(1.0, 0.95, 0.85) * rays * smoothstep(0.5, 0.0, length(p)) * 0.4;

  // --- Piliers de garde sur les bords. ---
  color += pillar(p, -0.92 * aspect * 0.5, u_time, vec3(0.3, 0.7, 1.0));
  color += pillar(p, 0.92 * aspect * 0.5, u_time + 1.7, vec3(1.0, 0.5, 0.15));

  // --- Braises montantes (bas) / éclats de givre dérivants (haut), au premier plan. ---
  if (lowerHalf) {
    float emberField = sparkles(uv, 55.0, vec2(-0.015, -0.12), u_time, 4.0, 0.86);
    color += vec3(1.0, 0.55, 0.15) * emberField * 0.9;
  } else {
    float frostField = sparkles(uv, 60.0, vec2(0.01, 0.05), u_time, 11.0, 0.86);
    color += vec3(0.75, 0.88, 1.0) * frostField * 0.7;
  }

  // --- Sursauts de flamme occasionnels sur les bords bas — contenus loin
  // du centre du plateau pour ne jamais gêner la lisibilité du jeu. ---
  float burstPeriod = 7.0;
  float burstPhase = fract(u_time / burstPeriod);
  float burstSeed = hash(vec2(floor(u_time / burstPeriod), 3.7));
  float burstEnvelope = smoothstep(0.0, 0.12, burstPhase) * smoothstep(0.55, 0.12, burstPhase);
  float burstSide = step(0.5, burstSeed);
  float burstEdge = burstSide > 0.5 ? (1.0 - uv.x) : uv.x;
  float burstMask = smoothstep(0.28, 0.0, burstEdge) * smoothstep(0.55, 1.0, uv.y) * step(0.5, burstSeed + 0.15);
  color += vec3(1.0, 0.5, 0.15) * burstMask * burstEnvelope * 1.1;

  // --- Fissures du plateau : quand le héros encaisse des dégâts directs,
  // une fracture façon impact de verre part du point de frappe, grandit
  // puis s'efface — jamais permanente. ---
  for (int i = 0; i < 3; i++) {
    float start = u_crackStart[i];
    if (start < 0.0) continue;
    float age = u_time - start;
    float duration = 2.6;
    if (age < 0.0 || age > duration) continue;
    vec2 center = u_crackPos[i];
    vec2 aspectUv = (v_uv - center) * vec2(u_resolution.x / u_resolution.y, 1.0);
    float r = length(aspectUv);
    float theta = atan(aspectUv.y, aspectUv.x);
    float maxR = mix(0.015, 0.34, smoothstep(0.0, 0.9, age / duration));
    float jag = fbm(vec2(theta * 2.4, r * 10.0) + float(i) * 3.1);
    float lineField = abs(fract(theta / 6.28318 * 9.0 + jag * 1.6) - 0.5);
    float crackLine = smoothstep(0.05, 0.0, lineField) * smoothstep(maxR, maxR * 0.75, r) * step(r, maxR);
    float fadeOut = 1.0 - smoothstep(duration * 0.55, duration, age);
    float flash = smoothstep(0.16, 0.0, age) * smoothstep(0.05, 0.0, r);
    color = mix(color, vec3(0.04, 0.02, 0.02), crackLine * 0.55 * fadeOut);
    color += vec3(1.0, 0.85, 0.55) * crackLine * fadeOut * 0.9;
    color += vec3(1.0, 0.95, 0.85) * flash * 1.4;
  }

  // --- Vignette. ---
  float vig = smoothstep(1.1, 0.35, length((uv - 0.5) * vec2(aspect, 1.0)));
  color *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(color, 1.0);
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

const MAX_CRACKS = 3;

const ArenaBackground = forwardRef<ArenaBackgroundHandle, { className?: string; paused?: boolean }>(function ArenaBackground({ className, paused }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const cracksRef = useRef<{ u: number; v: number; start: number }[]>(
    Array.from({ length: MAX_CRACKS }, () => ({ u: 0, v: 0, start: -1 }))
  );
  const crackCursorRef = useRef(0);
  const elapsedRef = useRef(0);

  useImperativeHandle(ref, () => ({
    triggerCrack: (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const u = (clientX - rect.left) / rect.width;
      const v = (clientY - rect.top) / rect.height;
      const slot = crackCursorRef.current % MAX_CRACKS;
      crackCursorRef.current++;
      cracksRef.current[slot] = { u, v, start: elapsedRef.current };
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, 'a_position');

    const u_time = gl.getUniformLocation(program, 'u_time');
    const u_resolution = gl.getUniformLocation(program, 'u_resolution');
    const u_crackPos = gl.getUniformLocation(program, 'u_crackPos');
    const u_crackStart = gl.getUniformLocation(program, 'u_crackStart');
    const crackPosBuf = new Float32Array(MAX_CRACKS * 2);
    const crackStartBuf = new Float32Array(MAX_CRACKS);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const onContextLost = (event: Event) => event.preventDefault();
    canvas.addEventListener('webglcontextlost', onContextLost);

    let rafId = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      if (pausedRef.current) return;
      elapsed += dt;
      elapsedRef.current = elapsed;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(u_time, elapsed);
      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      for (let i = 0; i < MAX_CRACKS; i++) {
        const crack = cracksRef.current[i];
        crackPosBuf[i * 2] = crack.u;
        crackPosBuf[i * 2 + 1] = crack.v;
        crackStartBuf[i] = crack.start;
      }
      gl.uniform2fv(u_crackPos, crackPosBuf);
      gl.uniform1fv(u_crackStart, crackStartBuf);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
});

export default ArenaBackground;
