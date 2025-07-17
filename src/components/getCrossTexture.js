import { CanvasTexture, NearestFilter } from "three";
export default function getCrossTexture(width, height) {
  const gridSize = 20; // 每格尺寸（正方形）
  const numCols = 150;
  const numRows = 201;
  const canvas = document.createElement("canvas");

  canvas.width = gridSize * numCols;
  canvas.height = gridSize * numRows;

  const ctx = canvas.getContext("2d", { alpha: true });

  // ctx.font = "bold 150px Comic Sans MS";
  // // ctx.font = "bold 180px Brush Script MT";
  // ctx.fillStyle = "white";
  // ctx.textBaseline = "middle";
  // ctx.textAlign = "center";

  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0)";

  const particleColor = "#E0E0E0";

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (Math.random() < 0.05) continue;
      ctx.save();

      const x = col * gridSize;
      const y = row * gridSize;

      ctx.translate(x + gridSize / 2, y + gridSize / 2);

      const isHorizontal = Math.random() > 0.5;
      const randomFactor = 0.8 + Math.random() * 0.4;

      let w, h;

      let widthScale = 0.8;
      let heightScale = 0.5;

      if (isHorizontal) {
        w = gridSize * widthScale * randomFactor;
        h = gridSize * heightScale * (0.8 + Math.random() * 0.3);
      } else {
        w = gridSize * heightScale * (0.8 + Math.random() * 0.3);
        h = gridSize * widthScale * randomFactor;
      }

      w = Math.max(2, w);
      h = Math.max(2, h);

      const angle = (Math.random() - 0.5) * (Math.PI / 12);
      const offsetX = (Math.random() - 0.5) * gridSize * 0.1;
      const offsetY = (Math.random() - 0.5) * gridSize * 0.1;

      ctx.rotate(angle); // 创建径向渐变，从中心到边缘过渡透明
      const gradient = ctx.createRadialGradient(
        offsetX,
        offsetY,
        0,
        offsetX,
        offsetY,
        Math.max(w, h) / 2
      );
      gradient.addColorStop(0.0, "rgba(224, 224, 224, 1)");
      gradient.addColorStop(0.6, "rgba(224, 224, 224, 0.6)");
      gradient.addColorStop(1.0, "rgba(224, 224, 224, 0.1)");

      ctx.fillStyle = gradient;
      ctx.fillRect(-w / 2 + offsetX, -h / 2 + offsetY, w, h);

      ctx.restore();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.anisotropy = 0;
  texture.needsUpdate = true;

  return texture;
}
