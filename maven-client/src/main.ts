import "@unocss/reset/tailwind.css";
import "virtual:uno.css";
import "vue-final-modal/style.css";
import "mosha-vue-toastify/dist/style.css";
import "@/styles/base.css";
import "@/styles/transitions.css";

import { createVfm } from "vue-final-modal";
import { createApp } from "vue";

import App from "@/App.vue";
import router from "@/router";

const app = createApp(App);

app.use(router);
app.use(createVfm());
app.mount("#app");
