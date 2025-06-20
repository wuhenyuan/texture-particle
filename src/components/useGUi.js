import dat from "dat.gui";
export default function useGui(config) {
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

  gui
    .add(config, "blendRatio", 0, 1)
    .name("blendRatio")
    .onChange((value) => {
      console.log("blendRatio", value);
    });

  // gui
  //   .add(config, "suppress", 0, 2)
  //   .name("suppress")
  //   .onChange((value) => console.log("suppress", value));

  gui
    .add(config, "contrast", 0, 20)
    .name("contrast")
    .onChange((value) => console.log("contrast", value));

  gui
    .add(config, "uLowProb", 0, 1.0, 0.001)
    .name("uLowProb")
    .onChange((value) => console.log("uLowProb", value));

  gui
    .add(config, "uHighProb", 0, 1, 0.001)
    .name("uHighProb")
    .onChange((value) => console.log("uHighProb", value));

  gui
    .add(config, "pointSize", 0, 20, 0.01)
    .name("pointSize")
    .onChange((value) => console.log("pointSize", value));

  gui
    .add(config, "sampleStep", 0, 50, 1)
    .name("粒子密度")
    .onChange((value) => console.log("sampleStep", value));

  gui
    .addColor(config, "particleColor")
    .name("粒子颜色")
    .onChange((value) => console.log("particleColor", value));
}
