import {
  Scene,
  PerspectiveCamera,
  // BoxGeometry,
  // MeshBasicMaterial,
  // Mesh,
  WebGLRenderer,
  Clock,
  SRGBColorSpace,
  Plane,
  Vector3,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  VideoTexture,
  ShaderMaterial,
  WebGLRenderTarget,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ClampToEdgeWrapping,
  Vector2,
  NearestFilter,
  TextureUtils,
  LinearFilter,
  Color,
  FloatType,
  TextureLoader,
  DoubleSide,
} from "three";
import { getFaceIndex } from "./partData";
import { edgeDetection } from "../webgl/edgedetection";
import useGui from "./useGUi";
import expandFrag from "../webgl/glsl/expand.frag";
import depthFrag from "../webgl/glsl/depth.frag";
import depthVert from "../webgl/glsl/depth.vert";
import blurFrag from "../webgl/glsl/blur.frag";
import blurFrag2 from "../webgl/glsl/blur2.frag";
import copyFrag from "../webgl/glsl/copy.frag";
import generateDigitTextureAtlas from "./useNumberTexture";
import { useGlobalConfig } from "../stores";
import calNormal from "../webgl/glsl/calNormal.frag";

const vertexShader = /*glsl*/ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }`;

let texture;

const config = {
  density: 0.57,
  threshold: 0.06,
  sharpen: 0.4,
  blendRatio: 0.13,
  suppress: 0.5,
  contrast: 80,
  // uLowProb: 0.5,
  uLowProb: 0.08,
  uHighProb: 0.8,
  pointSize: 1.21,

  offsetScale: 0.14,
  sampleStep: 2,
  diff: 0.2,
  // particleColor: 0x8299b1,
  // particleColor: 0x868686,
  // uHighLightColor: 0xa9bbca,
  particleColor: 0x7e9bc2,
  uHighLightColor: 0xc7fb,
  depthThroshold: 0.02,
  scale: 1,
};

let color2 = new Color(0x7cbcff);
color2.set(0.125, 0.25, 0.5);
// console.log(color2.r, color2.g, color2.b);
console.log(color2.getHexString());

// 是否使用一半

function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, width: img.width, height: img.height });
    };
    img.src = src;
  });
}

async function getDepthArray(src) {
  const { canvas, ctx, width, height } = await loadImageToCanvas(src);
  const imgData = ctx.getImageData(0, 0, width, height).data;
  // 灰度图，直接取R通道
  const arr = [];
  let min = 0;
  let max = 0;
  for (let i = 0; i < imgData.length; i += 4) {
    arr.push(imgData[i]); // 0~255
    if (imgData[i] < min) min = imgData[i];
    if (imgData[i] > max) max = imgData[i];
  }
  return { arr, width, height, min, max };
}

export default function usePileline(scene, renderer, camera) {
  const textureLoader = new TextureLoader();
  const globalConfig = useGlobalConfig();
  const useHalf = globalConfig.isUseHalf;
  useGui(config);
  const digitTexture = generateDigitTextureAtlas();
  let resulution = new Vector2(1, 1);

  let width;
  let height;
  renderer.autoClear = false;
  const getFSGeometry = () => {
    let fsGeometry;
    if (fsGeometry && !fsGeometry._isDisposed) return fsGeometry;
    fsGeometry = new BufferGeometry();
    fsGeometry.__name = "fsGeometry";
    fsGeometry.setAttribute(
      "position",
      new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
    );
    fsGeometry.setAttribute(
      "uv",
      new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2)
    );

    return fsGeometry;
  };

  const halfMaterial = new ShaderMaterial({
    name: "halfMaterial",
    uniforms: {
      tDiffuse: { value: null },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
          precision mediump float;
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv;
            uv.y = uv.y / 2.0 + 0.5;
            gl_FragColor = texture2D(tDiffuse, uv);
          }
        `,
  });

  const halfWrapper = new Mesh(getFSGeometry(), halfMaterial);
  const halfRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  // 可以作为mask
  // init gray , eliminate background 剔除背景了
  const grayMaterial = new ShaderMaterial({
    name: "grayMaterial",
    uniforms: {
      tDiffuse: { value: null },
      uDiff: { value: null },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
          precision mediump float;
          uniform sampler2D tDiffuse;
          uniform float uDiff;
          varying vec2 vUv;

          float euclideanDistance(vec3 col1, vec3 col2) {
          vec3 diff = col1 - col2;
          return (dot(diff, diff)); // √(ΔR² + ΔG² + ΔB²)
          }

          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            // vec4 bgColor = texture2D(tDiffuse, vec2(0.01, 0.01));
            vec4 bgColor = vec4(79.0 / 255.0, 153.0 / 255.0, 39.0 / 255.0, 1.0);
            float diff = distance(color.rgb, bgColor.rgb);
            float gray = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
            if ( diff < 0.2) {
              
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
            // gl_FragColor = bgColor;
            else {
              gl_FragColor = vec4(gray, gray, gray, 1.0);
            }
          }
          `,
  });
  const grayWrapper = new Mesh(getFSGeometry(), grayMaterial);
  const grayRt = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  grayMaterial.onBeforeRender = () => {
    // grayMaterial.uniforms.tDiffuse.value = texture;
  };

  // 低概率图
  const lowProbabilityMaterial = new ShaderMaterial({
    name: "lowProbabilityMaterial",
    uniforms: {
      tMask: { value: grayRt.texture },
      uLowProb: { value: 0.5 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
          precision mediump float;
          uniform sampler2D tMask;
          uniform float uLowProb;
          varying vec2 vUv;
          void main() {
            vec4 maskColor = texture2D(tMask, vUv);
            if (distance(maskColor.rgb, vec3(0.0)) < 0.01) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
              
             
             float rand = fract(sin(dot(vUv ,vec2(12.9898,78.233))) * 43758.5453);
             if (rand < uLowProb) {
              gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
             } else {
               gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
             }
            }
          }
`,
  });
  const lowProbabilityWrapper = new Mesh(
    getFSGeometry(),
    lowProbabilityMaterial
  );
  const lowProbabilityRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  // 高光图
  const highProbabilityMaterial = new ShaderMaterial({
    name: "highProbabilityMaterial",
    uniforms: {
      tMask: { value: grayRt.texture },
      tDepth: { value: null },
      depthThroshold: { value: 0.5 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
          precision mediump float;
          uniform sampler2D tMask;
          uniform sampler2D tDepth;
          uniform float depthThroshold;
          varying vec2 vUv;
          void main() {
            vec4 maskColor = texture2D(tMask, vUv);
            if (distance(maskColor.rgb, vec3(0.0)) < 0.001) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              discard;
            }
             
            //  float gray = 0.299 * maskColor.r + 0.587 * maskColor.g + 0.114 * maskColor.b;
            // float gray = maskColor.r;
            float depth = texture2D(tDepth, vUv).r;

             if (depth > depthThroshold) {
              gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
             }
          }
`,
  });
  const highProbabilityWrapper = new Mesh(
    getFSGeometry(),
    highProbabilityMaterial
  );
  const highProbabilityRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });
  highProbabilityMaterial.onBeforeRender = () => {
    highProbabilityMaterial.uniforms.tMask.value = grayRt.texture;
    // highProbabilityMaterial.uniforms.tMask.value = edgeDetectionRt.texture;
  };

  let needUpdateLowProbabilityRt = true;

  //  const    initEdgeDetection = ()=>{
  // init edge detection
  const edgeDetectionMaterial = new ShaderMaterial({
    ...edgeDetection,
  });
  const channelResulution = new Vector2();
  const edgeDetectionWrapper = new Mesh(getFSGeometry(), edgeDetectionMaterial);
  edgeDetectionMaterial.uniforms.tdiff.value = texture;
  edgeDetectionMaterial.uniforms.iResolution.value = resulution;
  edgeDetectionMaterial.onBeforeRender = () => {
    if (useHalf) {
      edgeDetectionMaterial.uniforms.tdiff.value = halfRt.texture;
    } else {
      edgeDetectionMaterial.uniforms.tdiff.value = texture;
    }
    edgeDetectionMaterial.uniforms.iResolution.value = resulution;
    channelResulution.set(width, height);
    edgeDetectionMaterial.uniforms.iChannelResolution.value = channelResulution;
  };
  const edgeDetectionRt = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  // };

  //init expand
  //  const    initExpand = ()=>{
  const expandMaterial = new ShaderMaterial({
    name: "expandMaterial",
    uniforms: {
      tDiffuse: { value: edgeDetectionRt.texture },
      resolution: {
        value: resulution,
      },
      uContrast: { value: null },
      u_size: { value: 2.0 },
    },
    vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
        `,
    fragmentShader: expandFrag,
  });
  const expandWrapper = new Mesh(getFSGeometry(), expandMaterial);
  const expandRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  //init blur
  //   const initBlur = () => {
  const direction = new Vector2(1, 0);
  const blurMaterial = new ShaderMaterial({
    name: "blurMaterial",
    uniforms: {
      tDiffuse: { value: expandRt.texture },
      iResolution: { value: resulution },
    },
    vertexShader,
    fragmentShader: blurFrag,
  });
  // const blurMaterial2 = new ShaderMaterial({
  //   name: "blurMaterial2",
  //   uniforms: {
  //     tDiffuse: { value: expandRt.texture },
  //     iResolution: { value: resulution },
  //     uRadius: { value: 40 },
  //   },
  //   vertexShader,
  //   fragmentShader: blurFrag2,
  // });
  const blurWrapper = new Mesh(getFSGeometry(), blurMaterial);
  const blurRt1 = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });
  const blurRt2 = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });
  //   };

  let globalDepthTextureMax = 0;
  let globalDepthTextureMin = 0;
  const initDepth = async () => {
    const { min, max } = await getDepthArray("src/assets/jialuoDepth.png");
    globalDepthTextureMax = max;
    globalDepthTextureMin = min;
  };

  initDepth();

  const depthRenderMaterial = new ShaderMaterial({
    name: "depthRenderMaterial",
    uniforms: {
      gDMax: { value: globalDepthTextureMax },
      gDmin: { value: globalDepthTextureMin },
      dMax: { value: 0 },
      dMin: { value: 0 },
    },
    vertexShader: depthVert,
    fragmentShader: depthFrag,
    depthTest: false,
    side: DoubleSide,
  });

  depthRenderMaterial.onBeforeRender = () => {
    depthRenderMaterial.uniforms.gDMax.value = globalDepthTextureMax;
    depthRenderMaterial.uniforms.gDmin.value = globalDepthTextureMin;
    depthRenderMaterial.uniforms.dMax.value = globalConfig.faceDepthMax;
    depthRenderMaterial.uniforms.dMin.value = globalConfig.faceDepthMin;
  };

  const depthCopyMaterial = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
    },
    vertexShader,
    depthWrite: false,
    fragmentShader: copyFrag,
  });

  textureLoader.load("/src/assets/jialuoDepth.png", (texture) => {
    depthCopyMaterial.uniforms.tDiffuse.value = texture;
    normalMaterial.uniforms.depthMap.value = texture;
  });
  const depthCopyWrapper = new Mesh(getFSGeometry(), depthCopyMaterial);
  const faceGeometry2 = new BufferGeometry();
  window.faceGeometry2 = faceGeometry2;
  faceGeometry2.setAttribute("position", faceGeometryAttribute);
  // faceGeometry2.setAttribute("normal", faceGeometryAttribute);

  faceGeometry2.setIndex(getFaceIndex());

  const depthRenderWrapper = new Mesh(faceGeometry2, depthRenderMaterial);
  const depthRenderRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
    samples: 8,
  });

  const normalMaterial = new ShaderMaterial({
    name: "normalMaterial",
    fragmentShader: /*glsl*/ calNormal,
    vertexShader: /*glsl*/ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }`,

    uniforms: {
      depthMap: { value: null },
      resolution: { value: resulution },
    },
  });

  normalMaterial.onBeforeRender = () => {
    debugger;
  };

  const normalWrapper = new Mesh(getFSGeometry(), normalMaterial);
  const normalRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  const baseNormalMaterial = new ShaderMaterial({
    name: "baseNormalMaterial",
    side: DoubleSide,
    depthTest: false,
    vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normal; // 模型空间法线
      gl_Position = vec4(position.xy * 2.0, position.z, 1.0); // 忽略 view/projection
    }
  `,
    fragmentShader: /*glsl*/ `
      varying vec2 vUv;
    varying vec3 vNormal;
      void main() {
         gl_FragColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);
      }`,
  });
  const baseNormalWrapper = new Mesh(faceGeometry2, baseNormalMaterial);
  const baseNormaRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
    samples: 8,
  });

  //   init blend
  const blendMaterial = new ShaderMaterial({
    name: "blendMaterial",
    uniforms: {
      tDiffuse: { value: null },
      tArea: { value: blurRt2.texture },
      maskDiffuse: { value: grayRt.texture },
      blendRatio: { value: 0.8 },
      uContrast: { value: 10 },
      time: { value: 0 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `

          // gaussianBlurH.frag
          precision highp float;
          uniform sampler2D tDiffuse;
          uniform sampler2D tArea;
          uniform sampler2D maskDiffuse;
          uniform float blendRatio;
          uniform float uContrast;
          varying vec2 vUv;
          uniform float time;

        float contrast(float x, float k) {
        // x: 原始亮度值（0~1），k: 强度（建议 5~15）
        return 1.0 / (1.0 + exp(-k * (x - 0.5)));
        }

          void main() {
            // 过滤模糊导致的边框溢出
            vec4 maskColor = texture2D(maskDiffuse, vUv);
            float mask = distance(maskColor.rgb, vec3(0.0));
            if (mask < 0.01) discard;

            vec4 c1 = texture2D(tDiffuse, vUv);

            float grey = c1.r * 0.21 + c1.g * 0.71 + c1.b * 0.07;
            vec4 c2 = texture2D(tArea, vUv);
            // vec3 color = vec3(c2.rgb * blendRatio + vec3( grey * (1.0 - blendRatio)));
            vec3 color = vec3(c2.rgb * 0.8 + vec3( grey * blendRatio));

            // color = pow(color, vec3(0.7)); // 提高亮度
            // color =  smoothstep(vec3(0.05), vec3(0.8), color.rgb);; // 增强对比


            // float pulse = sin(time * 5.0 + vUv.y * 20.0) * 0.5 + 0.5;
            // color.rgb += pulse * color.rgb * 0.5;

            // vec3 c = texture2D(tMixedInput, vUv).rgb;
            // float edge = texture2D(tEdge, vUv).r;

            // 多段拉伸
            
            float g = color.r;
            // float g = color.r * 0.21 + color.g * 0.71 + color.b * 0.07;
            // if (g < 0.2) g = smoothstep(0.0, 0.2, g) * 0.2;
            // else if (g < 0.5) g = smoothstep(0.2, 0.5, g) * 0.5;
            // else g = smoothstep(0.5, 0.8, g) * 1.0;

            g = clamp((g - 0.1) / (0.9 - 0.1), 0.0, 1.0);  // 将 0.1~0.9 映射到 0~1
            g = contrast(g, uContrast);  // k 越大，对比越强（推荐 8~12）

            // 高光脉冲
            // float pulse = sin(time * 5.0 + vUv.y * 20.0) * 0.5 + 0.5;
            // g += pulse * g * 0.2;

            // 边缘强化
            // g = mix(g, 1.0, edge * 0.5);

            // 渐隐
            float fadeY = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));
            // g *= fadeY;

            gl_FragColor = vec4(vec3(g), 1.0);



            // gl_FragColor = vec4(color, 1.0);
          }
          `,
  });
  const blendWrapper = new Mesh(getFSGeometry(), blendMaterial);
  const blendRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  //   init blend prob
  const blendProbMaterial = new ShaderMaterial({
    name: "blendMaterial",
    uniforms: {
      tLow: { value: lowProbabilityRt.texture },
      tHigh: { value: highProbabilityRt.texture },
      // tArea: { value: blurRt2.texture },
      // maskDiffuse: { value: grayRt.texture },
      // blendRatio: { value: 0.8 },
      // uContrast: { value: 10 },
      // time: { value: 0 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `

          // gaussianBlurH.frag
          precision highp float;
          uniform sampler2D tLow;
          uniform sampler2D tHigh;

          varying vec2 vUv;

          void main() {
            vec4 low = texture2D(tLow, vUv);
            vec4 high = texture2D(tHigh, vUv);
            gl_FragColor = low;
            if (high.r > 0.0) {
              gl_FragColor = high;
            }
          }
          `,
  });
  const blendProbWrapper = new Mesh(getFSGeometry(), blendProbMaterial);
  const blendProbRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  // init prob
  const probMaterial = new ShaderMaterial({
    uniforms: {
      tEnhanced: { value: blendRt.texture },
      uDensity: { value: 0.5 },
      uThreshold: { value: 0.2 },
      uSharpness: { value: 1.0 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
    
precision highp float;

uniform sampler2D tEnhanced;  // 灰度增强图
uniform float uThreshold;     // 亮度阈值（如 0.2）
uniform float uDensity;       // 采样上限强度（如 0.6）
uniform float uSharpness;     // 提升曲线锐度（如 2.0）
varying vec2 vUv;

void main() {
  float g = texture2D(tEnhanced, vUv).r;

  // 阈值之后的光滑提升
  float p = smoothstep(uThreshold, 1.0, g);

  // 加权增强，控制高亮更密集，低亮更稀疏
  p = pow(p, uSharpness); // 锐化采样概率分布

  // 全局控制密度上限
  float prob = clamp(p * uDensity, 0.0, 1.0);

  float rand = fract(sin(dot(vUv ,vec2(12.9898,78.233))) * 43758.5453);

  // 保留一定概率的点
  if (rand > prob) discard;
  gl_FragColor = vec4(prob, prob, prob, 1.0);
}



    `,
  });
  const probWrapper = new Mesh(getFSGeometry(), probMaterial);
  const probRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  //   initresult
  const showHandleResult = (texture, offset) => {
    const scale = 2;
    const plane = new Mesh(
      new PlaneGeometry(
        texture.image.width / scale,
        texture.image.height / scale
      ),
      new MeshBasicMaterial({ map: texture })
      // new MeshBasicMaterial({ color: 0xffffff })
    );
    plane.position.z = 0;
    const offset1 = offset ? 1 : -1;
    plane.position.x = offset1 * (texture.image.width / scale / 4);
    // console.log(plane.position);
    // plane.position.y = -texture.image.height / 2;
    scene.add(plane);
  };

  const show = () => {
    // showHandleResult(grayRt.texture, 0);
    // showHandleResult(digitTexture, 0);
    // showHandleResult(lowProbabilityRt.texture, 0);
    // showHandleResult(edgeDetectionRt.texture, 0);
    // showHandleResult(expandRt.texture, 1);
    // showHandleResult(normalRt.texture, 1);
    // showHandleResult(depthRenderRt.texture, 0);
    showHandleResult(baseNormaRt.texture, 0);
    showHandleResult(blurRt2.texture, 1);

    // showHandleResult(highProbabilityRt.texture, 1);
    // showHandleResult(blendProbRt.texture, 1);
    // showHandleResult(blendRt.texture, 1);
    // showHandleResult(probRt.texture, 1);
  };

  let ratio = 1;
  function updateRenderConfig() {
    if (lowProbabilityMaterial.uniforms.uLowProb.value !== config.uLowProb) {
      needUpdateLowProbabilityRt = true;
      renderTime = -2;
    }

    if (points) {
      // const scale = config.scale;
      const baseScale = 1.05;
      const scale1 = width * baseScale;
      const scale2 = height * baseScale;
      const scale3 = 100 * baseScale;
      points.scale.set(scale1, scale2, scale3);
      faceLine.scale.set(scale1, scale2, scale3);
      faceMesh.scale.set(scale1, scale2, scale3);
      baseNormalWrapper.scale.set(scale1, scale2, scale3);
    }

    highProbabilityMaterial.uniforms.depthThroshold.value =
      config.depthThroshold;
    grayMaterial.uniforms.uDiff.value = config.diff;

    edgeDetection.uniforms.uContrast.value = config.contrast;

    expandMaterial.uniforms.uContrast.value = config.contrast;

    lowProbabilityMaterial.uniforms.uLowProb.value = config.uLowProb;
    // highProbabilityMaterial.uniforms.uHighProb.value = config.uHighProb;
    blendMaterial.uniforms.blendRatio.value = config.blendRatio;
    blendMaterial.uniforms.uContrast.value = config.contrast;
    probMaterial.uniforms.uDensity.value = config.density;
    probMaterial.uniforms.uThreshold.value = config.threshold;
    probMaterial.uniforms.uSharpness.value = config.sharpen;
    // probMaterial
  }

  let renderTime = -2;
  function preTreatment(time) {
    if (!texture) return;
    updateRenderConfig();

    if (useHalf) {
      halfMaterial.uniforms.tDiffuse.value = texture;
      grayMaterial.uniforms.tDiffuse.value = halfRt.texture;
      renderer.setRenderTarget(halfRt);
      renderer.clear();
      renderer.render(halfWrapper, camera);
    } else {
      grayMaterial.uniforms.tDiffuse.value = texture;
    }

    // 提取灰度
    renderer.setRenderTarget(grayRt);
    renderer.clear();
    renderer.render(grayWrapper, camera);

    // 渲染低概率图
    if (needUpdateLowProbabilityRt > 0) {
      // needUpdateLowProbabilityRt = false;
      lowProbabilityMaterial.uniforms.tMask.value = grayRt.texture;
      renderer.setRenderTarget(lowProbabilityRt);
      renderer.clear();
      renderer.render(lowProbabilityWrapper, camera);
    }

    // render edge detection
    resulution.set(width * 2, height * 2);
    renderer.setRenderTarget(edgeDetectionRt);
    renderer.clear();
    renderer.render(edgeDetectionWrapper, camera);

    resulution.set(width, height);
    // render expand
    renderer.setRenderTarget(expandRt);
    renderer.clear();
    renderer.render(expandWrapper, camera);

    renderer.setRenderTarget(depthRenderRt);
    renderer.clear();
    renderer.render(depthCopyWrapper, camera);
    renderer.render(depthRenderWrapper, camera);

    // normalMaterial.uniforms.tDiffuse.value = blurRt2.texture;
    // normalMaterial.uniforms.tDiffuse.value = depthRenderRt.texture;
    // renderer.setRenderTarget(normalRt);
    // renderer.clear();
    // renderer.render(normalWrapper, camera);

    highProbabilityMaterial.uniforms.tDepth.value = depthRenderRt.texture;
    renderer.setRenderTarget(highProbabilityRt);
    renderer.clear();
    renderer.render(highProbabilityWrapper, camera);

    renderer.setRenderTarget(blendProbRt);
    renderer.clear();
    renderer.render(blendProbWrapper, camera);

    // renderer.setRenderTarget(baseNormaRt);
    // if (baseNormalWrapper.geometry.attributes.normal) {
    //   renderer.clear();
    //   // renderer.render(normalWrapper, camera);
    //   renderer.render(baseNormalWrapper, camera);
    // } else {
    //   const color = new Color(0xffffff);
    //   renderer.getClearColor(color);
    //   renderer.setClearColor(new Color(0.5, 0.5, 1.0), 1);
    //   renderer.clear();
    //   renderer.setClearColor(color);
    // }

    // render blur
    renderer.setRenderTarget(blurRt1);
    renderer.clear();
    direction.set(1, 0);
    blurMaterial.uniforms.tDiffuse.value = baseNormaRt.texture;
    renderer.render(blurWrapper, camera);
    renderer.setRenderTarget(blurRt2);
    renderer.clear();
    direction.set(0, 1);
    // blurMaterial2.uniforms.tDiffuse.value = blurRt1.texture;
    blurMaterial.uniforms.tDiffuse.value = blurRt1.texture;
    renderer.render(blurWrapper, camera);

    const numPasses = 0;

    for (let i = 0; i < numPasses; i++) {
      renderer.setRenderTarget(blurRt1);
      renderer.clear();
      direction.set(1, 0);
      blurMaterial.uniforms.tDiffuse.value = blurRt2.texture;
      renderer.render(blurWrapper, camera);
      renderer.setRenderTarget(blurRt2);
      renderer.clear();
      direction.set(0, 1);
      blurMaterial.uniforms.tDiffuse.value = blurRt1.texture;
      renderer.render(blurWrapper, camera);
    }

    if (useHalf) {
      blendMaterial.uniforms.tDiffuse.value = halfRt.texture;
    } else {
      blendMaterial.uniforms.tDiffuse.value = texture;
    }
    blendMaterial.uniforms.time.value += time * 1000 * 10;
    // console.log(blendMaterial.uniforms.time.value);
    // 不blur了呢
    // blendMaterial.uniforms.tArea.value = edgeDetectionRt.texture;
    // blendMaterial.uniforms.tArea.value = expandRt.texture;
    // renderer.setRenderTarget(blendRt);
    // renderer.clear();
    // renderer.render(blendWrapper, camera);

    renderer.setRenderTarget(probRt);
    renderer.clear();
    renderer.render(probWrapper, camera);

    renderer.setRenderTarget(null);
  }
  function updatePipelineConfig(_texture, video) {
    texture = _texture;
    if (video) {
      const { videoWidth, videoHeight } = video;
      width = videoWidth;
      height = videoHeight;
    } else {
      width = _texture.image.width;
      height = _texture.image.height;
    }

    ratio = width / height;
    const maxWidth = globalConfig.maxWidth;
    width = Math.min(maxWidth, width);
    height = Math.floor(width / ratio);

    if (useHalf) height = height / 2;

    const dwidth = width * 2;
    const dheight = height * 2;

    halfRt.setSize(width, height);

    resulution.set(width, height);
    grayRt.setSize(width, height);
    lowProbabilityRt.setSize(width, height);
    highProbabilityRt.setSize(width, height);
    edgeDetectionRt.setSize(dwidth, dheight);
    expandRt.setSize(width, height);
    blurRt1.setSize(width, height);
    blendProbRt.setSize(width, height);
    blurRt2.setSize(width, height);
    blendRt.setSize(width, height);
    probRt.setSize(width, height);
    normalRt.setSize(width, height);
    depthRenderRt.setSize(width, height);
    baseNormaRt.setSize(width, height);
    if (globalConfig.debugTexture) {
      show();
    }
  }

  function getRenderResultTexture() {
    // return probRt.texture;
    // return blendRt.texture;
    // return lowProbabilityRt.texture;
    return {
      // probTexture: blendProbRt.texture,
      probTexture: grayRt.texture,
      // maskTexture: grayRt.texture,
      maskTexture: grayRt.texture,
      particleMap: digitTexture,
      highLightTexture: edgeDetectionRt.texture,
      // highLightTexture: edgeDetectionRt.texture,
      // normalTexture: normalRt.texture,
      // normalTexture: baseNormaRt.texture,
      normalTexture: blurRt2.texture,
      depthTexture: depthRenderRt.texture,
      // highLightTexture: expandRt.texture,
    };
  }

  return {
    preTreatment,
    updatePipelineConfig,
    getRenderResultTexture,
    config,
  };
}
