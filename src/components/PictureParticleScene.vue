<!-- src/components/ThreeScene.vue -->
<template>
  <div ref="threeContainer" class="three-container">
    <!-- <div class="video-bg"> -->
    <!-- <video autoplay loop muted playsinline>
        <source src="../assets/background1.mp4" type="video/mp4" />
      </video> -->
    <!-- <img src="../assets/background.png" alt="" /> -->
    <!-- </div> -->
    <div ref="imageContainer" class="image-container"></div>
    <canvas ref="canvasRef" class=".three-canvas"></canvas>
  </div>
</template>

<script setup>
// import * as THREE from "three";
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
  NearestFilter,
  TextureLoader,
  ShaderMaterial,
  WebGLRenderTarget,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ClampToEdgeWrapping,
  Vector2,
  PointsMaterial,
  BufferAttribute,
  LinearFilter,
  LinearMipMapLinearFilter,
  RGBFormat,
  AdditiveBlending,
  Color,
  DoubleSide,
} from "three";
import { edgeDetection } from "../webgl/edgedetection";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { onMounted, ref, render, toRaw } from "vue";
import generateDigitTextureAtlas from "./useNumberTexture";
import usePostprocessing from "./usePostprocessing";

import { usePictureScene } from "./usePictureScene";
import ProbParticle from "../webgl/probParticle";
import useMediaPipe from "./useMediaPipe";
import { Points } from "three";
import Particles from "../webgl/particles";
import { getLineIndex, getFaceIndex, getMouseIndex } from "./partData";
import FloatingParticles from "../webgl/FloatingParticles";
import pointsPng from "../assets/point.png";

import { useGlobalConfig } from "@/stores/index";

const globalConfig = useGlobalConfig();

let preTreatment, updatePipelineConfig, getRenderResultTexture;

let globalTexture;
let scene;
let camera;
let renderer;
let clock;
const threeContainer = ref(null);
const imageContainer = ref(null);
const canvasRef = ref(null);
let width;
let height;
let ratio;
let composer, bloomComposer;
let startDetecte, detectPicture, updateLandMark;
let landMarksPosition;
let image;
let particle;
let flaotParticle;
const NUM_KEYPOINTS = 478;
const vertices = new Float32Array(NUM_KEYPOINTS * 3); // 每个点有 x, y, z 三个坐标
const faceVertices = vertices;
const faceGeometryAttribute = new BufferAttribute(vertices, 3);
const renderConfig = globalConfig.config;

let videoTexture;
// 创建视频纹理
let video = document.getElementById("video");
// window.faceGeometryAttribute = faceGeometryAttribute;
const initThree = () => {
  const isLocal = globalConfig.isLocal;
  // 创建场景
  scene = new Scene();
  // 创建相机
  camera = new PerspectiveCamera(50, ratio, 1, 10000);
  // camera.position.x = -66.84943545428499;
  // camera.position.y = 0;
  // camera.position.z = 828.0763075633806;
  camera.position.set(...globalConfig.cameraPosition);
  // camera.position.z = 1368;

  window.camera = camera;
  clock = new Clock(true);

  // 创建渲染器
  renderer = new WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true, // ✅ 允许透明背景
    antialias: true,
  });

  renderer.setClearColor(0x000000);
  renderer.setClearAlpha(0);

  renderer.setSize(width, height);
  // renderer.outputColorSpace = SRGBColorSpace;

  // 将渲染器的 DOM 元素添加到容器中
  // threeContainer.value.appendChild(renderer.domElement);
  // renderer.domElement
  renderer.domElement.classList.add("three-canvas");
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.25;
  orbitControls.screenSpacePanning = false;
  orbitControls.maxPolarAngle = Math.PI / 2;
  orbitControls.enabled = globalConfig.isUseOrbital;
  video = document.getElementById("video");

  if (isLocal) {
    // video.src = "/src/assets/testVideo.mp4"; // 设置视频路径
    // video.src = "/src/assets/lijialuoTest2.mp4"; // 设置视频路径
    video.src = "/src/assets/jialuoTest.mp4"; // 设置视频路径
    // video.src = "/src/assets/jialuoVideo.mp4"; // 设置视频路径
    video.loop = true;
    video.autoplay = true;
    video.muted = true; // 在某些浏览器中，视频需要静音才能自动播放
    video.load();
    video.play(); // 开始播放视频
    // 将视频元素隐藏;
    // video.style.displa/y = "none";
    // document.body.appendChild(video); // 将视频元素添加到body中，但设置为不可见
    // const video = document.getElementById("video");
  }

  // test particle
  const textureLoader = new TextureLoader();

  // const background = textureLoader.load("/src/assets/background.png");

  video.addEventListener("loadedmetadata", () => {
    console.log(
      "-------------------------loadedMetadata-------------------------"
    );
    const { videoWidth, videoHeight } = video;

    const ratio = videoWidth / videoHeight;
    const texture = new VideoTexture(video);
    console.log(texture);
    // const texture = new VideoTexture(video);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    // texture.generateMipmaps = true;

    videoTexture = texture;
    // const base = 100;
    // const geometry = new PlaneGeometry(base, base / ratio);
    // const material = new MeshBasicMaterial({ map: texture });
    // const material = new MeshBasicMaterial({ color: "#ffffff" });
    // const plane = new Mesh(geometry, material);

    // scene.add(plane);
    // 如果隐藏了需要调用一次播放
    video.play();
  });

  // play 是异步的
  video.addEventListener("canplay", () => {
    if (globalConfig.canPlay) return;
    globalConfig.canPlay = true;
    if (globalConfig.useFaceDetection) {
      startFaceDetect();
    }
    //   // 使用概率分布图作为采样图
  });

  if (isLocal) {
    image = new Image();
    // imageContainer.value.appendChild(image);
    // image.src = "/src/assets/nvde2.png";
    // image.src = "/src/assets/haoge.png";
    image.src = "/src/assets/jialuo2.jpg";
    // image.src = "/src/assets/jialuo1.jpg";
    // image.src = "/src/assets/jialuo.jpg";

    image.onload = () => {
      // detectPicture(image);
    };
  }

  ({ composer, bloomComposer } = usePostprocessing(scene, renderer, camera));

  // 动画循环
  const animate = () => {
    // if ()
    requestAnimationFrame(animate);
    if (globalConfig.isFaceReady) {
      if (!particle) createParticles();
      if (!flaotParticle) createFloatParticles();
      if (globalConfig.needRestart) {
        restartParticle();
      }
    }

    if (globalConfig.isUseOrbital) {
      orbitControls.update();
    }

    const delta = clock.getDelta();
    if (globalConfig.isFaceReady) {
      // faceLine.visible = true;
    }

    if (globalConfig.needUpdateParticleSize) {
      updatePipelineConfig(videoTexture, video);
      particle?.updateTexture();
      updateHunmen();
    }

    if (preTreatment) {
      preTreatment(delta);
    }

    if (updateLandMark) {
      updateLandMark();
    }

    if (particle && flaotParticle) {
      particle.update(delta);
      flaotParticle.update(delta);
    }
    if (backgroundMesh) {
      backgroundMesh.material.uniforms.uTime.value += delta;
      backgroundMesh.visible = toRaw(globalConfig.config.isShowBackground);
      // bColor1: 0xcadedb,
      // bColor2: 0xd1e7dd,
      // bColor3: 0xdceaeb,
      // bColor4: 0xe0f2fe,
      backgroundMesh.material.uniforms.uColor1.value.set(
        globalConfig.config.bColor1
      );
      backgroundMesh.material.uniforms.uColor2.value.set(
        globalConfig.config.bColor2
      );
      backgroundMesh.material.uniforms.uColor3.value.set(
        globalConfig.config.bColor3
      );
      backgroundMesh.material.uniforms.uColor4.value.set(
        globalConfig.config.bColor4
      );
    }

    if (globalConfig.isUsePostProcessing) {
      // scene.background = null;
      backgroundMesh.visible = false;
      composer.updatePostprocessing(renderConfig);
      renderer.setClearAlpha(0);
      bloomComposer.render();
      // backgroundMesh.visible = true;

      backgroundMesh.visible = toRaw(globalConfig.config.isShowBackground);
      // scene.background = background;
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };

  scene = scene;
  // scene.background = background;
  camera = camera;
  renderer = renderer;

  if (createFaceGeometry) createFaceGeometry();

  const {
    preTreatment: _preTreatment,
    updatePipelineConfig: _updateTexture,
    getRenderResultTexture: _getRenderResultTexture,
    config,
  } = usePictureScene(scene, renderer, camera, globalTexture);
  preTreatment = _preTreatment;
  updatePipelineConfig = _updateTexture;

  // setScale(0.1);
  if (createBackground) createBackground();

  const isWebGL2 = renderer.capabilities.isWebGL2;
  console.log("WebGL2?", isWebGL2);
  animate();
};

function updateHunmen() {
  const faceAera = globalConfig.faceAera;
  const dy = (faceAera.y + faceAera.w) / 2 - 0.5;
  particle.position.y -= Math.floor(dy * points.height);
  console.log(particle.position.y);
}

const createParticles = () => {
  updatePipelineConfig(videoTexture, video);
  // createDigitalHumanWrapper(renderTexture);
  particle = new Particles(scene, globalConfig.maps.renderTexture);
  particle.visible = globalConfig.particleVisible;
  // scene.add(particle);
  // particle.visible = true;
  // particle.visible = false;
  // particle.scale.set(0.493, 0.493, 1);
  // const scale = 1;
  // particle.scale.set(scale, scale, 1);

  // 更新一下人脸位置
  // globalConfig.particle = particle;
  // window.particle =  ;
  updateHunmen();
};
const createFloatParticles = () => {
  const faceAera = globalConfig.faceAera;
  const centerx = ((faceAera.x + faceAera.z - 1.0) * particle.width) / 2;
  const centery = ((faceAera.y + faceAera.w - 1.0) * particle.height) / 2;

  flaotParticle = new FloatingParticles(
    scene,
    1200,
    new Vector3(centerx, centery, 0),
    40,
    70,
    // new Vector3(centerx, centery, 0)
    50
  );
  flaotParticle.resolution.set(width, height);
  flaotParticle.particles.scale.y = 0.8;
  flaotParticle.particles.scale.x = points.width / points.height;
};

const createFaceGeometry = () => {
  const faceGeometry = new BufferGeometry();
  faceGeometry.setAttribute("position", faceGeometryAttribute);
  faceGeometry.setIndex(getFaceIndex());
  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute("position", faceGeometryAttribute);
  pointGeometry.setIndex(getMouseIndex());
  const points = new Points(
    pointGeometry,
    new PointsMaterial({
      size: 8,
      color: new Color(0xa9bbca),
      name: "pointMateral",
      blending: AdditiveBlending,
      // opacity: 0.5,
      // map: pointsTexutre,
      transparent: true,
      depthTest: false,

      // renderOrder: 10,
    })
  );

  const pointGeometr2y = new BufferGeometry();
  pointGeometr2y.setAttribute("position", faceGeometryAttribute);
  pointGeometr2y.setIndex(getFaceIndex());
  const points2 = new Points(
    pointGeometr2y,
    new PointsMaterial({
      size: 4,
      color: new Color(0xa9bbca),
      name: "pointMateral",
      blending: AdditiveBlending,
      // opacity: 0.5,
      // map: pointsTexutre,
      transparent: true,
      depthTest: false,

      // renderOrder: 10,
    })
  );
  // scene.add(points);
  // scene.add(points2);
  // points.scale.set(570 * 2, 792 * 2, 1000);
  // points2.scale.set(570, 792, 1000);
  globalConfig.faceGeometry = faceGeometry;
};
function startFaceDetect() {
  startDetecte();
}

function restartParticle() {
  particle.start();
  flaotParticle.start();
}

let backgroundMesh;
const createBackground = () => {
  const shaderMaterial = new ShaderMaterial({
    uniforms: {
      // 颜色更接近初始版本，柔和且过渡自然
      uColor1: { value: new Color(0xcadedb) }, // 中心浅青绿色
      uColor2: { value: new Color(0xd1e7dd) }, // 过渡浅青绿
      uColor3: { value: new Color(0xdceaeb) }, // 过渡浅蓝白
      uColor4: { value: new Color(0xe0f2fe) }, // 边缘浅蓝色
      uTime: { value: 0 }, // 时间变量
      uResolution: {
        value: new Vector2(width, height),
      },
    },
    transparent: true,
    vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0); // 全屏覆盖
    }
  `,
    fragmentShader: `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform float uTime;
    uniform vec2 uResolution;

    // 平滑过渡函数
    float smoothStep(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }

    void main() {
      // 计算UV坐标
      vec2 uv = gl_FragCoord.xy / uResolution;
      
      // 轻微扭曲效果，保持柔和
      uv.x += sin(uv.y * 4.0 + uTime * 0.15) * 0.008;
      uv.y += cos(uv.x * 4.0 + uTime * 0.2) * 0.008;
      
      // 计算到中心的距离
      float dist = distance(uv, vec2(0.5, 0.5));
      
      // 调整过渡范围，保持初始风格的过渡比例
      vec3 color = mix(uColor1, uColor2, smoothStep(0.0, 0.25, dist));
      color = mix(color, uColor3, smoothStep(0.2, 0.5, dist));
      color = mix(color, uColor4, smoothStep(0.4, 0.9, dist));
      
      // 减弱色彩波动，保持柔和感
      color.r += sin(dist * 8.0 + uTime) * 0.05;
      color.g += cos(dist * 6.0 + uTime * 0.7) * 0.05;
      color.b += sin(dist * 10.0 + uTime * 1.0) * 0.05;
      
      gl_FragColor = vec4(color, 0.2);
    }
  `,
  });
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
  backgroundMesh = new Mesh(getFSGeometry(), shaderMaterial);
  scene.add(backgroundMesh);
};

function start() {
  if (globalConfig.isThreeInit) {
    // 等待视频链接
    // 模拟视频重连
  } else {
    initThree();
    globalConfig.isThreeInit = true;
  }
}

function stop() {
  if (!particle || !flaotParticle) return;
  particle.stop();
  flaotParticle.stop();
}

defineExpose({
  start,
  startFaceDetect,
  // detectP,
  stop,
});

onMounted(() => {
  width = threeContainer.value.clientWidth;
  height = threeContainer.value.clientHeight;
  ratio = width / height;
  if (globalConfig.isLocal) {
    start();
  }
  if (globalConfig.useFaceDetection) {
    const {
      startDetecte: _start,
      detectPicture: _dp,
      updateLandMark: _up,
    } = useMediaPipe();
    startDetecte = _start;
    detectPicture = _dp;
    updateLandMark = _up;
  }

  // createBackground();
});
</script>

<style>
.three-container {
  width: 100%;
  height: 100vh;
  width: 1040px;
  height: 1040px;
  max-width: 1040px;
  max-height: 1040px;
  position: relative;
  /* background: #000; */
}

.video-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  filter: blur(10px);
  overflow: hidden;
  /* display: none; */
}

.video-bg image {
  /* width: 100%;
  height: 100%; */
  object-fit: cover;
}

.three-container .three-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background: #000000;
  /* 如果你不需要交互 */
  /* pointer-events: none; */
}
</style>
