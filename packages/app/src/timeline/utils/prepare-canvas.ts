export function prepareCanvas({
  canvas,
  cssW,
  cssH,
  dpr,
}: {
  canvas: HTMLCanvasElement;
  cssW: number;
  cssH: number;
  dpr: number;
}): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  // Reset transform — setting canvas.width resets it, clearRect doesn't
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
}
