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
  AdditiveBlending,
  NearestFilter,
  LinearMipmapLinearFilter,
  TextureUtils,
  LinearFilter,
  Color,
  Texture,
  FloatType,
  TextureLoader,
  DoubleSide,
  Vector4,
} from "three";
import {
  getFaceIndex,
  getFaceOvalIndex,
  getLipsIndex,
  getAllLipsIndex,
  getForeHeadLineIndex,
  getMouseIndex,
} from "./partData";
import { useGlobalConfig } from "../stores";
import useGui from "./useCustomGui";
import mainFrag from "../webgl/technologyGlsl/main.frag";
import rainMaskFragmentShader from "../webgl/technologyGlsl/rainMaskFragmentShader.frag";
import mainFrag2 from "../webgl/technologyGlsl/main2.frag";
// import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader .js";
import { LUTCubeLoader } from "postprocessing";
import maskFrag from "../webgl/technologyGlsl/mask.frag";
import depthVert from "../webgl/glsl/depth.vert";
import depthFrag from "../webgl/glsl/depth.frag";
import copyFrag from "../webgl/glsl/copy.frag";
import calNormal from "../webgl/technologyGlsl/calNormal.frag";
import lutFragmentShader from "../effect/lut.frag";
// import usePileline from "./usePipeline";
import generateDigitTextureAtlas from "./useNumberTexture";
import { textureLoad } from "three/tsl";
function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
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
    const depth = imgData[i] / 255;
    arr.push(depth); // 0~255
    if (depth < min) min = depth;
    if (depth > max) max = depth;
  }
  console.log(arr);
  console.log("src", width, height);
  return { arr, width, height };
}

const vertexShader = /*glsl*/ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }`;

export const usePictureScene = (scene, renderer, camera) => {
  const globalConfig = useGlobalConfig();
  const config = globalConfig.config;
  const textureLoader = new TextureLoader();
  const lutLoader = new LUTCubeLoader();
  const digitTexture = generateDigitTextureAtlas();
  const { addGui } = useGui(config);
  function addConfig(key, name, min, max, step) {
    // config[key] = defaultValue;
    addGui(key, name, min, max, step);
  }

  addConfig("size", "size", 0.5, 5, 0.01);
  addConfig("strength", "strength", 0, 10, 0.01);
  addConfig("radius", "radius", 0, 1, 0.01);
  addConfig("threshold", "threshold", 0, 1, 0.01);
  // addConfig("normalThreshold", "normalThreshold", 0, 1, 0.01);

  let width,
    height,
    ratio = 1;
  let texture;

  let resolution = new Vector2(1, 1);
  let renderResolution = new Vector2(1, 1);
  renderer.getSize(renderResolution);
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

  let globalDepthTexture =
    !globalConfig.isLocal && globalConfig.depthPictureBitmap
      ? new Texture(globalConfig.depthPictureBitmap)
      : textureLoader.load(
          globalConfig.isLocal
            ? globalConfig.globalDepthLocal
            : globalConfig.globalDepthTextureUrl
        );

  let colorTexture = textureLoader.load("src/assets/jialuo4.png");
  let globalDepthTextureMax = 0;
  let globalDepthTextureMin = 0;
  let globalDepths = [];
  const initDepth = async () => {
    const { width, height, arr } = await getDepthArray(
      globalConfig.isLocal
        ? globalConfig.globalDepthLocal
        : globalConfig.globalDepthTextureUrl
    );
    globalDepthTextureMax = width;
    globalDepthTextureMin = height;
    globalDepths = arr;
  };

  initDepth();

  // 可以作为mask
  // init gray , eliminate background 剔除背景了
  const grayMaterial = new ShaderMaterial({
    name: "grayMaterial",
    uniforms: {
      tDiffuse: { value: colorTexture },
      uDiff: { value: 0.2 },
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

  const maskMaterial = new ShaderMaterial({
    name: "maskMaterial",
    uniforms: {
      tDiffuse: { value: colorTexture },
      keyColor: { value: new Color(0xffffff) },
      tolerance: { value: 0.5 },
      feathering: { value: 0.2 },
    },
    transparent: true,
    vertexShader,
    fragmentShader: maskFrag,
  });
  const maskWrapper = new Mesh(getFSGeometry(), maskMaterial);
  const maskRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  const depthRenderMaterial = new ShaderMaterial({
    name: "depthRenderMaterial",
    uniforms: {
      gDMax: { value: globalDepthTextureMax },
      gDmin: { value: globalDepthTextureMin },
      dMax: { value: 0 },
      dMin: { value: 0 },
      offset: { value: 0.2 },
    },
    vertexShader: depthVert,
    fragmentShader: depthFrag,
    // depthTest: false,
    transparent: true,
    premultipliedAlpha: true,
    side: DoubleSide,
  });

  depthRenderMaterial.onBeforeRender = () => {
    depthRenderMaterial.uniforms.gDMax.value = globalDepthTextureMax;
    depthRenderMaterial.uniforms.gDmin.value = globalDepthTextureMin;
    depthRenderMaterial.uniforms.dMax.value = globalConfig.faceDepthMax;
    depthRenderMaterial.uniforms.dMin.value = globalConfig.faceDepthMin;
    // depthRenderMaterial.uniforms.offset.value = config.depthOffset;
  };

  const faceGeometry2 = globalConfig.faceGeometry as BufferGeometry;

  const alphas = new Array(478).fill(1);
  // const faceOvalIndex = getFaceOvalIndex();
  const faceOvalIndex = getForeHeadLineIndex();
  for (let i = 0; i < faceOvalIndex.length; i++) {
    alphas[faceOvalIndex[i]] = 0;
  }

  const alphaAttribute = new Float32BufferAttribute(
    new Float32Array(alphas),
    1
  );

  faceGeometry2.setAttribute("alpha", alphaAttribute);

  faceGeometry2.setIndex(getFaceIndex());
  // faceGeometry2.setIndex(getAllLipsIndex());
  // faceGeometry2.setIndex(getLipsIndex());
  // faceGeometry2.setIndex(getMouseIndex());
  const depthRenderWrapper = new Mesh(faceGeometry2, depthRenderMaterial);
  const depthRenderRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
    generateMipmaps: true,
    samples: 8,
  });

  const depthCopyMaterial = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
    },
    vertexShader,
    depthWrite: false,
    fragmentShader: copyFrag,
  });

  const depthCopyWrapper = new Mesh(getFSGeometry(), depthCopyMaterial);

  const calNormalMaterial = new ShaderMaterial({
    name: "calNormalMaterial",
    fragmentShader: /*glsl*/ calNormal,
    vertexShader: /*glsl*/ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position, 1.0);
            }`,

    uniforms: {
      depthMap: { value: null },
      resolution: { value: resolution },
    },
  });

  const calNormalWrapper = new Mesh(getFSGeometry(), calNormalMaterial);
  const calNormalRt = new WebGLRenderTarget(1, 1, {
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
    transparent: true,
    premultipliedAlpha: true,
    vertexShader: `
    varying vec3 vNormal;
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      vNormal = normal; // 模型空间法线
      gl_Position = vec4(position.xy * 2.0, position.z, 1.0); // 忽略 view/projection
    }
  `,
    fragmentShader: /*glsl*/ `
      varying vec2 vUv;
     varying float vAlpha;
    varying vec3 vNormal;
      void main() {
         gl_FragColor = vec4(normalize(vNormal) * 0.5 + 0.5, vAlpha);
      }`,
  });
  const baseNormalWrapper = new Mesh(faceGeometry2, baseNormalMaterial);
  const baseNormaRt = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    generateMipmaps: true,
    type: FloatType,
    samples: 8,
  });

  const mainMaterial = new ShaderMaterial({
    name: "mainMaterial",
    uniforms: {
      blurMap: { value: null },
      maskMap: { value: null },
      depthMap: { value: null },
      colorMap: { value: null },
      bgMap: { value: null },
      iResolution: { value: resolution },
      edgeColor: { value: new Color(0.0, 0.0, 0.0) },
      eyeColor: { value: new Color(0.0, 0.0, 0.0) },
      lod: { value: 1 },
      depthScale: { value: 1 },
    },
    vertexShader,
    fragmentShader: mainFrag,
  });
  const mainWrapper = new Mesh(getFSGeometry(), mainMaterial);
  const mainRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  const lutMaterial = new ShaderMaterial({
    uniforms: {
      inputBuffer: { value: grayRt.texture },
      blendOpacity: { value: 1.0 },
      scale: { value: 1.0 },
      offset: { value: new Vector3() },
      lut: { value: null },
    },
    vertexShader,
    fragmentShader: lutFragmentShader,
  });

  lutLoader.load("/src/assets/lut/test.CUBE", (result) => {
    lutMaterial.uniforms.lut.value = result;
  });

  const lutWrapper = new Mesh(getFSGeometry(), lutMaterial);
  const lutRt = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    type: FloatType,
  });

  const eyeBall = new Vector4();
  globalConfig.eyeBall = eyeBall;

  function updateRenderConfig() {
    maskMaterial.uniforms.tDiffuse.value = texture;

    maskMaterial.uniforms.keyColor.value.set(config.keyColor);
    maskMaterial.uniforms.tolerance.value = config.tolerance;
    maskMaterial.uniforms.feathering.value = config.feathering;

    depthCopyMaterial.uniforms.tDiffuse.value = globalDepthTexture;
    depthRenderMaterial.uniforms.offset.value = config.offset;
    // mainMaterial.uniforms.resolution.value.set(mainRt.width, mainRt.height);
    // const depthMap = globalDepthTexture;

    calNormalMaterial.uniforms.depthMap.value = depthRenderRt.texture;
    // calNormalMaterial.uniforms.depthMap.value = globalDepthTexture;

    const depthMap = depthRenderRt.texture;

    mainMaterial.uniforms.blurMap.value = depthMap;
    mainMaterial.uniforms.maskMap.value = maskRt.texture;
    mainMaterial.uniforms.depthMap.value = depthMap;
    mainMaterial.uniforms.colorMap.value = colorTexture;
    // mainMaterial.uniforms.bgMap.value = bgTexture;
    mainMaterial.uniforms.edgeColor.value.set(config.edgeColor);
    // console.log(mainMaterial.uniforms.edgeColor.value);
    mainMaterial.uniforms.lod.value = config.lod;
    mainMaterial.uniforms.depthScale.value = config.depthScale;
    mainMaterial.uniforms.eyeColor.value.set(config.eyeColor);
  }

  function preTreatment() {
    if (!texture) return;
    updateRenderConfig();

    // 提取灰度
    renderer.setRenderTarget(maskRt);
    renderer.clear();
    renderer.render(maskWrapper, camera);

    // 提取灰度
    renderer.setRenderTarget(grayRt);
    renderer.clear();
    renderer.render(grayWrapper, camera);

    if (globalConfig.useFaceDetection) {
      renderer.setRenderTarget(depthRenderRt);
      renderer.clear();
      if (globalConfig.isUseGlobalDepth) {
        renderer.render(depthCopyWrapper, camera);
      }
      if (globalConfig.isRenderDepth) {
        renderer.render(depthRenderWrapper, camera);
      }
    }

    renderer.setRenderTarget(calNormalRt);
    renderer.clear();
    renderer.render(calNormalWrapper, camera);

    renderer.setRenderTarget(baseNormaRt);
    renderer.clear();
    renderer.render(baseNormalWrapper, camera);

    renderer.setRenderTarget(mainRt);
    renderer.clear();
    renderer.render(mainWrapper, camera);

    renderer.setRenderTarget(lutRt);
    renderer.clear();
    renderer.render(lutWrapper, camera);

    renderer.setRenderTarget(null);
  }
  const showHandleResult = (texture, offset) => {
    const scale = 2;
    const plane = new Mesh(
      new PlaneGeometry(width / scale, height / scale),
      new MeshBasicMaterial({ map: texture, transparent: true })
      // new MeshBasicMaterial({ color: 0xffffff })
    );
    plane.position.z = 0;
    const offset1 = offset;
    plane.position.x = offset1 * (width / scale);
    // console.log(plane.position);
    // plane.position.y = -texture.image.height / 2;
    scene.add(plane);
  };

  const show = () => {
    // showHandleResult(maskRt.texture, -1);
    // showHandleResult(digitTexture, 0);
    // showHandleResult(mainRt.texture, 1);
    showHandleResult(grayRt.texture, -1);
    showHandleResult(lutRt.texture, 1);
    // showHandleResult(lowProbabilityRt.texture, 0);
    // showHandleResult(edgeDetectionRt.texture, 0);
    // showHandleResult(expandRt.texture, 1);
    // showHandleResult(baseNormaRt.texture, -1);
    // showHandleResult(maskRt.texture, -1);
    // showHandleResult(digitTexture, 0);
    // showHandleResult(maskRainRt.texture, 1);
    // showHandleResult(rainmask)
    // showHandleResult(globalDepthTexture, 0);
    // showHandleResult(colorTexture, 1);
    // showHandleResult(calNormalRt.texture, 0);
    // showHandleResult(blurRt2.texture, 1);
    // showHandleResult(depthBlendRt.texture, 1);

    // showHandleResult(baseNormaRt.texture, -1);
    // showHandleResult(mainRt2.texture, -1);
    // showHandleResult(blurRt2.texture, 1);

    // showHandleResult(highProbabilityRt.texture, 1);
    // showHandleResult(blendProbRt.texture, 1);
    // showHandleResult(blendRt.texture, 1);
    // showHandleResult(probRt.texture, 1);
  };

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

    // 592 796
    console.log("----------------width-------------------height");
    console.log(width, height);

    ratio = width / height;

    const maxWidth = globalConfig.maxWidth;

    // const widhtScale = maxWidth / width;
    globalConfig.widthScale = 1;
    // globalConfig.widthScale = widhtScale;
    width = Math.min(maxWidth, width);
    height = Math.floor(width / ratio);

    // console.log(widhtScale);
    // window.setScale = (a) => digitalMesh.scale.set(a, a, a);
    // setScale(widhtScale);
    resolution.set(width, height);
    maskRt.setSize(width, height);
    calNormalRt.setSize(width, height);
    baseNormaRt.setSize(width, height);
    grayRt.setSize(width, height);
    depthRenderRt.setSize(width, height);
    mainRt.setSize(width, height);
    // mainRt2.setSize(width, height);
    const planeGeometry = new PlaneGeometry(width, height);
    console.log(planeGeometry);
    lutRt.setSize(width, height);
    if (globalConfig.debugTexture) {
      show();
    }
  }

  const testMap = textureLoader.load("/src/testGlsl/image2.png");
  const decorationMap = textureLoader.load("/src/assets/picture.png");
  const maps = {
    // probTexture: blendProbRt.texture,
    probTexture: maskRt.texture,
    // renderTexture: mainRt.texture,
    renderTexture: lutRt.texture,
    // renderTexture: grayRt.texture,
    // maskTexture: grayRt.texture,
    // particleMap: digitTexture,
    // highLightTexture: edgeDetectionRt.texture,
    // highLightTexture: edgeDetectionRt.texture,
    // normalTexture: normalRt.texture,
    normalTexture: baseNormaRt.texture,
    decorationMap,
    // normalTexture: blurRt2.texture,
    // depthTexture: depthBlendRt.texture,
    // depthTexture: depthRenderRt.texture,
    // depthTexture: globalDepthTexture,
    // highLightTexture: expandRt.texture,
  };
  globalConfig.maps = maps;
  function getRenderResultTexture() {
    // return probRt.texture;
    // return blendRt.texture;
    // return lowProbabilityRt.texture;
    return maps;
  }
  return {
    preTreatment,
    updatePipelineConfig,
    getRenderResultTexture,
    config,
  };
};
