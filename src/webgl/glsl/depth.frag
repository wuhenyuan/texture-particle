
       // 片元着色器 fragment.glsl
varying vec2 vUv;

void main() {
    float depth = gl_FragCoord.z; // 0 ~ 1, 非线性深度
    gl_FragColor = vec4(vec3(depth), 1.0); // 显示为灰度
}
