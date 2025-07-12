uniform sampler2D blurMap; // blur
uniform sampler2D maskMap; // mask
uniform sampler2D depthMap; // depth
uniform sampler2D colorMap; // color
uniform sampler2D bgMap; // bg

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 edgeColor;
uniform vec3 outEdgeColor;
uniform vec3 eyeColor;
uniform float depthScale;
uniform float lod;

varying vec2 vUv;

float blurScale = 2.0;

const float GAUSSIAN_WEIGHTS[5] = float[](0.227027, // 中心权重
0.1945946, 0.1216216, 0.054054, 0.016216);

vec4 horizontalBlur(sampler2D u_texture, vec2 texCoords) {

    vec4 sumColor = texture(u_texture, texCoords) * GAUSSIAN_WEIGHTS[0]; // 中心像素
    vec2 u_texelSize = 1.0 / vec2(iResolution.xy) * blurScale;

    for(int i = 1; i < 5; ++i) {
        sumColor += texture(u_texture, texCoords - vec2(u_texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
        sumColor += texture(u_texture, texCoords + vec2(u_texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
    }
    return sumColor;
}

vec4 verticalBlur(sampler2D u_texture, vec2 texCoords) {
    vec4 sumColor = texture(u_texture, texCoords) * GAUSSIAN_WEIGHTS[0]; // 中心像素
    vec2 u_texelSize = 1.0 / vec2(iResolution.xy) * blurScale;

    for(int i = 1; i < 5; ++i) {
        sumColor += texture(u_texture, texCoords - vec2(0.0, u_texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
        sumColor += texture(u_texture, texCoords + vec2(0.0, u_texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
    }
    return sumColor;
}

vec4 hvBlur(sampler2D u_texture, vec2 texCoords) {
    vec4 hBlur = horizontalBlur(u_texture, texCoords);
    vec4 vBlur = verticalBlur(u_texture, texCoords);
    return (hBlur + vBlur) / 2.0;
}

vec2 eye1 = vec2(0.33, 0.5);
vec2 eye2 = vec2(0.58, 0.5);

float drawEye(vec2 eyePos, vec2 uv) {
    float dist = distance(eyePos, uv);
    return pow(smoothstep(0.02, 0.00, dist), 2.);
}
float drawEye2(vec2 uv) {
    return drawEye(eye1, uv) + drawEye(eye2, uv);
}

// 计算法线
vec3 computeNormalFromDepth(
    sampler2D depthMap,
    vec2 uv
) {

    vec2 texelSize = 1.0 / vec2(textureSize(depthMap, int(lod)));
    float texLod = lod;
    float depthCenter = texture(depthMap, uv, texLod).r;

    // 邻域像素的深度值
    float depthRight = texture(depthMap, uv + vec2(texelSize.x, 0.0), texLod).r;
    float depthUp = texture(depthMap, uv + vec2(0.0, texelSize.y), texLod).r;
    // 构建两个方向的切线向量（右和上）
    vec3 pCenter = vec3(uv, depthCenter * depthScale);
    vec3 pRight = vec3(uv + vec2(texelSize.x, 0.0), depthRight * depthScale);
    vec3 pUp = vec3(uv + vec2(0.0, texelSize.y), depthUp * depthScale);

    // 计算法线向量（叉乘）
    vec3 normal = normalize(cross(pRight - pCenter, pUp - pCenter));
    return normal;
}
void main() {
    vec2 uv = vUv;
    vec3 bgColor = texture2D(bgMap, uv).rgb;
    float blur = texture2D(blurMap, uv).x;
    float mask = texture2D(maskMap, uv).a;
    float mask2 = hvBlur(maskMap, uv).x;

    vec3 normal = computeNormalFromDepth(depthMap, uv);

    vec3 outEdge = blur * (1.0 - mask2) * outEdgeColor * 2.0;
    float frenel = (1.0 - dot(normal, normalize(vec3(0.0, 0.0, 1.0)))) * mask2;
    float light = dot(normal, normalize(vec3(4.0, 0.0, 1.0)));

    frenel = smoothstep(0.1, 1.5, frenel);
    vec3 frenelColor = frenel * edgeColor * 4.0;
    float maskY = pow(uv.y, 0.8);

    vec3 finalColor = drawEye2(uv) * eyeColor + edgeColor * light * 0.2 + frenelColor * maskY + outEdge + bgColor * (1.0 - mask2);
    // gl_FragColor = vec4(finalColor, 1.0);
    gl_FragColor = vec4(finalColor, mask);
}
