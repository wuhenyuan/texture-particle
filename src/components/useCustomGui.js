import dat from "dat.gui";

let isInit = false;
export default function useGui(config) {
  if (isInit) return;
  isInit = true;
  const gui = new dat.GUI();

  // gui.addColor(config, "edgeColor").name("edgeColor");

  // gui.addColor(config, "rainColor").name("粒子颜色");
  gui.addColor(config, "particleColor").name("粒子颜色");
  gui.addColor(config, "pColor").name("漂浮颜色1");
  gui.addColor(config, "flashColor").name("漂浮颜色2");

  const backGui = gui.addFolder("背景");

  // bColor1: 0xcadedb,
  // bColor2: 0xd1e7dd,
  // bColor3: 0xdceaeb,
  // bColor4: 0xe0f2fe,
  backGui.add(config, "isShowBackground").name("背景");
  backGui.addColor(config, "bColor1").name("背景颜色1");
  backGui.addColor(config, "bColor2").name("背景颜色2");
  backGui.addColor(config, "bColor3").name("背景颜色3");
  backGui.addColor(config, "bColor4").name("背景颜色4");

  let map = new Map();
  function addGui(key, name, min, max, step, file) {
    let target = gui;
    if (file) {
      let fileTarget = map.get(file) ?? gui.addFolder(file);
      map.set(file, fileTarget);
      target = fileTarget;
    }
    target
      .add(config, key, min ?? -1, max ?? 10, step ?? 0.01)
      .name(name ?? key)
      .onChange((value) => console.log(key, value));
  }
  return { gui, addGui };
}
