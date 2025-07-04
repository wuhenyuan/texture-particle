uniform sampler2D tFaceTexture;
uniform sampler2D tBackground;
varying vec2 vUv;

// 【关键参数】混合的像素半径。
// 例如: 1 = 3x3区域混合, 2 = 5x5区域混合, 3 = 7x7区域混合
uniform int uBlendRange; 

// 纹理一个像素的大小，由CPU传入 (vec2(1.0/textureWidth, 1.0/textureHeight))
uniform vec2 uResolution;

void main() {
    vec2 tex = 1.0 / uResolution;
    // 采样背景和原始人物颜色
    vec4 backgroundColor = texture(tBackground, vUv);
    vec4 faceColor = texture(tFaceTexture, vUv);

    // vec4 finalColor = vec4(vec3(max(backgroundColor.rgb, faceColor.rgb)), 1.0);

    // finalColor.rgb = color;

    vec3 finalColor = faceColor.rgb + backgroundColor.rgb * (1.0 - faceColor.a);
    gl_FragColor = vec4(finalColor, 1.0);
}