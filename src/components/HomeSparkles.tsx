import { useEffect, useRef } from 'react';

// Poussière de magie flottant au-dessus de la vidéo du menu principal — un
// calque WebGL discret (dérive lente de particules dorées/turquoise/violettes,
// assorties à la palette du site) pour donner plus de vie au fond sans rien
// changer à la vidéo elle-même. Le coût GPU suit le réglage de qualité global.

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float dust(vec2 uv, float density, vec2 drift, float t, float seedOffset, float rarity) {
  vec2 p = uv * density + drift * t;
  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;
  float rnd = hash(id + seedOffset);
  if (rnd < rarity) return 0.0;
  float twinkle = 0.4 + 0.6 * sin(t * (0.8 + rnd * 2.4) + rnd * 12.0);
  float d = length(gv);
  return smoothstep(0.08, 0.0, d) * twinkle;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  vec3 color = vec3(0.0);

  float gold = dust(uv * vec2(aspect, 1.0), 9.0, vec2(0.01, -0.045), u_time, 3.0, 0.955);
  color += vec3(0.95, 0.82, 0.45) * gold * 0.85;

  float teal = dust(uv * vec2(aspect, 1.0), 12.0, vec2(-0.02, -0.03), u_time, 17.0, 0.95);
  color += vec3(0.42, 0.86, 0.75) * teal * 0.75;

  float violet = dust(uv * vec2(aspect, 1.0), 7.0, vec2(0.015, -0.02), u_time, 29.0, 0.965);
  color += vec3(0.7, 0.55, 1.0) * violet * 0.75;

  // Balayage de lumière diagonal, discret, qui traverse lentement l'écran.
  float sweepPos = fract(u_time * 0.035);
  float sweep = smoothstep(0.16, 0.0, abs((uv.x + uv.y * 0.4) - sweepPos * 1.8 + 0.4));
  color += vec3(0.6, 0.75, 0.9) * sweep * 0.09;

  gl_FragColor = vec4(color, max(gold, max(teal, violet)) * 0.95 + sweep * 0.09);
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

export default function HomeSparkles({ className, paused }: { className?: string; paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false })) as WebGLRenderingContext | null;
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

    const quality = () => document.documentElement.dataset.quality ?? 'balanced';
    const renderDpr = () => {
      const device = window.devicePixelRatio || 1;
      if (quality() === 'eco') return Math.min(device, 1);
      if (quality() === 'balanced') return Math.min(device, 1.5);
      return Math.min(device, 2);
    };
    const targetFrameMs = () => quality() === 'eco' ? 1000 / 30 : 0;

    const resize = () => {
      const dpr = renderDpr();
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

    let hidden = document.hidden;
    const onVisibility = () => {
      hidden = document.hidden;
      lastFrame = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let rafId = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    let lastPaint = 0;
    let previousQuality = quality();
    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      if (pausedRef.current || hidden) return;

      const currentQuality = quality();
      if (currentQuality !== previousQuality) {
        previousQuality = currentQuality;
        resize();
      }
      const minFrameMs = targetFrameMs();
      if (minFrameMs > 0 && now - lastPaint < minFrameMs) return;
      lastPaint = now;
      elapsed += dt;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(u_time, elapsed);
      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
