import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 1000,
    debugTexture: false,
    isLocal: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    // 是否使用人脸识别
    useFaceDetection: true,
    isUseHalf: false,
    isFaceReady: false,
  }),
});
