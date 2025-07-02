import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 100,
    debugTexture: false,
    isLocal: true,
    faceDepthMin: 0,
    faceDepthMax: 0,
    // 是否使用人脸识别
    useFaceDetection: false,
    isUseHalf: false,
    isFaceReady: false,
  }),
});
