import { defineStore } from "pinia";

export const useGlobalConfig = defineStore("app", {
  state: () => ({
    maxWidth: 100,
    debugTexture: true,
    isLocal: true,
    faceDepthMin: 0,
    faceDepthMax: 0,
  }),
});
