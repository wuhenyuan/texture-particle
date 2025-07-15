import { defineStore } from "pinia";
import { Vector4, Mesh } from "three";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    debugTexture: false,
    showDigital: false,
    particleVisible: false,
    isLocal: true,
    isUseAsr: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    maxWidth: 150,
    widthScale: 1,
    // 是否使用人脸识别
    useFaceDetection: true,
    isUseHalf: false,
    isFaceReady: false,
    isFaceLamkmardUpdate: false,
    isUsePostProcessing: false,
    drawFaceDetection: false,
    helperLineVisible: false,
    helperMeshVisible: false,
    helperPointVisible: false,
    globalDepthTextureUrl: "/src/assets/deep2.png",
    globalDepthLocal: "/src/assets/jialuoDepth2.png",
    cameraPosition: [0, 0, 230],
    // cameraPosition: [0, 0, 1063],

    faceGeometry: null,
    isUseGlobalDepth: true,
    isRenderDepth: false,
    eyeBall: new Vector4(),

    faceAera: new Vector4(),
    particleNumber: 300,
    digitalMesh: new Mesh(),
    hasFaceInfo: false,

    maps: {},
    // tenology config
    // config: {
    //   // tolerance: 0.4,
    //   // feathering: 0.2,
    //   tolerance: 0.21,
    //   feathering: 0.15,
    //   depthScale: 1.5,
    //   lod: 3.0,
    //   edgeColor: 0x6363d2,
    //   keyColor: 0x5959cf,
    //   offset: 0.2,
    //   bias: -1,
    //   scale: 5,
    //   power: 5,
    //   normalThreshold: 0.0,
    //   rainColor: 0x5959cf,
    //   eyeColor: 0xcbff,
    //   strength: 0,
    //   // strength: 3.34,
    //   radius: 0.99,
    //   threshold: 0.01,
    // },
    // lutParticle config
    config: {
      size: 0.75,
    },
    depthPictureBitmap: null,
  }),
});
