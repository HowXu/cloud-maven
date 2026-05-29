import { createRouter, createWebHashHistory } from "vue-router";

import IndexPage from "@/pages/IndexPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/:pathMatch(.*)*",
      name: "index",
      component: IndexPage,
    },
  ],
});

export default router;
