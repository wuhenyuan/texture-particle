export default class EffectRenderer {
  constructor(renderer) {
    this.renderer = renderer;
  }

  render(fsQuad, rederTarget) {
    if (!fsQuad || !rederTarget) return;

    this.renderer.setRenderTarget(rederTarget);
    fsQuad.render(this.renderer);

    this.renderer.setRenderTarget(null);
  }
}
