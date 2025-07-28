// @author brunoimbrizi / http://brunoimbrizi.com

float random2D(vec2 value) {
  return fract(sin(dot(value.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex 2D noise
//
vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

//  Simplex 3D Noise
//  by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float random(float n) {
  return fract(sin(n) * 43758.5453123);
}

float simplexNoise3d(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

    //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    // Permutations
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0 / 7.0; // N=7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_); // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

    // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

    // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float rand(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(float p) {
  float fl = floor(p);
  float fc = fract(p);
  return mix(rand(fl), rand(fl + 1.0), fc);
}

precision highp float;

attribute float pindex;
attribute vec3 offset;
attribute float angle;

uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uTexture;
uniform sampler2D maskFaceTexture;
uniform float uProgress;

uniform float minSize;
uniform float eyeIntensity;

uniform vec4 faceAera;

// 新增 uniform 变量
uniform float uBreathStrength;
uniform float uBreathSpeed;
uniform float uJitterStrength;
uniform float uJitterScale;
uniform float uJitterSpeed;

uniform float uHeadMoveStrength; // 头部平移强度
uniform float uHeadMoveSpeed;    // 头部平移速度
uniform float uHeadRotateStrength; // 头部旋转强度 (弧度)
uniform float uHeadRotateSpeed;    // 头部旋转速度
uniform float uNodActive; // 新增：控制点头效果是否激活 (0.0 或 1.0)

varying float vFlowAlpha; // 这个 varying 也要加进来！

varying vec2 vPUv;
varying vec2 vUv;
varying vec2 dTUv;

vec3 EYE_COLOR = vec3(1.0, 0., 0.);
vec3 FACE_COLOR = vec3(0., 0., 1.);
float maskEye(vec3 maskColor) {
  float diff = 1. - distance(maskColor, EYE_COLOR);
  return step(0.1, diff);
}

// 修正 maskFace 函数，使其返回二进制权重 (0.0 或 1.0)
float maskFace(vec3 maskColor, vec2 puv) {
  float diff = 1. - distance(maskColor, FACE_COLOR); // 颜色相似度

                // 计算 faceAera 的垂直中心
  float center_y_uv = (faceAera.y + faceAera.w) * 0.5;

                // yMask：如果粒子在 faceAera 垂直中心之上，则为 1.0，否则为 0.0
  float yMask = step(center_y_uv, puv.y); 

                // 结合颜色相似度和 yMask
                // 如果颜色相似度 + yMask 超过 0.1，则认为属于头部
                // 这意味着：
                // 1. 如果颜色非常匹配 (diff 接近 1.0)，即使 yMask 为 0.0 (在中心之下)，也可能通过
                // 2. 如果颜色不是特别匹配 (diff 较低)，但 yMask 为 1.0 (在中心之上)，也可能通过
  return step(0.1, diff + yMask);
}

void main() {
  vUv = uv;

  // particle uv
  vec2 puv = offset.xy / uTextureSize;
  vec2 tel = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);
  vPUv = puv;

  // pixel color
  // vec4 colA = texture2D(uTexture, puv);
  // float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;

  // displacement
  vec3 displaced = offset;

  dTUv = (offset.xy + uv) / uTextureSize;

  // float eyeMask = drawEye2(puv);
  // vec2 floatVec2 = vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * eyeMask;
  // displaced.xy += floatVec2;
  // float rndz = (random(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1))) * eyeMask;
  // displaced.z += rndz * (random(pindex) * 2.0 * uDepth);

  // center
  displaced.xy -= uTextureSize * 0.5;

  float luminal = texture2D(uTexture, puv).r;
  if(luminal <= 0.02) {
    gl_Position = vec4(5.0, 5.0, 5.0, 1.0);
    return;
  }
  float luminalScale = clamp(luminal, 0., 1.0);

  // progress noise
  float multiplier = uTextureSize.x * 2.0; // distance factor
  // float modX = mod(displaced.x, 2.0)  < 1.0 ? 1.0 : -1.0;
  // float modY = mod(displaced.y, 2.0) < 1.0 ? 1.0 : -1.0;
  // float modZ = mod(displaced.z, 2.0)   < 1.0 ? 1.0 : -1.0;

  vec3 randomDir = vec3(noise(displaced.x) * 2.0 - 1.0, noise(displaced.y) * 2.0 - 1.0, noise(200.0) * 2.0 - 1.0);
  vec3 positionTarget = displaced + normalize(randomDir) * multiplier;

  // vec3 positionTarget = vec3(noise(position.x)  * multiplier * modX, noise(position.y) * multiplier * modY, noise(position.z)  * multiplier * modZ );

  float noiseOrigin = simplexNoise3d(positionTarget);
  // 注意：这里你的原代码中是 simplexNoise3D，GLSL区分大小写，已修正为 simplexNoise3d
  float noiseTarget = simplexNoise3d(displaced);
  float noise = mix(noiseOrigin, noiseTarget, uProgress);

  float duration = 0.6;
  float delay = (1.0 - duration) * noise;
  float end = delay + duration;
  float progress = smoothstep(delay, end, uProgress);

  vec3 mixedPosition = mix(positionTarget, displaced, progress);

  // --- 新增动态效果 ---

  // 1. 呼吸效果：让整个人像粒子群在Y轴方向上轻微上下浮动
  // 使用sin函数来创建平滑的循环运动
  mixedPosition.y += sin(uTime * uBreathSpeed) * uBreathStrength;

  // 2. 局部粒子抖动：为每个粒子添加微小的、随时间变化的随机偏移
  // 使用3D Simplex噪声，确保抖动是连贯且平滑的
  // 噪声的输入基于粒子当前位置和时间，这样相邻粒子会进行类似的抖动，保持形体
  vec3 jitterNoiseCoord = mixedPosition * uJitterScale + uTime * uJitterSpeed;
  vec3 jitterOffset = (vec3(simplexNoise3d(jitterNoiseCoord),
      // 为X, Y, Z方向使用稍微不同的噪声输入，避免重复模式
  simplexNoise3d(jitterNoiseCoord + vec3(100.0, 200.0, 300.0)), simplexNoise3d(jitterNoiseCoord + vec3(400.0, 500.0, 600.0))) * 2.0 - 1.0) * uJitterStrength; // 将噪声输出从[0,1]映射到[-1,1]，再乘以强度
  mixedPosition += jitterOffset;

  // --- 效果结束 ---

  // float scale1 = sin(uTime + rand(float(gl_InstanceID)) * 351354.0);
  // float scale1 = snoise(vec2(uTime, pindex) * 0.5) * eyeMask;
  // particle size
  // float psize = uSize + scale1 * uSize * mix(2., 0.2, uProgress);

  vec3 maskColor = texture2D(maskFaceTexture, puv).rgb;
  float eMask = maskEye(maskColor);
  float fMask = maskFace(maskColor, puv);

  float headWeight = maskFace(maskColor, puv); // 获取头部的权重 (0-1)

  float headWave = sin(uTime * uHeadMoveSpeed); // 使用同一个波形作为平移和旋转的周期基准
  vec3 rotatedPosition = position;
 // 只有在头部区域的粒子才进行微动 (headWeight == 1.0)
  if(headWeight > 0.5) { 

    // 1. 随机平移
    // 直接使用 headWave 控制平移方向和大小
    float headMoveX_offset = headWave * uHeadMoveStrength * 0.2 * uNodActive;
    float headMoveY_offset = headWave * uHeadMoveStrength * uNodActive; // 也可以调整Y轴强度

    mixedPosition.x += headMoveX_offset;
    mixedPosition.y += headMoveY_offset;

    // 2. 旋转
    // 直接使用 headWave 控制旋转角度
    float headRotateAngle_X = headWave * uHeadRotateStrength * uNodActive;

    float cosAngleX = cos(headRotateAngle_X);
    float sinAngleX = sin(headRotateAngle_X);
    float tempY = rotatedPosition.y;
    rotatedPosition.y = rotatedPosition.y * cosAngleX - rotatedPosition.z * sinAngleX;
    rotatedPosition.z = tempY * sinAngleX + rotatedPosition.z * cosAngleX;
  }

  fMask = clamp(fMask + 0.8, 0., 1.);
  luminalScale *= fMask;
  // luminalScale = (luminalScale, eyeIntensity, eMask);

  float eyeTarget = luminalScale + eyeIntensity; // 理想目标
  luminalScale = mix(luminalScale, eyeTarget, 0.7 * eMask);
  // luminalScale += eyeIntensity * eMask;

  // particle size
  // float psize = .5;
  // psize *= max(grey, 0.2);
  float psize = uSize * (min(1.0, pow(smoothstep(0.2, 1., luminalScale), 1.5) + minSize));

  // final position
  vec4 mvPosition = modelViewMatrix * vec4(mixedPosition, 1.0);
  mvPosition.xyz += rotatedPosition * psize;
  vec4 finalPosition = projectionMatrix * mvPosition;

  gl_Position = finalPosition;
}