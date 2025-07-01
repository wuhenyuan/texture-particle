import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 100,
    debugTexture: false,
    isLocal: false,
    faceDepthMin: 0,
    faceDepthMax: 0,
  }),
});
