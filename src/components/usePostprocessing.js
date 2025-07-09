import {
  BloomEffect,
  EffectComposer,
  ToneMappingEffect,
  BlendFunction,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  PredicationMode,
  FXAAEffect,
  OutlineEffect,
  // DepthDownsamplingPass,
  NormalPass,
  // SSAOEffect,
  TextureEffect,
  KawaseBlurPass,
  SavePass,
  DepthOfFieldEffect,
  DepthPass,
  // Resolution,
  DepthEffect,
  // VignetteEffect，
  ToneMappingMode,
  ShaderPass,
} from "postprocessing";
import { FloatType } from "three";
import { Mesh, Object3D, Vector4, Color, Vector2, ShaderMaterial } from "three";
import UnrealBloomPass from "../webgl/postProcessing/UnrealBloomPass";

export default function usePostprocessing(scene, renderer, camera) {
  const composer = new EffectComposer(renderer, {
    multisampling: 0,
    type: FloatType,
  });
  composer.addPass(new RenderPass(scene, camera));

  const resolution = new Vector2();
  renderer.getSize(resolution);
  const bloomEffect = new BloomEffect({
    // blendFunction: BlendFunction.ADD,
    luminanceThreshold: 0.1,
    luminanceSmoothing: 0.01,
    intensity: 5,
    mipmapBlur: true,
  });

  const toneMappingEffect = new ToneMappingEffect({
    mode: ToneMappingMode.ACES_FILMIC,
    resolution: 1024,
    whitePoint: 16.0,
    middleGrey: 1,
    minLuminance: 0.01,
    averageLuminance: 0.01,
    adaptationRate: 1.0,
  });

  // toneMappingEffect.
  window.composer = composer;

  // mipmapBlur: !0,
  // luminanceThreshold: 0.5,
  // luminanceSmoothing: 1.3,

  // composer.addPass(new EffectPass(camera, bloomEffect));
  composer.addPass(new EffectPass(camera, toneMappingEffect));

  return composer;
}
