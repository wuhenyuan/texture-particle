uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
    gl_FragColor = texture2D(tDiffuse, vUv, 16.0);  // ✅ 直接复制颜色
}