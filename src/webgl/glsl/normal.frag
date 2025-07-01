varying vec2 vUv;
uniform sampler2D tDiffuse;
float scale = 1.0;
      // 传入当前片元的UV坐标、灰度高度、以及高度缩放参数，输出法线
vec4 computeNormalFromHeightMap(sampler2D heightMap, vec2 uv, float heightScale) {
    vec2 texelSize = 1.0 / vec2(textureSize(heightMap, 0));

    float hL = texture(heightMap, uv - vec2(texelSize.x, 0.0)).r * heightScale;
    float hR = texture(heightMap, uv + vec2(texelSize.x, 0.0)).r * heightScale;
    float hT = texture(heightMap, uv + vec2(0.0, texelSize.y)).r * heightScale;
    float hB = texture(heightMap, uv - vec2(0.0, texelSize.y)).r * heightScale;

    // X 向右是 +1，Y 向下是 +1
    vec3 normal = normalize(vec3(hL - hR, hB - hT, 2.0));
    return vec4(normal * 0.5 + 0.5, 1.0);
}

void main() {
    vec4 color = computeNormalFromHeightMap(tDiffuse, vUv, scale);
    gl_FragColor = color;
}
,