import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { createPinia } from "pinia";

// createApp(App).mount("#app");

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

app.mount("#app");
