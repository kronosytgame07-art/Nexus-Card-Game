import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import arenaPlateUrl from '../assets/backgrounds/arena-plate.webp';

export type ArenaBackgroundHandle = { triggerCrack: (clientX: number, clientY: number) => void };

// Fond d'arène en WebGL, à la place d'une vidéo pré-rendue en boucle.
// Base : l'illustration originale (une image extraite de l'ancienne
// vidéo), affichée en "cover" (jamais de bande noire, net à n'importe
// quelle résolution) — mais ce n'est plus une simple photo statique :
// un shader anime les torches et le cristal directement là où ils sont
// dessinés dans l'image (détection par couleur, pas de coordonnées
// codées en dur), fait tomber de la neige côté Meute, monter des
// cendres côté Chevalier, et respire lentement le cadrage. Rien n'est
// une boucle vidéo à durée fixe : tout est continu.

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
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texSize;
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
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.05;
    amp *= 0.5;
  }
  return v;
}

// UV façon object-fit:cover : remplit toujours l'écran entier, quel que
// soit son ratio, en rognant l'excédent plutôt que de laisser des bandes.
vec2 coverUv(vec2 uv, vec2 screenSize, vec2 texSize) {
  float screenRatio = screenSize.x / screenSize.y;
  float texRatio = texSize.x / texSize.y;
  vec2 newUv = uv;
  if (screenRatio > texRatio) {
    float scale = texRatio / screenRatio;
    newUv.y = (uv.y - 0.5) * scale + 0.5;
  } else {
    float scale = screenRatio / texRatio;
    newUv.x = (uv.x - 0.5) * scale + 0.5;
  }
  return newUv;
}

// Grille de particules éparses qui dérivent et scintillent.
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

// Flocons qui tombent vraiment (dérive verticale dominante + léger
// balancement), plutôt qu'un simple scintillement statique.
float snow(vec2 uv, float density, float t, float seedOffset) {
  vec2 p = uv * density + vec2(0.0, t * 0.22);
  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;
  float rnd = hash(id + seedOffset);
  if (rnd < 0.9) return 0.0;
  gv.x += sin(t * 1.1 + rnd * 30.0) * 0.22;
  float d = length(gv);
  return smoothstep(0.10, 0.0, d) * (0.55 + 0.45 * rnd);
}

void main() {
  float zoom = 1.0 + 0.018 * sin(u_time * 0.11);
  vec2 zoomedUv = (v_uv - 0.5) / zoom + 0.5;
  vec2 uv = coverUv(zoomedUv, u_resolution, u_texSize);

  // Léger tremblement de chaleur/givre localisé sur les bords (là où
  // l'illustration place torches, cristaux et bannières) : la couleur
  // échantillonnée bouge donc réellement dans le temps au lieu de rester
  // une photo figée.
  float edgeBand = smoothstep(0.36, 0.0, min(uv.x, 1.0 - uv.x));
  vec2 shimmer = vec2(
    sin(u_time * 2.6 + uv.y * 34.0) * 0.0038,
    sin(u_time * 1.7 + uv.x * 26.0) * 0.0022
  ) * edgeBand;
  vec3 color = texture2D(u_texture, uv + shimmer).rgb;

  bool lowerHalf = uv.y > 0.5;

  // Détection des flammes/cristaux par leur couleur dans l'image même
  // (pas de coordonnées codées en dur) : où qu'ils soient dessinés, on
  // les fait pulser et scintiller à leur place exacte.
  float brightness = dot(color, vec3(0.299, 0.587, 0.114));
  float blueness = color.b - max(color.r, color.g);
  float orangeness = color.r - color.b;
  float isBlueFlame = smoothstep(0.10, 0.32, blueness) * smoothstep(0.30, 0.65, brightness);
  float isOrangeFlame = smoothstep(0.08, 0.28, orangeness) * smoothstep(0.30, 0.68, brightness);
  float flicker = 0.65 + 0.35 * sin(u_time * 6.2 + uv.x * 50.0 + uv.y * 37.0) * sin(u_time * 3.3 + uv.y * 21.0);
  color += vec3(0.35, 0.65, 1.0) * isBlueFlame * flicker * 0.55;
  color += vec3(1.0, 0.5, 0.15) * isOrangeFlame * flicker * 0.55;

  // Lueur pulsée des torches/cristaux, plus marquée près des bords où ils
  // sont réellement dessinés dans l'illustration.
  float edge = min(uv.x, 1.0 - uv.x);
  float edgeGlow = smoothstep(0.22, 0.0, edge) * (0.55 + 0.45 * sin(u_time * 0.9 + edge * 20.0));
  vec3 glowColor = lowerHalf ? vec3(1.0, 0.45, 0.12) : vec3(0.25, 0.55, 1.0);
  color += glowColor * edgeGlow * 0.16;

  // Cristal central pulsant, à la jonction entre les deux camps.
  float centerDist = distance(uv, vec2(0.497, 0.505));
  float centerPulse = 0.5 + 0.5 * sin(u_time * 1.6);
  color += vec3(0.7, 0.85, 1.0) * smoothstep(0.05, 0.0, centerDist) * (0.5 + 0.5 * centerPulse);

  // Braises montantes + cendres qui dérivent (bas) / éclats de givre +
  // neige qui tombe vraiment (haut).
  if (lowerHalf) {
    float emberField = sparkles(uv, 55.0, vec2(-0.015, -0.12), u_time, 4.0, 0.86);
    color += vec3(1.0, 0.55, 0.15) * emberField * 0.9;
    float ashField = sparkles(uv, 26.0, vec2(0.03, -0.045), u_time, 8.0, 0.9);
    color += vec3(0.55, 0.5, 0.48) * ashField * 0.4;
  } else {
    float frostField = sparkles(uv, 60.0, vec2(0.01, 0.05), u_time, 11.0, 0.86);
    color += vec3(0.75, 0.88, 1.0) * frostField * 0.7;
    float snowField = snow(uv, 34.0, u_time, 17.0);
    color += vec3(0.9, 0.94, 1.0) * snowField * 0.85;
  }

  // Turbulence de chaleur discrète au ras du sol du camp Chevalier (le feu).
  if (lowerHalf) {
    float heat = fbm(uv * vec2(9.0, 14.0) + vec2(0.0, -u_time * 0.35));
    float heatMask = smoothstep(0.72, 1.0, uv.y);
    color += vec3(1.0, 0.35, 0.08) * heat * heatMask * 0.18;
  }

  // Sursauts de flamme occasionnels sur les bords bas — contenus loin du
  // centre du plateau pour ne jamais gêner la lisibilité du jeu.
  float burstPeriod = 7.0;
  float burstPhase = fract(u_time / burstPeriod);
  float burstSeed = hash(vec2(floor(u_time / burstPeriod), 3.7));
  float burstEnvelope = smoothstep(0.0, 0.12, burstPhase) * smoothstep(0.55, 0.12, burstPhase);
  float burstSide = step(0.5, burstSeed);
  float burstEdge = burstSide > 0.5 ? (1.0 - uv.x) : uv.x;
  float burstMask = smoothstep(0.28, 0.0, burstEdge) * smoothstep(0.55, 1.0, uv.y) * step(0.5, burstSeed + 0.15);
  color += vec3(1.0, 0.5, 0.15) * burstMask * burstEnvelope * 1.1;

  // Fissures du plateau : quand le héros encaisse des dégâts directs, une
  // fracture façon impact de verre part du point de frappe, grandit puis
  // s'efface — jamais permanente, pour ne pas encrasser la lisibilité.
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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Les images HTML ont (0,0) en haut à gauche, les textures WebGL en bas
    // à gauche — sans ce flag, l'image se retrouve rendue à l'envers.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([5, 8, 10, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let texSize = { x: 1920, y: 1080 };
    const image = new Image();
    image.onload = () => {
      texSize = { x: image.naturalWidth, y: image.naturalHeight };
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    };
    image.src = arenaPlateUrl;

    const u_time = gl.getUniformLocation(program, 'u_time');
    const u_resolution = gl.getUniformLocation(program, 'u_resolution');
    const u_texSize = gl.getUniformLocation(program, 'u_texSize');
    const u_texture = gl.getUniformLocation(program, 'u_texture');
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
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u_texture, 0);
      gl.uniform1f(u_time, elapsed);
      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      gl.uniform2f(u_texSize, texSize.x, texSize.y);
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
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
});

export default ArenaBackground;
