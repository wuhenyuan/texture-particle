import { CanvasTexture, LinearFilter } from "three";
export default function generateDigitTextureAtlas() {
  // const cols = 10;
  const cols = 12;
  const rows = 12;
  const cellSize = 128;
  const width = cellSize + 20;
  const height = cellSize + 20;
  const canvas = document.createElement("canvas");
  canvas.width = cols * width;
  canvas.height = rows * height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 150px Comic Sans MS";
  // ctx.font = "bold 180px Brush Script MT";
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  let str = "0";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const str = Math.random() > 0.5 ? "0" : "1"; // 随机生成 "0" 或 "1"
      const x = col * width + width / 2;
      const y = row * height + height / 2;

      ctx.fillText(str, x, y);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  // return texture;

  // 添加导出图片功能
  // const exportImage = () => {
  //   const image = canvas.toDataURL("image/png"); // 将 canvas 转换为 PNG 格式的图片数据
  //   const link = document.createElement("a");
  //   link.href = image;
  //   link.download = "digit_texture_atlas.png"; // 设置保存的文件名
  //   link.click(); // 自动触发下载
  // };

  // // 你可以在某个交互事件中调用 exportImage()，例如按钮点击
  // document
  //   .getElementById("exportButton")
  //   ?.addEventListener("click", exportImage);

  // 将图片显示在浏览器中
  // const image = canvas.toDataURL("image/png"); // 将 canvas 转为 Base64 图片 URL
  // const imgElement = document.createElement("img");
  // imgElement.src = image; // 设置图片源
  // imgElement.style.border = "1px solid #000"; // 添加边框以便视觉区分
  // document.body.appendChild(imgElement); // 将图片插入页面中
  return texture;
}
