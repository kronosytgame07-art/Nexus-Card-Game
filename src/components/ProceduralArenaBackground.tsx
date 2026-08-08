import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ArenaBackgroundHandle } from './ArenaBackground';

export type ArenaTheme = 'frost' | 'volcanic' | 'spectral';

// Terrains cosmétiques achetables en Boutique — entièrement procéduraux
// (aucune texture à fournir), sur le même principe que le fond d'arène par
// défaut : dégradé animé + particules + fissures au moment des dégâts. Un
// seul programme partagé, la teinte change via u_theme plutôt que de
// dupliquer le shader trois fois.

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
uniform int u_theme;
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
  vec2 res = u_resolution;
  vec2 uv = v_uv;
  vec2 aspectUv = (uv - 0.5) * vec2(res.x / res.y, 1.0) + 0.5;

  vec3 deepColor;
  vec3 highColor;
  vec3 accentColor;
  if (u_theme == 0) {
    deepColor = vec3(0.03, 0.07, 0.11);
    highColor = vec3(0.07, 0.18, 0.24);
    accentColor = vec3(0.75, 0.9, 1.0);
  } else if (u_theme == 1) {
    deepColor = vec3(0.07, 0.02, 0.02);
    highColor = vec3(0.22, 0.06, 0.03);
    accentColor = vec3(1.0, 0.55, 0.15);
  } else {
    deepColor = vec3(0.035, 0.02, 0.08);
    highColor = vec3(0.11, 0.04, 0.2);
    accentColor = vec3(0.7, 0.55, 1.0);
  }

  // Dégradé radial de base + nuages fbm lents en surimpression, jamais figé.
  float radial = distance(aspectUv, vec2(0.5, 0.42));
  vec3 color = mix(highColor, deepColor, smoothstep(0.05, 0.85, radial));
  float clouds = fbm(aspectUv * 2.2 + vec2(u_time * 0.03, -u_time * 0.02));
  color = mix(color, highColor, clouds * 0.22);

  // Bandes lentes de couleur (aurore / vagues de chaleur / brume) qui
  // traversent doucement l'écran.
  float bands = fbm(vec2(aspectUv.x * 1.6, aspectUv.y * 3.0 + u_time * 0.06));
  color += accentColor * smoothstep(0.55, 0.95, bands) * 0.12;

  // Lueur centrale pulsante (cristal/noyau), point focal du plateau.
  float centerDist = distance(aspectUv, vec2(0.5, 0.46));
  float pulse = 0.55 + 0.45 * sin(u_time * 1.4);
  color += accentColor * smoothstep(0.32, 0.0, centerDist) * pulse * 0.5;

  // Vignette douce pour garder le plateau de jeu lisible au centre.
  float vignette = smoothstep(0.95, 0.25, radial);
  color *= mix(0.55, 1.0, vignette);

  // Particules spécifiques au thème.
  if (u_theme == 0) {
    float snowField = snow(uv, 38.0, u_time, 5.0);
    color += vec3(0.92, 0.96, 1.0) * snowField * 0.9;
    float sparkleField = sparkles(uv, 70.0, vec2(0.01, 0.05), u_time, 12.0, 0.88);
    color += accentColor * sparkleField * 0.6;
  } else if (u_theme == 1) {
    float emberField = sparkles(uv, 50.0, vec2(-0.02, -0.16), u_time, 4.0, 0.85);
    color += vec3(1.0, 0.55, 0.15) * emberField * 1.0;
    float ashField = sparkles(uv, 24.0, vec2(0.03, -0.05), u_time, 9.0, 0.9);
    color += vec3(0.6, 0.5, 0.46) * ashField * 0.4;
    float heat = fbm(aspectUv * vec2(8.0, 12.0) + vec2(0.0, -u_time * 0.4));
    color += vec3(1.0, 0.35, 0.08) * heat * smoothstep(0.6, 1.0, uv.y) * 0.16;
  } else {
    float wispField = sparkles(uv, 18.0, vec2(0.015, -0.03), u_time, 21.0, 0.82);
    color += accentColor * wispField * 0.55;
    float motesField = sparkles(uv, 55.0, vec2(-0.008, 0.02), u_time, 33.0, 0.9);
    color += vec3(0.85, 0.8, 1.0) * motesField * 0.45;
  }

  // Fissures au moment des dégâts — identiques quel que soit le thème,
  // c'est un retour de gameplay, pas un élément décoratif.
  for (int i = 0; i < 3; i++) {
    float start = u_crackStart[i];
    if (start < 0.0) continue;
    float age = u_time - start;
    float duration = 2.6;
    if (age < 0.0 || age > duration) continue;
    vec2 center = u_crackPos[i];
    vec2 crackUv = (v_uv - center) * vec2(res.x / res.y, 1.0);
    float r = length(crackUv);
    float theta = atan(crackUv.y, crackUv.x);
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
const THEME_INDEX: Record<ArenaTheme, number> = { frost: 0, volcanic: 1, spectral: 2 };

const ProceduralArenaBackground = forwardRef<ArenaBackgroundHandle, { theme: ArenaTheme; className?: string; paused?: boolean }>(
  function ProceduralArenaBackground({ theme, className, paused }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(!!paused);
    pausedRef.current = !!paused;
    const themeRef = useRef(THEME_INDEX[theme]);
    themeRef.current = THEME_INDEX[theme];
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
      const u_theme = gl.getUniformLocation(program, 'u_theme');
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
        gl.uniform1i(u_theme, themeRef.current);
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
  }
);

export default ProceduralArenaBackground;
