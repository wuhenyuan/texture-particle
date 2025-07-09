import { defineStore } from "pinia";
import { Vector4, Mesh } from "three";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 2000,
    debugTexture: false,
    particleVisible: false,
    isLocal: true,
    isUseAsr: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
    // 是否使用人脸识别
    useFaceDetection: true,
    isUseHalf: false,
    isFaceReady: false,
    isFaceLamkmardUpdate: false,
    helperLineVisible: false,
    helperMeshVisible: false,
    helperPointVisible: false,
    globalDepthTextureUrl: "/src/assets/jialuoDepth2.png",
    cameraPosition: [0, 0, 177],
    // cameraPosition: [0, 0, 1063],

    faceGeometry: null,
    isUseGlobalDepth: true,
    isRenderDepth: false,
    eyeBall: new Vector4(),
    drawFaceDetection: false,

    faceAera: new Vector4(),
    particleNumber: 300,
    digitalMesh: new Mesh(),
  }),
});
