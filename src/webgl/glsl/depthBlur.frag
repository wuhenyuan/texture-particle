uniform sampler2D tDiffuse;
uniform vec2 uResolution;
// uniform float blurScale;
varying vec2 vUv;

const float blurScale = 0.2;
const float GAUSSIAN_WEIGHTS[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

vec4 horizontalBlur(sampler2D tex, vec2 uv) {
    vec4 sumColor = texture2D(tex, uv) * GAUSSIAN_WEIGHTS[0];
    vec2 texelSize = blurScale / uResolution;
    for(int i = 1; i < 5; ++i) {
        sumColor += texture2D(tex, uv - vec2(texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
        sumColor += texture2D(tex, uv + vec2(texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
    }
    return sumColor;
}

vec4 verticalBlur(sampler2D tex, vec2 uv) {
    vec4 sumColor = texture2D(tex, uv) * GAUSSIAN_WEIGHTS[0];
    vec2 texelSize = blurScale / uResolution;
    for(int i = 1; i < 5; ++i) {
        sumColor += texture2D(tex, uv - vec2(0.0, texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
        sumColor += texture2D(tex, uv + vec2(0.0, texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
    }
    return sumColor;
}

void main() {
      // 你可以选择只用horizontalBlur或verticalBlur，或者两次pass
      // 这里只做了一次，两步一起
    vec4 hBlur = horizontalBlur(tDiffuse, vUv);
    vec4 vBlur = verticalBlur(tDiffuse, vUv);
    gl_FragColor = (hBlur + vBlur) / 2.0;
}