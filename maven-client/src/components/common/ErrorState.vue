<script setup lang="ts">
import { AlertTriangle, RefreshCw } from "lucide-vue-next";

withDefaults(defineProps<{
  title?: string;
  message?: string;
  actionLabel?: string;
}>(), {
  title: "Unable to load this path",
  message: "The directory may not exist, or the current token may not have permission.",
  actionLabel: "Retry",
});

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="state-shell">
    <AlertTriangle class="h-8 w-8 text-amber-600 dark:text-amber-300" />
    <div>
      <p class="font-medium text-gray-800 dark:text-gray-100">{{ title }}</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
    </div>
    <button class="soft-button" type="button" @click="$emit('retry')">
      <RefreshCw class="h-4 w-4" />
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.state-shell {
  display: grid;
  min-height: 10rem;
  place-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
}
</style>
