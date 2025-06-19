<template>
  <div id="app">
    <ThreeScene ref="threescene" class="three-scene" />
    <div class="control">
      <button id="start" @click="start">开始</button>
      <button id="stop" @click="stop">结束</button>
      <div>
        <h3>对话</h3>
        <input v-model="inputValue" />
        <button @click="send">发送</button>
      </div>
      <div class="asr-result">
        <textarea
          rows="10"
          id="varArea"
          readonly="true"
          style="width: 100%; height: 100%"
        ></textarea>
      </div>
      <div id="media">
        <h2>Media</h2>

        <audio id="audio" autoplay="true"></audio>
        <video
          src="./assets/testVideo.mp4"
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
  </div>
</template>

<script>
import ThreeScene from "./components/ThreeScene.vue";
import { start, stop, uploadToHuman } from "./medium/client";
import { startAsr, stopAsr, startConnect } from "./medium/asr";
export default {
  name: "App",
  components: {
    ThreeScene,
  },
  data() {
    return {
      inputValue: "",
    };
  },
  methods: {
    start() {
      this.$refs.threescene.initThree();
      // return;
      // startConnect();
      // 开启视频链接
      // start();
    },
    stop() {
      stopAsr();
      stop();
    },
    send() {
      uploadToHuman(this.inputValue);
    },
  },
};
</script>

<style scoped>
html,
body,
div {
  margin: 0;
}
#app {
  width: 100vw;
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  max-width: 2000px !important;
  margin: 0 auto;
  padding: 0 !important;
  display: flex;
}
.asr-result {
  width: 600px;
}
.control {
  display: absolute;
  width: 700px;
  left: 0;
  right: 0;
}
.three-scene {
  flex: 1;
}
#video {
  /* display: none; */
}
</style>
