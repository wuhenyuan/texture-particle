const fragShader = /*glsl*/ `

// Basic sobel filter implementation
// Jeroen Baert - jeroen.baert@cs.kuleuven.be
// 
// www.forceflow.be


// Use these parameters to fiddle with settings
float step = 1.0;

varying vec2 vUv;
uniform sampler2D tdiff;


void main() {
    vec4 color =  texture(tdiff, vUv);
    float gray = length(color.rgb);
    fragColor = vec4(vec3(step(0.06, length(vec2(dFdx(gray), dFdy(gray))))), 1.0);
}
`;

export const edgeDetection = {
  uniforms: {
    tdiff: { type: "t", value: null },
  },
  vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,

  fragmentShader: fragShader,
};
