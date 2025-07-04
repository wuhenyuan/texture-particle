uniform sampler2D tFaceTexture;
uniform sampler2D;
uniform sampler2D tEdge;
uniform sampler2D tMask;
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
    float edgeMask = texture(tEdge, vUv).r;
    float mask = texture(tMask, vUv).r;

    // edge 超出mask
    if(mask <= .0 || faceColor.r <= .0) {

        gl_FragColor = backgroundColor;
        return;
    }

    if(edgeMask <= 0.1) {
        gl_FragColor = vec4(1.0);
        if(faceColor.r <= .0) {
            gl_FragColor = backgroundColor;
        } else {
            gl_FragColor = faceColor;
        }
        return;
    }

    // 注意：这里去掉了 a >= 1.0 的判断，因为即使在不透明区域内部，
    // 我们也需要计算，以便为边缘的像素提供正确的模糊源。

    // --- 开始多像素Alpha模糊计算 ---
    float sampleCount = 0.0;

    // 使用双重循环，遍历一个 (2*R+1)x(2*R+1) 的正方形区域
    // R 是我们的 u_blendPixelRadius
    vec3 totalColor = vec3(0.0);
    for(int x = -uBlendRange; x <= uBlendRange; x++) {
        for(int y = -uBlendRange; y <= uBlendRange; y++) {
            // 计算邻居像素的纹理坐标
            vec2 offsetCoord = vUv + vec2(x, y) * tex;

            // 采样该点的Alpha值并累加
            totalColor += texture(tFaceTexture, offsetCoord).rgb;
            totalColor += texture(tBackground, offsetCoord).rgb;
            sampleCount++;
        }
    }

    vec3 avColor = totalColor / sampleCount / 2.0;
    // --- 最终融合 ---
    // 使用这个跨越了多个像素的、平滑的 blurredAlpha 来进行最终混合
    // 这将创造一个非常柔和的边缘过渡
    vec4 finalColor = vec4(avColor, 1.0);

    gl_FragColor = finalColor;
}