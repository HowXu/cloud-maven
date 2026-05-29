<script setup lang="ts">
withDefaults(defineProps<{
  label?: string;
}>(), {
  label: "Loading...",
});
</script>

<template>
  <div class="state-shell text-gray-500 dark:text-gray-400">
    <span class="loading-dot" />
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.state-shell {
  display: flex;
  min-height: 8rem;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem;
  font-size: 0.9rem;
}

.loading-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: rgb(37 99 235);
  animation: pulse 900ms ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
