precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 iResolution;      // 1.0 / textureHeight
uniform float uRadius;
varying vec2 vUv;

void main() {
    float sigma = uRadius * 0.5;
    vec3 sum = vec3(0.0);
    float totalWeight = 0.0;

    const int maxSamples = 40;
    for(int i = -maxSamples; i <= maxSamples; i++) {
        float y = float(i);
        float weight = exp(-0.5 * (y * y) / (sigma * sigma));
        vec2 offset = vec2(0.0, y * iResolution.y);
        vec3 texel = texture2D(tDiffuse, vUv + offset).rgb;
        sum += texel * weight;
        totalWeight += weight;
    }

    gl_FragColor = vec4(sum / totalWeight, 1.0);
}
