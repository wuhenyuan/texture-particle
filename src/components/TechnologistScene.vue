<!-- src/components/ThreeScene.vue -->
<template>
  <div ref="threeContainer" class="three-container">
    <div class="video-bg">
      <video autoplay loop muted playsinline>
        <source src="../assets/background1.mp4" type="video/mp4" />
      </video>
    </div>
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
  RGBFormat,
  AdditiveBlending,
  Color,
  DoubleSide,
} from "three";
import { edgeDetection } from "../webgl/edgedetection";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { onMounted, ref, render } from "vue";
import generateDigitTextureAtlas from "./useNumberTexture";
import usePostprocessing from "./usePostprocessing";

import { useTechnology } from "./useTechnology";
import ProbParticle from "../webgl/probParticle";
import useMediaPipe from "./useMediaPipe";
import { Points } from "three";
import Particles from "../webgl/particles";
import { getLineIndex, getFaceIndex, getMouseIndex } from "./partData";
import pointsPng from "../assets/point.png";

import { useGlobalConfig } from "@/stores/index";
import { DigitalRain } from "../webgl/DigitalRain";

const globalConfig = useGlobalConfig();

let preTreatment, updateTexture, getRenderResultTexture;

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
const NUM_KEYPOINTS = 478;
const vertices = new Float32Array(NUM_KEYPOINTS * 3); // 每个点有 x, y, z 三个坐标
const faceVertices = vertices;
const faceGeometryAttribute = new BufferAttribute(vertices, 3);
const renderConfig = globalConfig.config;
// window.faceGeometryAttribute = faceGeometryAttribute;
const initThree = (isLocal) => {
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

  // 创建视频纹理
  const video = document.getElementById("video");

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

  let videoTexture;
  video.addEventListener("loadedmetadata", () => {
    const { videoWidth, videoHeight } = video;

    const ratio = videoWidth / videoHeight;
    const texture = new VideoTexture(video);
    console.log(texture);
    // const texture = new VideoTexture(video);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;

    videoTexture = texture;
    const base = 100;
    const geometry = new PlaneGeometry(base, base / ratio);
    const material = new MeshBasicMaterial({ map: texture });
    // const material = new MeshBasicMaterial({ color: "#ffffff" });
    const plane = new Mesh(geometry, material);

    // scene.add(plane);
    // 如果隐藏了需要调用一次播放
    video.play();
  });

  let isInit = false;
  // play 是异步的
  video.addEventListener("canplay", () => {
    if (isInit) return;
    isInit = true;
    if (globalConfig.useFaceDetection) {
      startFaceDetect();
    }
    updateTexture(videoTexture, video);
    particle.updateTexture();
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
    requestAnimationFrame(animate);
    orbitControls.update();

    const delta = clock.getDelta();
    if (globalConfig.isFaceReady) {
      // faceLine.visible = true;
    }

    if (preTreatment) {
      preTreatment(delta);
    }

    if (updateLandMark) {
      updateLandMark();
    }

    if (rain) {
      rain.updateConfig(renderConfig);
      rain.update(delta);
    }

    if (globalConfig.isFaceReady) {
      particle.visible = true;
      digitalMesh.visible = globalConfig.showDigital;
    }
    particle.update(delta);
    if (particle.isDead) {
      digitalMesh.visible = true;
    }

    composer.updatePostprocessing(renderConfig);
    renderer.setClearAlpha(0);
    bloomComposer.render();
    // renderer.render(scene, camera);
    composer.render();
  };

  scene = scene;
  camera = camera;
  renderer = renderer;

  if (createFaceGeometry) createFaceGeometry();

  creaRain();
  const {
    preTreatment: _preTreatment,
    updatePipelineConfig: _updateTexture,
    getRenderResultTexture: _getRenderResultTexture,
    config,
  } = useTechnology(scene, renderer, camera, globalTexture);
  preTreatment = _preTreatment;
  updateTexture = _updateTexture;
  getRenderResultTexture = _getRenderResultTexture;

  const { renderTexture, maskTexture, digitalMesh } = getRenderResultTexture();
  // createDigitalHumanWrapper(renderTexture);
  particle = new Particles(scene, digitalMesh.material.uniforms.tDiffuse.value);
  // scene.add(particle);
  // particle.visible = true;
  particle.visible = false;
  // particle.scale.set(0.493, 0.493, 1);
  const scale = 1;
  particle.scale.set(scale, scale, 1);

  // globalConfig.particle = particle;
  window.particle = particle;
  scene.add(digitalMesh);
  rain.setMask(maskTexture);
  if (!globalConfig.isFaceReady) {
    digitalMesh.visible = false;
  }

  // setScale(0.1);
  // if (createBackground) createBackground();

  const isWebGL2 = renderer.capabilities.isWebGL2;
  console.log("WebGL2?", isWebGL2);
  animate();
};

const createBackground = () => {
  //   // 创建视频元素
  const backgroundVideo = document.createElement("video");
  backgroundVideo.src = "/src/assets/background2.mp4"; // 本地或网络路径
  backgroundVideo.crossOrigin = "anonymous"; // 如果需要跨域
  backgroundVideo.loop = true;
  backgroundVideo.muted = true;
  backgroundVideo.play(); // 触发播放
  // 创建 VideoTexture
  const videoTexture = new VideoTexture(backgroundVideo);
  videoTexture.minFilter = LinearFilter;
  videoTexture.magFilter = LinearFilter;
  videoTexture.format = RGBFormat;
  // 设置为场景背景
  scene.background = videoTexture;
};

let rain;
const creaRain = () => {
  const number = globalConfig.particleNumber;
  rain = new DigitalRain(number);
  rain.mesh.position.z = camera.position.z - 70;
  scene.add(rain.mesh);
  rain.setResolution(width, height);
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

function detectP() {
  detectPicture(image);
}

defineExpose({
  initThree,
  startFaceDetect,
  detectP,
});

onMounted(() => {
  width = threeContainer.value.clientWidth;
  height = threeContainer.value.clientHeight;
  ratio = width / height;
  if (globalConfig.isLocal) {
    initThree(globalConfig.isLocal);
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
  display: none;
}

.video-bg video {
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
