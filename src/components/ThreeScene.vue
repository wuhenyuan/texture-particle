<!-- src/components/ThreeScene.vue -->
<template>
  <div ref="threeContainer" class="three-container">
    <div ref="imageContainer" class="image-container"></div>
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

let preTreatment, updateTexture, getRenderResultTexture;

let globalTexture;
let scene;
let camera;
let renderer;
let clock;
const threeContainer = ref(null);
const imageContainer = ref(null);
let width;
let height;
let ratio;
let particles;
let composer;
let startDetecte, detectPicture;

let image;
const initThree = (isLocal) => {
  // 创建场景
  scene = new Scene();

  // 创建相机
  camera = new PerspectiveCamera(50, ratio, 1, 10000);
  camera.position.z = 300;

  clock = new Clock(true);

  // 创建渲染器
  renderer = new WebGLRenderer();

  renderer.setClearColor(0x000000);

  renderer.setSize(width, height);
  // renderer.outputColorSpace = SRGBColorSpace;

  // 将渲染器的 DOM 元素添加到容器中
  threeContainer.value.appendChild(renderer.domElement);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.25;
  orbitControls.screenSpacePanning = false;
  orbitControls.maxPolarAngle = Math.PI / 2;

  // 创建视频纹理
  const video = document.getElementById("video");

  if (isLocal) {
    // video.src = "/src/assets/testVideo.mp4"; // 设置视频路径
    video.src = "/src/assets/jialuoVideo.mp4"; // 设置视频路径
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
    updateTexture(videoTexture, video);
    //   // 使用概率分布图作为采样图
    const { probTexture, maskTexture, highLightTexture } =
      getRenderResultTexture();
    particles.init(probTexture, video);
    particles.setMaskMap(maskTexture);
    particles.setHighLightMap(highLightTexture);
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

    if (preTreatment) {
      preTreatment(delta);
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
  const { startDetecte: _start, detectPicture: _dp } = useMediaPipe();
  startDetecte = _start;
  detectPicture = _dp;
  initThree(true);
});
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  /* background: #000; */
}
</style>
