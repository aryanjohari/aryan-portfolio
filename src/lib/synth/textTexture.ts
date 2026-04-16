import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/**
 * Rasterizes overlay text to a full-canvas RGBA texture (matches image-synth behavior:
 * centered Impact-style label, resolution tied to draw buffer for stable UV mapping).
 * Supports multiple lines separated by newline.
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

  const lines = trimmed.split(/\n/);
  const size = Math.max(8, fontSize * (Math.min(w, h) / 900));
  const lineHeight = size * 1.15;
  ctx.font = `700 ${size}px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  const totalH = lines.length * lineHeight;
  let y = h * 0.5 - totalH * 0.5 + lineHeight * 0.5;
  for (const line of lines) {
    const t = line.trimEnd();
    if (t.length > 0) {
      ctx.fillText(t, w * 0.5, y);
    }
    y += lineHeight;
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
