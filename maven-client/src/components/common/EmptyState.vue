<script setup lang="ts">
import { FolderOpen } from "lucide-vue-next";

withDefaults(defineProps<{
  title?: string;
  message?: string;
}>(), {
  title: "Nothing here yet",
  message: "This repository path does not contain any visible entries.",
});
</script>

<template>
  <div class="state-shell">
    <FolderOpen class="h-8 w-8 text-gray-400" />
    <div>
      <p class="font-medium text-gray-700 dark:text-gray-200">{{ title }}</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.state-shell {
  display: grid;
  min-height: 9rem;
  place-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
}
</style>
