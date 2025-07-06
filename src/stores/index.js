import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 2000,
    debugTexture: true,
    particleVisible: false,
    isLocal: true,
    isUseAsr: true,
    faceDepthMin: 0,
    faceDepthMax: 0,
    // 是否使用人脸识别
    useFaceDetection: false,
    isUseHalf: false,
    isFaceReady: false,
    isFaceLamkmardUpdate: false,
    helperLineVisible: false,
    helperMeshVisible: false,
    helperPointVisible: false,
    globalDepthTextureUrl: "/src/assets/jialuoDepth2.png",
    cameraPosition: [1.8, 2.4, 398],
  }),
});
