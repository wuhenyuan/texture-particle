uniform sampler2D blurMap; // blur
uniform sampler2D maskMap; // mask
uniform sampler2D normalMap; // depth
uniform sampler2D colorMap; // color
// uniform sampler2D bgMap; // bg

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 edgeColor;
uniform vec3 outEdgeColor;
uniform float depthScale;
uniform float lod;
uniform float bias;
uniform float scale;
uniform float power;
uniform float normalThreshold;

uniform vec4 eyeBall;
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

    vec2 aspect = vec2(iResolution.x / iResolution.y, iResolution.y / iResolution.x); // 水平方向可能被压缩或拉伸
    // vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0); // 水平方向可能被压缩或拉伸

    vec2 uvNorm = uv * aspect;
    vec2 eyePosNorm = eyePos * aspect;

    float dist = distance(eyePosNorm, uvNorm);
    // float dist = distance(eyePos, uv);
    return pow(smoothstep(0.03, 0.00, dist), 2.);
}
float drawEye2(vec2 uv) {
    return drawEye(eyeBall.xy, uv) + drawEye(eyeBall.zw, uv);
}

float getFresnel(vec3 normal, vec3 viewDir, float bias, float scale, float power) {
    float fresnel = bias + scale * pow(1.0 - dot(normalize(normal), normalize(viewDir)), power);
    return clamp(fresnel, 0.0, 1.0);
}

void main() {
    vec2 uv = vUv;

    vec4 normalColor = textureLod(normalMap, uv, lod).rgba;
    // vec4 normalColor = texture2D(normalMap, uv).rgba;
    vec3 normal = normalColor.rgb * 2.0 - 1.0;
    normal *= normalColor.a;
    float dot2 = dot(normalize(normal), normalize(vec3(0., 0., 1.0)));
    if(abs(dot2) < normalThreshold)
        return;
    // vec3 bgColor = texture2D(bgMap, uv).rgb;
    vec3 bgColor = vec3(0.);
    float blur = texture2D(blurMap, uv).x;
    float mask2 = hvBlur(maskMap, uv).x;
    // normal.z = normal.z * depthScale;
    // normal = normalize(normal);

    vec3 outEdge = blur * (1.0 - mask2) * outEdgeColor * 2.0;
   // float frenel = (1.0 - dot(normal, normalize(vec3(0.0, 0.0, 1.0)))) ;
   // frenel = pow(clamp(frenel, 0.0, 1.0), 20.0);
  // frenel *= mask2;
    // float fresnelRaw = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
    // float frenel = smoothstep(0.3, 0.9, fresnelRaw); // 控制从哪个角度开始变亮
    // frenel = pow(frenel, 0.8); // 再强化边缘
    // frenel *= mask2;
    float frenel = getFresnel(normal, vec3(0., 0., 1.), bias, scale, power);
    float light = dot(normal, normalize(vec3(4.0, 0.0, 1.0))) * mask2;

  //  frenel = pow(frenel, 0.2);
    //frenel = smoothstep(0.1, 1.5, frenel);
    vec3 frenelColor = frenel * edgeColor * 4.0;
    float maskY = pow(uv.y, 0.8);

    vec3 finalColor = drawEye2(uv) * edgeColor + edgeColor * light * 0.3 + frenelColor * maskY + outEdge + bgColor * (1.0 - mask2);
    gl_FragColor = vec4(finalColor, normalColor.a);
}
