float debug;
#define debug(x) fragColor = vec4(vec3(x),1.0); return; 

float debugA;
#define debugA(x,a) fragColor = vec4(vec3(x),a); return;

#define debug_(x,y) vec3 y = vec3(x)

#define v3 vec3

float blurScale = 2.0;

const float GAUSSIAN_WEIGHTS[5] = float[](0.227027, // 中心权重
0.1945946, 0.1216216, 0.054054, 0.016216);

// vec4 horizontalBlur(sampler2D u_texture, vec2 texCoords) {

//     vec4 sumColor = texture(u_texture, texCoords) * GAUSSIAN_WEIGHTS[0]; // 中心像素
//     vec2 u_texelSize = 1.0 / vec2(iResolution.xy) * blurScale;

//     for (int i = 1; i < 5; ++i) {
//         sumColor += texture(u_texture, texCoords - vec2(u_texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
//         sumColor += texture(u_texture, texCoords + vec2(u_texelSize.x * float(i), 0.0)) * GAUSSIAN_WEIGHTS[i];
//     }
//     return sumColor;
// }

// vec4 verticalBlur(sampler2D u_texture, vec2 texCoords) {
//     vec4 sumColor = texture(u_texture, texCoords) * GAUSSIAN_WEIGHTS[0]; // 中心像素
//     vec2 u_texelSize = 1.0 / vec2(iResolution.xy) * blurScale;

//     for (int i = 1; i < 5; ++i) {
//         sumColor += texture(u_texture, texCoords - vec2(0.0, u_texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
//         sumColor += texture(u_texture, texCoords + vec2(0.0, u_texelSize.y * float(i))) * GAUSSIAN_WEIGHTS[i];
//     }
//     return sumColor;
// }

// vec4 hvBlur(sampler2D u_texture, vec2 texCoords) {
//     vec4 hBlur = horizontalBlur(u_texture, texCoords);
//     vec4 vBlur = verticalBlur(u_texture, texCoords);
//     return (hBlur + vBlur) / 2.0;
// }


vec3 computeNormalFromDepth(
    sampler2D depthMap,
    vec2 uv
) {
    float depthScale = 0.5;
    float lod = 4.;
    vec2 texelSize = 1.0 / vec2(textureSize(depthMap, int(lod)));

    float depthCenter = texture2D(depthMap, uv, lod).r;

    // 邻域像素的深度值
    float depthRight = texture2D(depthMap, uv + vec2(texelSize.x, 0.0), lod).r;
    float depthUp = texture2D(depthMap, uv + vec2(0.0, texelSize.y), lod).r;
    // 构建两个方向的切线向量（右和上）
    vec3 pCenter = vec3(uv, depthCenter * depthScale);
    vec3 pRight = vec3(uv + vec2(texelSize.x, 0.0), depthRight * depthScale);
    vec3 pUp = vec3(uv + vec2(0.0, texelSize.y), depthUp * depthScale);

    // 计算法线向量（叉乘）
    vec3 normal = normalize(cross(pRight - pCenter, pUp - pCenter));
    return normal;
}