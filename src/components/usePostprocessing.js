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

  const bloomComposer = new EffectComposer(renderer);
  const getBloomBloomPassMaterial = () => {
    const fragmentShader = /*glsl*/ `
    uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;

        varying vec2 vUv;

        void main() {
          gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
        }`;

    return new ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.inputBuffer.texture },
      },
      vertexShader: `varying vec2 vUv;
        void main() {

          vUv = uv;

          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }`,
      fragmentShader,
      defines: {},
    });
  };

  let baseBloomPass;

  const addSelectBloomEffect = (opts) => {
    baseBloomPass = new UnrealBloomPass(scene, camera, {
      resolution,
      strength: opts.strength,
      radius: opts.radius,
      threshold: opts.threshold,
    });
    bloomComposer.autoRenderToScreen = false;
    const renderPass = new RenderPass(scene, camera);
    bloomComposer.addPass(renderPass);
    bloomComposer.addPass(baseBloomPass);
    bloomComposer.renderToScreen = false;
    // this.isAlpha = false;
    const bloomPass = new ShaderPass(
      getBloomBloomPassMaterial(),
      "baseTexture"
    );
    composer.addPass(bloomPass);
  };

  addSelectBloomEffect({
    strength: 7.8,
    radius: 0.87,
    threshold: 0.27,
  });

  const updatePostprocessing = (config) => {
    baseBloomPass.strength = config.strength;
    baseBloomPass.radius = config.radius;
    baseBloomPass.threshold = config.threshold;
  };

  composer.updatePostprocessing = updatePostprocessing;

  composer.addPass(new EffectPass(camera, toneMappingEffect));

  return {
    bloomComposer,
    composer,
  };
}
