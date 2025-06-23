import { CanvasTexture, LinearFilter } from "three";
export default function generateDigitTextureAtlas() {
  // const cols = 10;
  const cols = 1;
  const rows = 1;
  const cellSize = 128;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 96px monospace";
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  for (let i = 0; i < cols; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellSize + cellSize / 2;
    const y = row * cellSize + cellSize / 2;
    ctx.fillText(i.toString(), x, y);
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
