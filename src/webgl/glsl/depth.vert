varying vec2 vUv;

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

void main() {
    vUv = uv;
    vec2 position2 = position.xy * 2.0;
    float z = position.z;
    float remapped = remap(z, -0.2, 0.1, -1.0, 1.0);
    gl_Position = vec4(position2.xy, remapped, 1.0);
}