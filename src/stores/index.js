import { defineStore } from "pinia";
import { Vector4, Mesh, Texture } from "three";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    debugTexture: false,
    showDigital: false,
    particleVisible: true,
    isLocal: true,
    isUseAsr: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    maxWidth: 500,
    maxParticleWidth: 200,
    widthScale: 1,
    useLocalPicture: false,
    // 是否使用人脸识别
    useFaceDetection: true,
    isUseHalf: false,
    isFaceReady: false,
    isFaceLamkmardUpdate: false,
    isUsePostProcessing: true,
    drawFaceDetection: true,
    helperLineVisible: false,
    helperMeshVisible: false,
    helperPointVisible: false,
    globalDepthTextureUrl: "/src/assets/deep2.png",
    globalDepthLocal: "/src/assets/jialuoDepth2.png",
    cameraPosition: [0, 0, 160],
    // cameraPosition: [0, 0, 1063],

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
      offset: 0.2,
      bias: -1,
      scale: 5,
      power: 5,
      normalThreshold: 0.0,
      rainColor: 0x5959cf,
      eyeColor: 0xcbff,
      strength: 1.25,
      // strength: 3.34,
      radius: 0.5,
      threshold: 0.06,
      size: 1.5,
      minSize: 0.6,
      eyeIntensity: 0,
    },
    // lutParticle config
    // config: {
    // },
    depthPictureBitmap: null,
  }),
});
