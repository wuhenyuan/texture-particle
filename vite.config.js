import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import glsl from "vite-plugin-glslify-inject";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    glsl({
      include: "./src/webgl/*.(vert|frag|glsl)",
      exclude: "node_modules/**",
      // types: { library: "threejs" },
    }),
  ],
  server: {
    host: "0.0.0.0",
    // host: "127.0.0.1",
    port: 9990,
    proxy: {
      "/offer": {
        target: "http://10.7.3.50:8010",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/offer/, "/offer"), //请求路径加上'/train'
      },
      "/human": {
        target: "http://10.7.3.50:8010",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/human/, "/human"), //请求路径加上'/train'
      },
    },
  },
});
