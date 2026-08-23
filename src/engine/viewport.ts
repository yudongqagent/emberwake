/**
 * Shared responsive-canvas transform: keeps a fixed-aspect "world" (refW x refH)
 * uniformly scaled and centered inside whatever pixel box the canvas actually
 * renders at, so circles stay circles on any device aspect ratio. Used by both
 * SystemView (the open map) and Combat (the battle arena).
 */
export interface Viewport {
  displayW: number;
  displayH: number;
  dpr: number;
  refW: number;
  refH: number;
  resize: () => void;
  transform: () => { scale: number; offsetX: number; offsetY: number };
  toWorld: (clientX: number, clientY: number) => { x: number; y: number };
  beginFrame: (ctx: CanvasRenderingContext2D) => void;
  destroy: () => void;
}

/** Pure, DOM-free so it's directly unit-testable: given the container's measured
 * size, returns a scale that's never 0/NaN/Infinity even if displayW/displayH are
 * momentarily 0 (a real mobile scenario — an orientation change or the address bar
 * hiding/showing can report a 0-size rect for a frame, often right as a touch event
 * lands). Falls back to lastGoodScale instead of propagating the bad value. */
export function safeScale(displayW: number, displayH: number, refW: number, refH: number, lastGoodScale: number): number {
  const scale = Math.min(displayW / refW, displayH / refH);
  return Number.isFinite(scale) && scale > 0 ? scale : lastGoodScale;
}

/** Pure, DOM-free: converts a client-space point to world-space given an already-
 * computed transform, clamping to the world center if the inputs still produce a
 * non-finite result (a last-resort guard, since NaN/Infinity here would otherwise
 * poison a physics loop's velocity permanently — every later frame's arithmetic on a
 * NaN stays NaN forever, which reads to a player as their ship silently freezing). */
export function safeToWorld(
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  refW: number,
  refH: number,
): { x: number; y: number } {
  const x = (clientX - rectLeft - offsetX) / scale;
  const y = (clientY - rectTop - offsetY) / scale;
  return {
    x: Number.isFinite(x) ? x : refW / 2,
    y: Number.isFinite(y) ? y : refH / 2,
  };
}

export function attachResponsiveCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  refW: number,
  refH: number,
): Viewport {
  const vp: Viewport = {
    displayW: 0,
    displayH: 0,
    dpr: 1,
    refW,
    refH,
    resize: () => {},
    transform: () => ({ scale: 1, offsetX: 0, offsetY: 0 }),
    toWorld: () => ({ x: 0, y: 0 }),
    beginFrame: () => {},
    destroy: () => {},
  };

  function resize() {
    const rect = container.getBoundingClientRect();
    vp.dpr = window.devicePixelRatio || 1;
    vp.displayW = rect.width;
    vp.displayH = rect.height;
    canvas.width = Math.max(1, Math.round(vp.displayW * vp.dpr));
    canvas.height = Math.max(1, Math.round(vp.displayH * vp.dpr));
    canvas.style.width = `${vp.displayW}px`;
    canvas.style.height = `${vp.displayH}px`;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let lastGoodScale = 1;

  function transform() {
    const scale = safeScale(vp.displayW, vp.displayH, refW, refH, lastGoodScale);
    lastGoodScale = scale;
    return { scale, offsetX: (vp.displayW - refW * scale) / 2, offsetY: (vp.displayH - refH * scale) / 2 };
  }

  function toWorld(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = transform();
    return safeToWorld(clientX, clientY, rect.left, rect.top, scale, offsetX, offsetY, refW, refH);
  }

  function beginFrame(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
    ctx.clearRect(0, 0, vp.displayW, vp.displayH);
  }

  vp.resize = resize;
  vp.transform = transform;
  vp.toWorld = toWorld;
  vp.beginFrame = beginFrame;
  vp.destroy = () => ro.disconnect();
  return vp;
}
