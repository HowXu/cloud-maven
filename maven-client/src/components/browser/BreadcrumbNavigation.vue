<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  path: string;
}>();

const crumbs = computed(() => {
  const parts = props.path.split("/").filter(Boolean);

  return parts.map((part, index) => ({
    label: part,
    to: `/${parts.slice(0, index + 1).join("/")}`,
  }));
});
</script>

<template>
  <nav class="flex min-h-9 flex-wrap items-center gap-1 text-sm" aria-label="Repository path">
    <router-link class="breadcrumb-link" to="/">root</router-link>
    <template v-for="crumb in crumbs" :key="crumb.to">
      <span class="text-gray-400">/</span>
      <router-link class="breadcrumb-link crumb-link truncate" :to="crumb.to">{{ crumb.label }}</router-link>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb-link {
  display: inline-flex;
  max-width: 100%;
  border-radius: 0.375rem;
  padding: 0.35rem 0.5rem;
  color: rgb(37 99 235);
  transition: background-color 180ms ease;
}

.crumb-link {
  max-width: min(12rem, 58vw);
}

.breadcrumb-link:hover {
  background: rgb(219 234 254);
}

.dark .breadcrumb-link {
  color: rgb(147 197 253);
}

.dark .breadcrumb-link:hover {
  background: rgb(30 58 138 / 0.35);
}
</style>
