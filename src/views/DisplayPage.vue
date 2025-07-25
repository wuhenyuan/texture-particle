<template>
  <ThreeScene ref="threescene" class="three-scene" />
  <div id="video-container">
    <div id="outputContianer">
      <canvas id="output"></canvas>
      <canvas id="mask"></canvas>
    </div>
    <div id="media">
      <!-- <h2>Media</h2> -->

      <!-- src="./assets/testVideo.mp4" -->
      <audio id="audio" autoplay></audio>
      <video
        id="video"
        style="width: 600px"
        muted="true"
        loop="true"
        autoplay="true"
        playsinline="true"
      ></video>
      <!-- src="./tiger.mp4" -->
    </div>
  </div>
</template>

<script setup>
import ThreeScene from "../components/PictureParticleScene.vue";
import { start, stop, uploadToHuman } from "../medium/client";
import { onMounted, ref } from "vue";
import { startAsr, stopAsr, startConnect } from "../medium/asr";
import { baseurl } from "../medium/config";
import { useGlobalConfig } from "@/stores";
const threescene = ref(null);
const isVideo = ref(false);

const config = useGlobalConfig();
const startHumen = () => {
  threescene.value?.start();
  const isLocal = config.isLocal;
  if (isLocal) return;
  try {
    if (config.isUseAsr) {
      startConnect();
    }
  } catch (e) {
    console.log(e);
  }
  // return;

  // 开启视频链接;

  try {
    start();
    dataChannel.onmessage = async (event) => {
      console.log("Received: ", event.data);
      if (event.data === "restartDigital") {
        reStart();
      }
    };
  } catch (e) {
    console.log(e);
  }
  isVideo.value = true;
};
const reStart = () => {
  window.stop = stop;
  window.stopAsr = stopAsr;
  // todo 重启时候禁用asr????
  config.hasFaceInfo = false;
  config.canPlay = false;
  config.isFaceReady = false;
  config.isTextureInit = false;
  console.log("isTextureInit", config.isTextureInit);
  config.needRestart = true;
  config.faceAera.set(0, 0, 0, 0);
  config.eyeBall.set(0, 0, 0, 0);

  threescene.value?.stop();
  const isLocal = config.isLocal;
  if (isLocal) return;
  try {
    if (config.isUseAsr) {
      stopAsr();
    }
  } catch (error) {
    console.log(error);
  } finally {
  }
  stop();

  console.log("-------------restart humen-----------");
  setTimeout(() => {
    startHumen();
  }, 1000);
};

window.startHumen = startHumen;

onMounted(() => {
  setTimeout(() => {
    startHumen();
  }, 2000);
});
</script>

<style>
#video-container {
  position: absolute;
}
#media {
  display: none;
}
</style>
