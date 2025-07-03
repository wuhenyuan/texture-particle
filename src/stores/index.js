import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 200,
    debugTexture: false,
    isLocal: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    // 是否使用人脸识别
    useFaceDetection: false,
    isUseHalf: false,
    isFaceReady: false,
    cameraPosition: [
      -12.093478419045327, 9.202700434049177e-15, 149.80415147542809,
    ],
  }),
});
