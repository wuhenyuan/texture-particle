

#define USE_DIGIt false
#define USE_PARTICLEMAP false
#define USE_FRENEL true
#define DEPTH_SCALE 1.0
#define debug(x) gl_FragColor = vec4(vec3(x),1.0); return; 
precision highp float;

// uniform sampler2D uColorMap;      // 原图或上色图
uniform sampler2D uProbabilityMap; // 概率图（灰度，采样密度）
uniform sampler2D uMaskMap;       // 可选：遮罩贴图，黑色区域剔除
uniform sampler2D uParticleMap;  //粒子贴图
uniform sampler2D uHparticleMap; //高光粒子贴图
uniform sampler2D uHighLightMap;  //高光贴图
uniform sampler2D uDepthTexture;
uniform sampler2D uNormalTexture;

uniform float lightIntensity;
uniform vec2 uTextureSize;
uniform float uFade;              // 可选的淡出因子
uniform vec3 uParticleColor;
uniform vec3 uHighLightColor;

uniform float uTime;
uniform float uSuppress; // 压制强度(>1时低亮度更低，1为线性，越大压制越狠)

varying vec2 vPUv;                // 粒子在贴图中的 UV
varying vec2 vUv;

vec3 computeNormalFromDepth(sampler2D depthMap, vec2 uv, vec2 resolution, float depthScale) {
  vec2 texelSize = 1.0 / resolution;

  float depthCenter = texture(depthMap, uv).r;
  float depthRight = texture(depthMap, uv + vec2(texelSize.x, 0.0)).r;
  float depthUp = texture(depthMap, uv + vec2(0.0, texelSize.y)).r;

  vec3 pCenter = vec3(uv, depthCenter * depthScale);
  vec3 pRight = vec3(uv + vec2(texelSize.x, 0.0), depthRight * depthScale);
  vec3 pUp = vec3(uv + vec2(0.0, texelSize.y), depthUp * depthScale);

  vec3 normal = normalize(cross(pRight - pCenter, pUp - pCenter));
  return normal;
}

float randomDigitIndex(vec2 seed) {
  float step = floor(uTime * 3.0); // 每0.5秒变化一次
  float s = dot(seed, vec2(12.9898, 78.233)) + step;
  return floor(fract(sin(s) * 43758.5453) * 10.0);
}

vec3 LightDriction = vec3(1.0, 0.0, 0.2);
vec3 DefaultLight = vec3(0.0, 0.0, 1.0);

void main() {
  // --- 获取概率 ---
  // float p = texture2D(uProbabilityMap, vPUv).r;

  // float distanceToCenter = distance(vUv, vec2(0.5));
  // if(distanceToCenter > 0.5)
    // discard;
  vec3 g = texture2D(uProbabilityMap, vPUv).rgb;
  // float prob = pow(g, uSuppress); // g^uSuppress 低亮度更低概率
  float prob = g.r;
 // 生成随机数
  // float rand = fract(sin(dot(vPUv, vec2(12.9898, 78.233))) * 43758.5453);

  // --- 采样判定：如果不满足概率阈值，剔除粒子 ---
  // if(rand > prob)
    // discard;
  if(prob == 0.0)
    discard;

  // 使用字符贴图就需计算uv
  if(USE_DIGIt) {

    float cols = 1.0;
    float rows = 1.0;

    float index = randomDigitIndex(vPUv);

  // 计算该数字位于几行几列
    float col = mod(index, cols);
    float row = floor(index / cols);

    vec2 cellSize = vec2(1.0 / cols, 1.0 / rows);
    vec2 atlasUV = vUv * cellSize + vec2(col, row) * cellSize;
    // vUv = atlasUV;
  }

  vec4 texColor1 = texture2D(uParticleMap, vUv);

  vec4 texColor2 = texture2D(uHparticleMap, vUv);
  float useHighColor = dot(texture2D(uHighLightMap, vPUv).rgb, vec3(0.299, 0.587, 0.114));
  float hightRatio = useHighColor > 0.05 ? 1.0 : 0.0;

  if(USE_PARTICLEMAP) {
    if(texColor1.r < 0.1 || texColor1.a < 0.1)
      discard;
    if(hightRatio == 0.0) {
      if(texColor1.r < 0.1 || texColor1.a < 0.1)
        discard;
    } else {

      if(texColor2.r < 0.1 || texColor2.a < 0.1)
        discard;
    }
  }

  // vec4 texColor = mix(texColor2, texColor1, hightRatio);
  vec4 texColor = texColor1;

  // --- 颜色映射 ---
  // vec3 color = texture2D(uColorMap, vPUv).rgb;
  // vec3 color = vec3(0.0);
  // vec3 color = vec3(74.0, 159.0, 212.0) / 255.0;
  vec3 color = uParticleColor;

  vec3 mask = texture2D(uMaskMap, vPUv).rgb;

  // if(mask.r < 0.05)
  //   discard;

  float frenel = 1.0;
  float angle = 1.0;
  float light = 1.0;
  float mask2 = 1.0;
  if(USE_FRENEL) {
    vec3 n = computeNormalFromDepth(uDepthTexture, vPUv, uTextureSize, DEPTH_SCALE);
    angle = dot(n, normalize(DefaultLight));
    frenel = (1. - angle) * mask2;
    light = dot(n, normalize(LightDriction)) * mask2;
    frenel = smoothstep(0.2, 2.5, frenel) + 0.15;
  }

  vec2 uv = vPUv;
  // debug(uv.xyy);
  vec3 frenelColor = frenel * uHighLightColor * 4.0;
  // debug(frenel);
  float maskY = pow(uv.y, 0.8);
  float lenMask = 1.0 - distance(uv, vec2(0.5, 0.5));
  // lenMask = pow(lenMask, .8);
  lenMask = 1.0;

  vec3 lightColor = (frenelColor * maskY) * lenMask;

  vec3 finalColor = lightColor;
  finalColor = mix(lightColor, uParticleColor, smoothstep(0.2, 0.7, angle)) + vec3(lightIntensity) * smoothstep(0.3, 1.0, light);
  // --- 透明度控制 ---
  // float alpha = pow(p, uFade) * uAlphaScale;

  // vec4 finalColor = mix(vec4(color, 1.0), vec4(uHighLightColor, 1.0), step(0.5, hightRatio));

  // vec4 finalColor = mix(vec4(color * texColor.r * mask.r, texColor.r), vec4(0.25, .5, 1.0, 1.0), useHighColor);
  // finalColor.a = mix(0.6, 1.0, );
  // finalColor.rgb * texColor.r;
  // finalColor.a = 0.8;
  // finalColor.rgb += brightness * uHighLightColor;
  gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
