uniform sampler2D depthMap;
varying vec2 vUv;

float depthScale = 0.5;
float lod = 1.0;

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

void main (){
   vec3 normal = computeNormalFromDepth(depthMap, vUv);
   gl_FragColor = vec4(normal, 1.0);
}