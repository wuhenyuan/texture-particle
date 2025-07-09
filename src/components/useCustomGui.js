import dat from "dat.gui";

let isInit = false;
export default function useGui(config) {
  if (isInit) return;
  isInit = true;
  const gui = new dat.GUI();

  gui.addColor(config, "edgeColor").name("edgeColor");

  gui.addColor(config, "rainColor").name("粒子颜色");

  function addGui(key, name, min, max, step) {
    gui
      .add(config, key, min ?? -1, max ?? 10, step ?? 0.01)
      .name(name ?? key)
      .onChange((value) => console.log(key, value));
  }
  return { gui, addGui };
}
