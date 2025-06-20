precision highp float;

// uniform sampler2D uColorMap;      // 原图或上色图
uniform sampler2D uProbabilityMap; // 概率图（灰度，采样密度）
uniform sampler2D uMaskMap;       // 可选：遮罩贴图，黑色区域剔除
uniform sampler2D uParticleMap;  //粒子贴图
uniform sampler2D uHighLightMap;  //高光贴图
uniform float uFade;              // 可选的淡出因子
uniform vec3 uParticleColor;
uniform vec3 uHighLightColor;

uniform float uTime;

vec4 LinearTosRGB(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

uniform float uSuppress; // 压制强度(>1时低亮度更低，1为线性，越大压制越狠)

varying vec2 vPUv;                // 粒子在贴图中的 UV
varying vec2 vUv;

float randomDigitIndex(vec2 seed) {
  float step = floor(uTime * 3.0); // 每0.5秒变化一次
  float s = dot(seed, vec2(12.9898, 78.233)) + step;
  return floor(fract(sin(s) * 43758.5453) * 10.0);
}

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

  // uv 计算

  float cols = 10.0;
  float rows = 1.0;

  float index = randomDigitIndex(vPUv);

  // 计算该数字位于几行几列
  float col = mod(index, cols);
  float row = floor(index / cols);

  vec2 cellSize = vec2(1.0 / cols, 1.0 / rows);
  vec2 atlasUV = vUv * cellSize + vec2(col, row) * cellSize;

  vec4 texColor = texture2D(uParticleMap, vUv);
  if(texColor.r < 0.1 || texColor.a < 0.1)
    discard;

  // --- 颜色映射 ---
  // vec3 color = texture2D(uColorMap, vPUv).rgb;
  // vec3 color = vec3(0.0);
  // vec3 color = vec3(74.0, 159.0, 212.0) / 255.0;
  vec3 color = uParticleColor;

  vec3 mask = texture2D(uMaskMap, vPUv).rgb;

  if(mask.r < 0.1)
    discard;

  // --- 透明度控制 ---
  // float alpha = pow(p, uFade) * uAlphaScale;

  // gl_FragColor = vec4(color, 1.0);
  gl_FragColor = vec4(color * texColor.r * mask.r, texColor.r);
  gl_FragColor = LinearTosRGB(gl_FragColor);
}
