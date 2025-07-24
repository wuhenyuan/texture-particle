// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import UploadPage from "../views/UploadPage.vue";
import DisplayPage from "../views/DisplayPage.vue";

const routes = [
  { path: "/", redirect: "/display" },
  { path: "/upload", name: "Upload", component: UploadPage },
  { path: "/display", name: "Display", component: DisplayPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
