import dat from "dat.gui";

let isInit = false;
export default function useGui(config) {
  if (isInit) return;
  isInit = true;
  const gui = new dat.GUI();
  // gui
  //   .add(config, "density", 0.1, 1)
  //   .name("density")
  //   .onChange((value) => {
  //     console.log("density", value);
  //   });

  // gui
  //   .add(config, "threshold", 0.0, 1, 0.01)
  //   .name("threshold")
  //   .onChange((value) => {
  //     console.log("threshold", value);
  //   });

  // gui
  //   .add(config, "sharpen", 0, 2)
  //   .name("sharpen")
  //   .onChange((value) => {
  //     console.log("sharpen", value);
  //   });

  // gui
  //   .add(config, "blendRatio", 0, 1)
  //   .name("blendRatio")
  //   .onChange((value) => {
  //     console.log("blendRatio", value);
  //   });

  // gui
  //   .add(config, "suppress", 0, 2)
  //   .name("suppress")
  //   .onChange((value) => console.log("suppress", value));

  // gui
  //   .add(config, "contrast", 0, 100)
  //   .name("contrast")
  //   .onChange((value) => console.log("contrast", value));

  // gui
  //   .add(config, "uLowProb", 0, 1.0, 0.001)
  //   .name("uLowProb")
  //   .onChange((value) => console.log("uLowProb", value));

  // gui
  //   .add(config, "uHighProb", 0, 1, 0.001)
  //   .name("uHighProb")
  //   .onChange((value) => console.log("uHighProb", value));

  gui
    .add(config, "pointSize", 0, 20, 0.01)
    .name("pointSize")
    .onChange((value) => console.log("pointSize", value));

  gui
    .add(config, "offsetScale", 0, 20, 0.01)
    .name("offsetScale")
    .onChange((value) => console.log("offsetScale", value));
  gui
    .add(config, "sampleStep", 0, 50, 1)
    .name("粒子密度")
    .onChange((value) => console.log("sampleStep", value));

  // gui
  //   .add(config, "diff")
  //   .name("背景差异")
  //   .onChange((value) => console.log("diff", value));

  gui
    .addColor(config, "particleColor")
    .name("粒子颜色")
    .onChange((value) => console.log("particleColor", value));

  gui
    .addColor(config, "uHighLightColor")
    .name("粒子颜色")
    .onChange((value) => console.log("cons", value));

  // gui
  //   .add(config, "scale", 0, 10, 0.01)
  //   .name("缩放")
  //   .onChange((value) => console.log("cons", value));
  // gui
  //   .add(config, "depthThroshold", 0, 10, 0.01)
  //   .name("深度阈值")
  //   .onChange((value) => console.log("depthThroshold", value));

  function addGui(key, name, max, step) {
    gui
      .add(config, key, -1, max ?? 10, step ?? 0.01)
      .name(name ?? key)
      .onChange((value) => console.log(key, value));
  }
  return { gui, addGui };
}
