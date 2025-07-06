uniform sampler2D tDiffuse;
// uniform vec3 keyColor;

// vec3 keyColor = vec3(76.0 / 255.0, 150.0 / 255.0, 29.0 / 255.0);
vec3 keyColor = vec3(0.0, 1.0, 0.0);
uniform float tolerance;
uniform float feathering;
varying vec2 vUv;

float chromaKey(vec3 texColor, vec3 keyColor, float tolerance /* 0.0 - 1.0 */, float feathering /* 0.1 */) {
    float dist = distance(texColor, keyColor);
    float mask = smoothstep(tolerance - feathering, tolerance, dist);
    return mask;
}

void main() {
    // vec2 uv = fragCoord / iResolution.xy;
    vec2 uv = vUv;
    vec3 color = texture(tDiffuse, uv).rgb; // 颜色
    float mask = chromaKey(color, keyColor, tolerance, feathering);
    gl_FragColor = vec4(vec3(mask), 1.0);

}