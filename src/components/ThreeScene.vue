<!-- src/components/ThreeScene.vue -->
<template>
  <div ref="threeContainer" class="three-container"></div>
</template>

<script>
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
  LinearFilter,
  TextureLoader,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { color, texture } from "three/tsl";
import Particles from "../webgl/particles";
import { ClampToEdgeWrapping } from "three";
export default {
  name: "ThreeScene",
  mounted() {
    // this.initThree();
  },
  methods: {
    initThree() {
      // 创建场景
      const scene = new Scene();

      const ratio =
        this.$refs.threeContainer.clientWidth /
        this.$refs.threeContainer.clientHeight;

      // 创建相机
      const camera = new PerspectiveCamera(50, ratio, 1, 10000);
      camera.position.z = 300;

      this.clock = new Clock(true);

      // 创建渲染器
      const renderer = new WebGLRenderer();
      console.log(this.$refs.threeContainer.clientWidth);
      console.log(this.$refs.threeContainer.clientHeight);
      renderer.setSize(
        this.$refs.threeContainer.clientWidth,
        this.$refs.threeContainer.clientHeight
      );
      // renderer.outputColorSpace = SRGBColorSpace;

      // 将渲染器的 DOM 元素添加到容器中
      this.$refs.threeContainer.appendChild(renderer.domElement);

      const clock = new Clock();

      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.25;
      orbitControls.screenSpacePanning = false;
      orbitControls.maxPolarAngle = Math.PI / 2;

      // 创建视频纹理
      // const video = document.createElement("video");
      // video.src = "/src/components/test.mp4"; // 设置视频路径
      // video.loop = true;
      // video.autoplay = true;
      // video.muted = true; // 在某些浏览器中，视频需要静音才能自动播放
      // video.load();
      // video.play(); // 开始播放视频

      // 将视频元素隐藏
      // video.style.display = "none";
      // document.body.appendChild(video); // 将视频元素添加到body中，但设置为不可见

      const video = document.getElementById("video");

      // test particle
      const textureLoader = new TextureLoader();
      const particles = new Particles(scene, ratio);

      video.addEventListener("loadedmetadata", () => {
        debugger;
        const { videoWidth, videoHeight } = video;

        const ratio = videoWidth / videoHeight;
        const texture = new VideoTexture(video);
        console.log(texture);
        // const texture = new VideoTexture(video);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;

        const base = 100;
        const geometry = new PlaneGeometry(base, base / ratio);
        const material = new MeshBasicMaterial({ map: texture });
        // const material = new MeshBasicMaterial({ color: "#ffffff" });
        const plane = new Mesh(geometry, material);

        particles.init(texture, video);

        // scene.add(plane);
        // 如果隐藏了需要调用一次播放
        video.play();
      });
      textureLoader.load("/src/assets/haoge.png", (texture) => {
        const ratio = texture.image.width / texture.image.height;
        let repeatX = 1,
          repeatY = 1;
        let offsetX = 0,
          offsetY = 0;
        if (ratio < 1) {
          repeatX = 1 / ratio;
          offsetX = (1 - repeatX) / 2;
        } else {
          repeatY = ratio;
          offsetY = (1 - repeatY) / 2;
        }
        const base = 100;
        texture.repeat.set(repeatX, repeatY);
        texture.offset.set(offsetX, offsetY);
        texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
        texture.needsUpdate = true;
        // particles.init(texture);
      });

      textureLoader.load("/src/assets/3.png", (texture) => {
        debugger;
        console.log(texture.image.width);
        // const ratio = texture.image.width / texture.image.height;
        let repeatX = 1,
          repeatY = 1;
        let offsetX = 0,
          offsetY = 0;
        if (ratio < 1) {
          repeatX = 1 / ratio;
          offsetX = (1 - repeatX) / 2;
        } else {
          repeatY = ratio;
          offsetY = (1 - repeatY) / 2;
        }
        // texture.repeat.set(repeatX, repeatY);
        // texture.offset.set(offsetX, offsetY);
        // texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
        particles.setParticleMap(texture);
        texture.needsUpdate = true;
      });

      // scene.add(
      //   new Mesh(
      //     new PlaneGeometry(5, 5),
      //     new MeshBasicMaterial({ color: 0xffffff })
      //   )
      // );

      window.scene = scene;

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        orbitControls.update();

        const delta = clock.getDelta();
        // if (particles.material) {
        //   particles.material.uniforms.uTime.value += delta;
        // }
        if (particles) {
          particles.update(delta);
        }

        renderer.render(scene, camera);
      };

      animate();
    },
  },
};
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  /* background: #000; */
}
</style>
