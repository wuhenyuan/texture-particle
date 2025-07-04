import fragShader from "./glsl/edgeDetection.frag";
// import fragShader from "./glsl/edgeDetection3.frag";
// import fragShader from "./glsl/edgeDetectionFilter.frag";

export const edgeDetection = {
  name: "edgeDetection",
  uniforms: {
    tDiffuse: { type: "t", value: null },
    iResolution: { type: "v2", value: null },
    iChannelResolution: { value: null },
    uContrast: { value: null },
  },
  vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position =  vec4(position, 1.0);
    }`,
  fragmentShader: fragShader,
};
