attribute float alpha;
varying float vAlpha;
varying vec2 vUv;

void main() {
    vUv = uv;
    vAlpha = alpha;
    gl_Position = vec4(position.xy * 2.0, position.z, 1.0);
}