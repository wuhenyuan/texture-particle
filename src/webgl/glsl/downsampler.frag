// fragment.glsl
uniform sampler2D uTexture;
uniform vec2 uTexelSize; // 1.0 / prevResolution
varying vec2 vUv;

void main() {
    vec2 txl = 1.0 / uTexelSize;
    vec3 c00 = texture2D(uTexture, vUv + vec2(-0.5, -0.5) * txl).rgb;
    vec3 c10 = texture2D(uTexture, vUv + vec2(0.5, -0.5) * txl).rgb;
    vec3 c01 = texture2D(uTexture, vUv + vec2(-0.5, 0.5) * txl).rgb;
    vec3 c11 = texture2D(uTexture, vUv + vec2(0.5, 0.5) * txl).rgb;
    // vec3 cc = texture2D(uTexture, vUv).rgb;

    vec3 avg = max(max(c00, c10), max(c01, c11)); // 👈 取最大值
    // vec3 avg = (c00 + c10 + c01 + c11) * 0.25;
    gl_FragColor = vec4(vec3(avg), 1.0);
    // gl_FragColor = texture2D(uTexture, vUv);
}
