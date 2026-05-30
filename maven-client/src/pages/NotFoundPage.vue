<script setup lang="ts">
import { Home } from "lucide-vue-next";
import { useRouter } from "vue-router";

import DefaultHeader from "@/components/header/DefaultHeader.vue";

const router = useRouter();

withDefaults(defineProps<{
  embedded?: boolean;
}>(), {
  embedded: false,
});
</script>

<template>
  <DefaultHeader v-if="!embedded" />
  <section class="content-container py-16 text-center">
    <p class="text-6xl font-bold text-gray-300 dark:text-gray-700">404</p>
    <h2 class="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-100">Page not found</h2>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      The requested path does not exist in this repository.
    </p>
    <button class="soft-button mt-6" type="button" @click="router.push('/')">
      <Home class="h-4 w-4" />
      Back to home
    </button>
  </section>
</template>
