precision mediump float;

uniform sampler2D tDiffuse;  // 边缘图（黑白图）
uniform vec2 resolution;     // = 1.0 / resolution.xy
uniform float u_size;
uniform float uContrast;

varying vec2 vUv;
float contrast(float x, float k) {
        // x: 原始亮度值（0~1），k: 强度（建议 5~15）
    return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}

void main() {
    float maxVal = 0.0;

    vec2 texelSize = u_size / resolution.xy;

          // 3x3 邻域最大值（模拟膨胀）
    for(int dx = -1; dx <= 1; dx++) {
        for(int dy = -1; dy <= 1; dy++) {
            vec2 offset = vec2(float(dx), float(dy)) * texelSize;
            float sampleVal = texture2D(tDiffuse, vUv + offset).r;
            maxVal = max(maxVal, sampleVal);
        }
    }

    float g = maxVal;
    g = clamp((g - 0.1) / (0.9 - 0.1), 0.0, 1.0);  // 将 0.1~0.9 映射到 0~1
    g = contrast(g, uContrast);  // k 越大，对比越强（推荐 8~12）

    gl_FragColor = vec4(vec3(maxVal), 1.0);  // 白 = 膨胀区域
}