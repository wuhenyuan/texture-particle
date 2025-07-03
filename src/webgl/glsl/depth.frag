
       // 片元着色器 fragment.glsl

// uniform float gDMax;
// uniform float gDMin;
uniform float dMax;
uniform float dMin;

varying vec2 vUv;
// 用于归一化和映射
float remapDepth(float v, float oldMin, float oldMax, float newMin, float newMax) {
    float t = (v - oldMin) / (oldMax - oldMin);
    return newMin + t * (newMax - newMin);
}
void main() {
    float gDMax = 1.0;
    float gDMin = 0.0;
    float depth = gl_FragCoord.z; // 0 ~ 1, 非线性深度
    float dMin01 = (dMin * 0.5) + 0.5;
    float dMax01 = (dMax * 0.5) + 0.5;
    float fineDepthNorm = (depth - dMin01) / (dMax - dMax01); // 归一化到0~1
    float fineDepthMapped = gDMin + fineDepthNorm * (gDMax - gDMin); // 映射到全脸深度范围

    gl_FragColor = vec4(vec3(1.0 - fineDepthMapped), 1.0); // 显示为灰度
}
