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
import Particles from "../webgl/particles";
import { onMounted, ref, render } from "vue";
import generateDigitTextureAtlas from "./useNumberTexture";
import usePostprocessing from "./usePostprocessing";

import usePileline from "./usePipeline";
import ProbParticle from "../webgl/probParticle";
import useMediaPipe from "./useMediaPipe";
import { Points } from "three";
import { AmbientLight } from "three";
import { PointLight } from "three";
import { LineBasicMaterial } from "three";
import { LineSegments } from "three";
import { getLineIndex, getFaceIndex } from "./partData";
import pointsPng from "../assets/point.png";

import { useGlobalConfig } from "@/stores/index";

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
let particles;
let composer;
let startDetecte, detectPicture, updateLandMark;
let landMarksPosition;

let image;
const NUM_KEYPOINTS = 478;
const vertices = new Float32Array(NUM_KEYPOINTS * 3); // 每个点有 x, y, z 三个坐标
const faceVertices = vertices;
const faceGeometryAttribute = new BufferAttribute(vertices, 3);
window.faceGeometryAttribute = faceGeometryAttribute;
const initThree = (isLocal) => {
  // 创建场景
  scene = new Scene();

  // 创建相机
  camera = new PerspectiveCamera(50, ratio, 1, 10000);
  camera.position.x = -66.84943545428499;
  camera.position.y = 0;
  camera.position.z = 828.0763075633806;
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
    video.src = "/src/assets/shipinTest.mp4"; // 设置视频路径
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
  // const particles = new Particles(scene, ratio);
  particles = new ProbParticle(scene, ratio);

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

    // 播放好像还需要处理
    // setTimeout(() => {
    //   // updateTexture(texture, video);
    //   // //   // 使用概率分布图作为采样图
    //   // const probTexture = getRenderResultTexture();
    //   // particles.init(probTexture, video);
    // }, 10);
    // startDetecte();
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
    //   // 使用概率分布图作为采样图
    const {
      probTexture,
      maskTexture,
      highLightTexture,
      normalTexture,
      depthTexture,
    } = getRenderResultTexture();
    particles.init(probTexture, video);
    particles.setMaskMap(maskTexture);
    particles.setHighLightMap(highLightTexture);
    particles.setNormalMap(normalTexture);
    particles.setDepthMap(depthTexture);
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
  // textureLoader.load("/src/assets/haoge.png", (texture) => {
  //   // textureLoader.load("/src/assets/meizi.png", (texture) => {
  //   console.log(texture.image.width, texture.image.height);
  //   console.log(texture.image.width, texture.image.height);
  //   console.log(texture.image.width, texture.image.height);
  //   console.log(texture.image.width, texture.image.height);
  //   console.log(texture.image.width, texture.image.height);
  //   const ratio = texture.image.width / texture.image.height;
  //   let repeatX = 1,
  //     repeatY = 1;
  //   let offsetX = 0,
  //     offsetY = 0;
  //   if (ratio < 1) {
  //     repeatX = 1 / ratio;
  //     offsetX = (1 - repeatX) / 2;
  //   } else {
  //     repeatY = ratio;
  //     offsetY = (1 - repeatY) / 2;
  //   }
  //   const base = 100;
  //   texture.repeat.set(repeatX, repeatY);
  //   texture.offset.set(offsetX, offsetY);
  //   texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  //   texture.needsUpdate = true;
  //   globalTexture = texture;
  //   // this.initEdgeDetectino();
  //   // initPipeLine();
  //   updateTexture(texture);
  //   // 使用概率分布图作为采样图
  //   const probTexture = getRenderResultTexture();
  //   particles.init(probTexture);
  // });

  // textureLoader.load("/src/assets/3.png", (texture) => {
  //   console.log(texture.image.width);
  //   // const ratio = texture.image.width / texture.image.height;
  //   let repeatX = 1,
  //     repeatY = 1;
  //   let offsetX = 0,
  //     offsetY = 0;
  //   if (ratio < 1) {
  //     repeatX = 1 / ratio;
  //     offsetX = (1 - repeatX) / 2;
  //   } else {
  //     repeatY = ratio;
  //     offsetY = (1 - repeatY) / 2;
  //   }
  //   // texture.repeat.set(repeatX, repeatY);
  //   // texture.offset.set(offsetX, offsetY);
  //   // texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  //   // particles.setParticleMap(texture);
  //   texture.needsUpdate = true;
  // });
  const pointsTexutre = textureLoader.load(pointsPng, (texture) => {
    console.log(texture.image.width);
    pointsMaterial.map = texture;
  });

  const pointsMaterial = new PointsMaterial({
    size: 1,
    color: new Color(0xa9bbca),
    name: "pointMateral",
    blending: AdditiveBlending,
    // opacity: 0.5,
    map: pointsTexutre,
    transparent: true,
    depthTest: false,

    // renderOrder: 10,
  });

  const points = new Points(new BufferGeometry(), pointsMaterial);
  // points.position.z = 1;
  console.log("----points");

  points.geometry.setAttribute("position", faceGeometryAttribute);

  landMarksPosition = points.geometry.attributes.position;

  scene.add(points);
  const scale = 1;
  points.scale.set(1, ratio, 1);
  console.log(ratio);
  // points.rotateY = -Math.PI / 2;
  // const z = 9.479999999999842;
  // points.rotation.set(0, 0, z);
  window.points = points;
  window.scene = scene;

  composer = usePostprocessing(scene, renderer, camera);

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
    orbitControls.update();

    renderer.clear();
    const delta = clock.getDelta();
    // if (particles.material) {
    //   particles.material.uniforms.uTime.value += delta;
    // }
    if (particles) {
      particles.update(delta);
    }

    if (globalConfig.isFaceReady) {
      // faceLine.visible = true;
    }

    if (preTreatment) {
      preTreatment(delta);
    }

    if (updateLandMark) {
      updateLandMark(landMarksPosition);
    }

    // renderer.render(scene, camera);
    composer.render();
  };

  animate();

  scene = scene;
  camera = camera;
  renderer = renderer;

  const {
    preTreatment: _preTreatment,
    updatePipelineConfig: _updateTexture,
    getRenderResultTexture: _getRenderResultTexture,
    config,
  } = usePileline(scene, renderer, camera, globalTexture);
  preTreatment = _preTreatment;
  updateTexture = _updateTexture;
  getRenderResultTexture = _getRenderResultTexture;

  particles.resolution.set(width, height);
  particles.config = config;

  const numberTexture = generateDigitTextureAtlas();
  particles.setParticleMap(numberTexture);
  // if (createBackground) createBackground();
  if (createOutlookLine) createOutlookLine();

  const visible = false;
  points.visible = visible;
  faceLine.visible = visible;
  faceMesh.visible = visible;
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

const createOutlookLine = () => {
  const ambientLight = new AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const pointLight = new PointLight(0xffffff, 0.5);
  pointLight.position.set(2, 5, 5);
  scene.add(pointLight);

  const NUM_KEYPOINTS = 478;
  const faceGeometry = new BufferGeometry();
  faceGeometry.setAttribute("position", faceGeometryAttribute);

  faceGeometry.setIndex(getLineIndex());
  const material = new LineBasicMaterial({
    color: 0x0099ff,
    // linewidth: 10,
    transparent: true,
    opacity: 0.1,
    renderOrder: 1,
  });
  window.lineGeometry = faceGeometry;
  const faceLine = new LineSegments(faceGeometry, material);
  window.faceLine = faceLine;
  scene.add(faceLine);

  const NUM_RANDOM_LINES = 500;
  const randomGeometry = new BufferGeometry();
  // NUM_RANDOM_LINES * 2 个点，因为一条线需要2个点
  const randomVertices = new Float32Array(NUM_RANDOM_LINES * 2 * 3);
  randomGeometry.setAttribute(
    "position",
    new BufferAttribute(randomVertices, 3)
  );
  const randomMaterial = new LineBasicMaterial({
    color: 0x845ef7,
    transparent: true,
    opacity: 0.5,
  });
  const randomLines = new LineSegments(randomGeometry, randomMaterial);
  randomLines.scale.x = -1;
  window.randomLines = randomLines;
  scene.add(randomLines);

  const faceGeometry2 = new BufferGeometry();
  faceGeometry2.setAttribute("position", faceGeometryAttribute);

  faceGeometry2.setIndex(getFaceIndex());

  const faceMesh = new Mesh(
    faceGeometry2,
    new MeshBasicMaterial({
      color: 0xffffff,
      side: DoubleSide,
      transparent: true,
      opacity: 0.5,
    })
  );
  window.faceMesh = faceMesh;
  scene.add(faceMesh);
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
  if (globalConfig.isLocal) {
    initThree(globalConfig.isLocal);
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
  /* 如果你不需要交互 */
  /* pointer-events: none; */
}
</style>
