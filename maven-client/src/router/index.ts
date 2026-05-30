import { createRouter, createWebHashHistory } from "vue-router";

import IndexPage from "@/pages/IndexPage.vue";
import NotFoundPage from "@/pages/NotFoundPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/404",
      name: "not-found",
      component: NotFoundPage,
    },
    {
      path: "/:pathMatch(.*)*",
      name: "index",
      component: IndexPage,
    },
  ],
});

const VALID_PATHNAME = /^\/(index\.html)?$/;

router.beforeEach((to) => {
  if (
    to.name !== "not-found"
    && typeof window !== "undefined"
    && !VALID_PATHNAME.test(window.location.pathname)
  ) {
    return { name: "not-found" };
  }
});

export default router;
