<script setup lang="ts">
defineProps<{
  imageUrl?: string;
  title?: string;
  lines?: string[];
}>();
</script>

<template>
  <div class="intro-card">
    <div v-if="imageUrl" class="intro-image">
      <img :src="imageUrl" :alt="title || 'Repository introduction'" />
    </div>
    <div v-if="title || (lines && lines.length)" class="intro-text">
      <h3 v-if="title" class="intro-title">{{ title }}</h3>
      <p v-for="line in lines" :key="line" class="intro-line">{{ line }}</p>
    </div>
  </div>
</template>

<style scoped>
.intro-card {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgb(243 244 246);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.dark .intro-card {
  background: rgb(31 41 55);
}

@media (max-width: 640px) {
  .intro-card {
    flex-direction: column;
  }
}

.intro-image {
  flex-shrink: 0;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;
  overflow: hidden;
  background: rgb(229 231 235);
}

.dark .intro-image {
  background: rgb(55 65 81);
}

.intro-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.intro-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  min-width: 0;
}

.intro-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(17 24 39);
  margin: 0;
}

.dark .intro-title {
  color: rgb(249 250 251);
}

.intro-line {
  margin: 0;
  font-size: 0.9rem;
  color: rgb(75 85 99);
  line-height: 1.5;
}

.dark .intro-line {
  color: rgb(156 163 175);
}
</style>