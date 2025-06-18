import dat from "dat.gui";
export default function useGui(config) {
  const gui = new dat.GUI();
  gui
    .add(config, "density", 0.1, 1)
    .name("density")
    .onChange((value) => {
      console.log("density", value);
    });

  gui
    .add(config, "threshold", 0.0, 1, 0.01)
    .name("threshold")
    .onChange((value) => {
      console.log("threshold", value);
    });

  gui
    .add(config, "sharpen", 0, 2)
    .name("sharpen")
    .onChange((value) => {
      console.log("sharpen", value);
    });

  gui
    .add(config, "blendRatio", 0, 1)
    .name("blendRatio")
    .onChange((value) => {
      console.log("blendRatio", value);
    });

  gui
    .add(config, "suppress", 0, 2)
    .name("suppress")
    .onChange((value) => console.log("suppress", value));
}
