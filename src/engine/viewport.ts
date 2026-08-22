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

  function transform() {
    const scale = Math.min(vp.displayW / refW, vp.displayH / refH);
    return { scale, offsetX: (vp.displayW - refW * scale) / 2, offsetY: (vp.displayH - refH * scale) / 2 };
  }

  function toWorld(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = transform();
    return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
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
