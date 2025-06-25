import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  BlendFunction,
  SMAAPreset,
  PredicationMode,
  EdgeDetectionMode,
} from "postprocessing";

export default function usePostprocessing(scene, renderer, camera) {
  const composer = new EffectComposer(renderer, {
    multisampling: 0,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    luminanceThreshold: 0.1,
    luminanceSmoothing: 0.01,
    intensity: 10,
    mipmapBlur: false,
  });

  // mipmapBlur: !0,
  // luminanceThreshold: 0.5,
  // luminanceSmoothing: 1.3,

  composer.addPass(new EffectPass(camera, bloomEffect));

  return composer;
}
