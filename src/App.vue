<template>
  <div id="app">
    <ThreeScene ref="threescene" class="three-scene" />
    <div class="control">
      <button id="startFace" @click="startFace">开始人脸</button>
      <button id="start" @click="start">开始</button>
      <button id="stop" @click="stop">结束</button>
      <button id="exportButton">导出图片</button>
      <!-- <img id="img" /> -->
      <div class="gender-selector">
        <label>
          <input type="radio" name="gender" value="0" v-model="gender" />
          女生
        </label>
        <label>
          <input type="radio" name="gender" value="1" v-model="gender" />
          男生
        </label>
      </div>
      <h2>上传文件</h2>
      <form @submit.prevent="handleUpload">
        <input type="file" ref="fileInput" required />
        <button type="submit" :disabled="loading">
          {{ loading ? "上传中..." : "上传" }}
        </button>
      </form>
      <p v-if="message">{{ message }}</p>
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
      <div id="outputContianer">
        <canvas id="output"></canvas>
        <canvas id="mask"></canvas>
      </div>
      <div id="media">
        <h2>Media</h2>

        <!-- src="./assets/testVideo.mp4" -->
        <audio id="audio" autoplay="true"></audio>
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
  </div>
</template>

<script>
// import ThreeScene from "./components/ParticleScene.vue";
// import ThreeScene from "./components/TechnologistScene.vue";
import ThreeScene from "./components/PictureParticleScene.vue";
import { start, stop, uploadToHuman } from "./medium/client";
import { startAsr, stopAsr, startConnect } from "./medium/asr";
import { DebugEnvironment } from "three/examples/jsm/Addons.js";
import { useGlobalConfig } from "@/stores";
export default {
  name: "App",
  components: {
    ThreeScene,
  },
  data() {
    return {
      inputValue: "",
      loading: false,
      message: "",
      isVideo: false,
      gender: 0, // 0女 1男
    };
  },
  methods: {
    startFace() {
      this.$refs.threescene.startFaceDetect();
      // this.$refs.threescene.detectP();
    },
    start() {
      const config = useGlobalConfig();
      const isLocal = config.isLocal;
      this.$refs.threescene.initThree(isLocal);
      // debugger;
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

      start();
      this.isVideo = true;
    },
    stop() {
      window.stop = stop;
      window.stopAsr = stopAsr;
      const config = useGlobalConfig();
      try {
        if (config.isUseAsr) {
          stopAsr();
        }
        stop();
      } catch (error) {
        console.log(error);
      } finally {
      }
      stop();
    },
    send() {
      uploadToHuman(this.inputValue);
    },
    async handleUpload() {
      const globalconfig = useGlobalConfig();
      const file = this.$refs.fileInput.files[0];
      if (!file) {
        message.value = "请先选择文件";
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", this.gender);
      this.loading = true;
      this.message = "上传中，请稍候...";

      // return;
      try {
        const response = await fetch("http://10.7.3.50:8010/create_human", {
          // const response = await fetch("http://10.7.11.111:8010/create_human", {
          method: "POST",
          body: formData,
        });
        // .then((res) => res.blob())
        // .then((blob) => createImageBitmap(blob))
        // .then((bitmap) => {
        //   globalconfig.depthPictureBitmap = bitmap;
        // });
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);
        globalconfig.depthPictureBitmap = imageBitmap;

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        } else {
          console.log("reponse ok");
        }

        // if (this.isVideo) {
        //   this.stop();
        //   setTimeout(() => {
        //     this.start();
        //   }, 1000);
        // } else {
        //   this.start();
        // }

        // const result = await response.json();
        // this.message = "上传成功: " + JSON.stringify(result);
        // console.log(this.message);
      } catch (err) {
        this.message = "上传失败: " + err.message;
      } finally {
        this.loading = false;
      }
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

#output {
  width: 200px;
  height: 200px;
  /* display: none; */
}
#video {
  display: none;
}
</style>
