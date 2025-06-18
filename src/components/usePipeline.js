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
  LinearFilter,
  TextureLoader,
  ShaderMaterial,
  WebGLRenderTarget,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ClampToEdgeWrapping,
  Vector2,
} from "three";
import { edgeDetection } from "../webgl/edgedetection";
import { getFloatLength } from "three/src/renderers/common/BufferUtils.js";
import useGui from "./useGUi";
import { densityFog } from "three/tsl";

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
};

export default function usePileline(scene, renderer, camera) {
  useGui(config);
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
  const initMask = () => {};

  //  const    initEdgeDetection = ()=>{
  // init edge detection
  const edgeDetectionMaterial = new ShaderMaterial({
    ...edgeDetection,
  });
  const edgeDetectionWrapper = new Mesh(getFSGeometry(), edgeDetectionMaterial);
  edgeDetectionMaterial.uniforms.tdiff.value = texture;
  edgeDetectionMaterial.uniforms.iResolution.value = resulution;
  edgeDetectionMaterial.onBeforeRender = () => {
    edgeDetectionMaterial.uniforms.tdiff.value = texture;
    edgeDetectionMaterial.uniforms.iResolution.value = resulution;
  };
  const edgeDetectionRT = new WebGLRenderTarget(1, 1);

  // };

  //init expand
  //  const    initExpand = ()=>{
  const expandMaterial = new ShaderMaterial({
    name: "expandMaterial",
    uniforms: {
      tDiffuse: { value: edgeDetectionRT.texture },
      resolution: {
        value: resulution,
      },
      u_size: { value: 1.0 },
    },
    vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
        `,
    fragmentShader: /*glsl*/ `
        precision mediump float;

        uniform sampler2D tDiffuse;  // 边缘图（黑白图）
        uniform vec2 resolution;     // = 1.0 / resolution.xy
        uniform float u_size;

        varying vec2 vUv;

        void main() {
          float maxVal = 0.0;

          vec2 texelSize = u_size / resolution.xy;

          // 3x3 邻域最大值（模拟膨胀）
          for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= 1; dy++) {
              vec2 offset = vec2(float(dx), float(dy)) * texelSize;
              float sampleVal = texture2D(tDiffuse, vUv + offset).r;
              maxVal = max(maxVal, sampleVal);
            }
          }

          gl_FragColor = vec4(vec3(maxVal), 1.0);  // 白 = 膨胀区域
        }
        `,
  });
  const expandWrapper = new Mesh(getFSGeometry(), expandMaterial);
  const expandRT = new WebGLRenderTarget(1, 1);

  //init blur
  //   const initBlur = () => {
  const direction = new Vector2(1, 0);
  const blurMaterial = new ShaderMaterial({
    name: "blurMaterial",
    uniforms: {
      tDiffuse: { value: expandRT.texture },
      iResolution: { value: resulution },
      direction: { value: direction },
    },
    vertexShader: /*glsl*/ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }`,
    fragmentShader: /* glsl */ `

          // gaussianBlurH.frag
          precision highp float;

          uniform sampler2D tDiffuse;
          uniform vec2 iResolution;  // (1/width, 1/height)
          uniform vec2 direction;
          varying vec2 vUv;

          // radius = 5 时的标准高斯权重（σ ≈ 3.0）
          const float w[11] = float[11](
            0.0093, 0.0280, 0.0656, 0.1210, 0.1757,
            0.1986,
            0.1757, 0.1210, 0.0656, 0.0280, 0.0093
          );



          void main() {
            vec2 texelSize = 1.0 / iResolution.xy;
            vec3 sum = vec3(0.0);
            // 从 -5 到 +5 共 11 个采样
            for (int i = -5; i <= 5; i++) {
              sum += texture2D(tDiffuse, vUv + vec2(float(i)) * texelSize * direction).rgb * w[i + 5];
            }
            // sum += texture2D(tDiffuse, vUv).rgb;
            gl_FragColor = vec4(sum, 1.0);
          }
          `,
  });
  const blurWrapper = new Mesh(getFSGeometry(), blurMaterial);
  const blurRt1 = new WebGLRenderTarget(1, 1);
  const blurRt2 = new WebGLRenderTarget(1, 1);
  //   };

  //   init blend
  const blendMaterial = new ShaderMaterial({
    name: "blendMaterial",
    uniforms: {
      tDiffuse: { value: null },
      tDiffuse2: { value: blurRt2.texture },
      blendRatio: { value: 0.8 },
      time: { value: 0 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `

          // gaussianBlurH.frag
          precision highp float;
          uniform sampler2D tDiffuse;
          uniform sampler2D tDiffuse2;
          uniform float blendRatio;
          varying vec2 vUv;
          uniform float time;

          
        float contrast(float x, float k) {
        // x: 原始亮度值（0~1），k: 强度（建议 5~15）
        return 1.0 / (1.0 + exp(-k * (x - 0.5)));
        }

          void main() {
            vec4 c1 = texture2D(tDiffuse, vUv);
            float grey = c1.r * 0.21 + c1.g * 0.71 + c1.b * 0.07;
            vec4 c2 = texture2D(tDiffuse2, vUv);
            // vec3 color = vec3(c2.rgb * blendRatio + vec3( grey * (1.0 - blendRatio)));
            vec3 color = vec3(c2.rgb * 0.5 + vec3( grey * blendRatio));

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
            // g = contrast(g, 20.0);  // k 越大，对比越强（推荐 8~12）

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
  const blendRt = new WebGLRenderTarget(1, 1);

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
  const probRt = new WebGLRenderTarget(1, 1);

  //   initresult
  const showHandleResult = (texture, offset) => {
    const scale = 4;
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
    plane.position.x = offset1 * (texture.image.width / scale / 2);
    // console.log(plane.position);
    // plane.position.y = -texture.image.height / 2;
    scene.add(plane);
  };

  const show = () => {
    // showHandleResult(edgeDetectionRT.texture, 0);
    // showHandleResult(expandRT.texture, 0);
    // showHandleResult(blurRt2.texture, 0);
    showHandleResult(blendRt.texture, 0);
    showHandleResult(probRt.texture, 1);
  };

  function updateRenderConfig() {
    blendMaterial.uniforms.blendRatio.value = config.blendRatio;
    probMaterial.uniforms.uDensity.value = config.density;
    probMaterial.uniforms.uThreshold.value = config.threshold;
    probMaterial.uniforms.uSharpness.value = config.sharpen;
    // probMaterial
  }
  function preTreatment(time) {
    if (!texture) return;
    updateRenderConfig();
    // render edge detection
    renderer.setRenderTarget(edgeDetectionRT);
    renderer.clear();
    renderer.render(edgeDetectionWrapper, camera);

    // render expand
    renderer.setRenderTarget(expandRT);
    renderer.clear();
    renderer.render(expandWrapper, camera);

    // render blur
    renderer.setRenderTarget(blurRt1);
    renderer.clear();
    direction.set(1, 0);
    blurMaterial.uniforms.tDiffuse.value = expandRT.texture;
    renderer.render(blurWrapper, camera);
    renderer.setRenderTarget(blurRt2);
    renderer.clear();
    direction.set(0, 1);
    blurMaterial.uniforms.tDiffuse.value = blurRt1.texture;
    renderer.render(blurWrapper, camera);

    const numPasses = 5;

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

    blendMaterial.uniforms.tDiffuse.value = texture;
    blendMaterial.uniforms.time.value += time * 1000 * 10;
    // console.log(blendMaterial.uniforms.time.value);
    renderer.setRenderTarget(blendRt);
    renderer.clear();
    renderer.render(blendWrapper, camera);

    renderer.setRenderTarget(probRt);
    renderer.clear();
    renderer.render(probWrapper, camera);

    renderer.setRenderTarget(null);
  }
  function updatePipelineConfig(_texture) {
    texture = _texture;
    width = _texture.image.width;
    height = _texture.image.height;
    resulution.set(width, height);
    edgeDetectionRT.setSize(width, height);
    expandRT.setSize(width, height);
    blurRt1.setSize(width, height);
    blurRt2.setSize(width, height);
    blendRt.setSize(width, height);
    probRt.setSize(width, height);
    show();
  }

  function getRenderResultTexture() {
    // return probRt.texture;
    return blendRt.texture;
  }

  return {
    preTreatment,
    updatePipelineConfig,
    getRenderResultTexture,
    config,
  };
}
