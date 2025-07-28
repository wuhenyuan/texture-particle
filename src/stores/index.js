import { defineStore } from "pinia";
import { Vector4, Mesh, Texture } from "three";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    debugTexture: false,
    showDigital: false,
    particleVisible: true,
    isLocal: true,
    isUseAsr: false,
    isUseOrbital: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    widthScale: 1,
    useLocalPicture: false,
    // 是否使用人脸识别
    useFaceDetection: true,
    isUseHalf: false,
    isUsePostProcessing: true,
    drawFaceDetection: true,
    helperLineVisible: false,
    helperMeshVisible: false,
    helperPointVisible: false,
    globalDepthTextureUrl: "/src/assets/deep2.png",
    globalDepthLocal: "/src/assets/jialuoDepth2.png",
    cameraPosition: [0, 0, 160],
    // cameraPosition: [0, 0, 1063],

    // 流程状态
    needUpdateParticleSize: false,
    isFaceReady: false,
    canPlay: false,
    isFaceLamkmardUpdate: false,
    isThreeInit: false,
    needRestart: false,
    maxWidth: 500,
    maxParticleWidth: 200,

    faceGeometry: null,
    isUseGlobalDepth: true,
    isRenderDepth: false,
    eyeBall: new Vector4(),

    faceAera: new Vector4(),
    particleNumber: 300,
    digitalMesh: new Mesh(),
    hasFaceInfo: false,

    maps: {
      renderTexture: new Texture(),
      maskFaceTexture: new Texture(),
      maskHumanTexture: new Texture(),
    },
    // tenology config
    config: {
      // tolerance: 0.4,
      // feathering: 0.2,
      tolerance: 0.21,
      feathering: 0.15,
      depthScale: 1.5,
      lod: 3.0,
      edgeColor: 0x6363d2,
      keyColor: 0x5959cf,
      // 浮动粒子颜色
      pColor: 0x7bc9dc,
      // 变换颜色
      flashColor: 0xb2ff,
      particleColor: 0xffffff,
      offset: 0.2,
      bias: -1,
      scale: 5,
      power: 5,
      normalThreshold: 0.0,
      rainColor: 0x5959cf,
      eyeColor: 0xcbff,
      // strength: 1.25,
      strength: 1,
      radius: 0.5,
      threshold: 0.02,
      size: 1.5,
      minSize: 0.6,
      eyeIntensity: 0,

      // 呼吸
      uBreathStrength: 0.02,
      uBreathSpeed: 0.1,
      uJitterStrength: 0.02,
      uJitterScale: 0.02,
      uJitterSpeed: 0.1,

      // 头部微动
      uHeadMoveStrength: 0.5,
      uHeadMoveSpeed: 1,
      uHeadRotateStrength: 0.35,
    },
    // lutParticle config
    // config: {
    // },
    depthPictureBitmap: null,
  }),
});
