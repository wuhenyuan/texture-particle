<template>
  <div class="fullpage-wrapper">
    <router-view />
  </div>
</template>

<script setup>
// 不需要额外代码
</script>

<style scoped>
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
.fullpage-wrapper {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  height: 100vh; /* 高度撑满整个视口 */
  width: 100vw;
  box-sizing: border-box;
  padding: 0px; /* 可选，防止内容贴边 */
  margin: 0px;
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
  /* display: none; */
}
</style>
