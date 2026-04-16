import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/**
 * Rasterizes overlay text to a full-canvas RGBA texture (matches image-synth behavior:
 * centered Impact-style label, resolution tied to draw buffer for stable UV mapping).
 */
export function createTextTexture(
  text: string,
  width: number,
  height: number,
  color: string,
  fontSize: number,
): CanvasTexture | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const w = Math.max(2, Math.floor(width));
  const h = Math.max(2, Math.floor(height));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const size = Math.max(8, fontSize * (Math.min(w, h) / 900));
  ctx.font = `700 ${size}px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(trimmed, w * 0.5, h * 0.5);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
