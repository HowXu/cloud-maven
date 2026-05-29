<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import AdminPage from "@/pages/AdminPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import FileBrowserView from "@/components/browser/FileBrowserView.vue";
import DefaultHeader from "@/components/header/DefaultHeader.vue";
import { useSession } from "@/composables/useSession";

type TabName = "Overview" | "Admin" | "Settings";

const selectedTab = ref<TabName>((localStorage.getItem("cloud-maven-tab") as TabName) || "Overview");
const { isManager } = useSession();

const visibleTabs = computed<TabName[]>(() => {
  if (isManager.value) {
    return ["Overview", "Admin", "Settings"];
  }

  return ["Overview", "Admin"];
});

watchEffect(() => {
  localStorage.setItem("cloud-maven-tab", selectedTab.value);

  if (!visibleTabs.value.includes(selectedTab.value)) {
    selectedTab.value = "Overview";
  }
});
</script>

<template>
  <DefaultHeader @select-home="selectedTab = 'Overview'" />

  <main class="bg-cloud-wash dark:bg-black">
    <div class="content-container">
      <nav class="flex border-b border-gray-200 dark:border-gray-800" aria-label="Main sections">
        <button
          v-for="tab in visibleTabs"
          :key="tab"
          type="button"
          class="section-tab"
          :class="{ selected: selectedTab === tab }"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </button>
      </nav>
    </div>

    <transition name="slide-fade" mode="out-in">
      <FileBrowserView v-if="selectedTab === 'Overview'" key="overview" />
      <AdminPage v-else-if="selectedTab === 'Admin'" key="admin" />
      <SettingsPage v-else key="settings" />
    </transition>
  </main>
</template>

<style scoped>
.section-tab {
  min-width: 7rem;
  padding: 0.65rem 0.75rem;
  border-bottom: 2px solid transparent;
  color: rgb(75 85 99);
  text-align: left;
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.section-tab:hover {
  background: rgb(229 231 235 / 0.75);
}

.section-tab.selected {
  border-color: rgb(17 24 39);
  color: rgb(17 24 39);
}

.dark .section-tab {
  color: rgb(209 213 219);
}

.dark .section-tab:hover {
  background: rgb(17 24 39);
}

.dark .section-tab.selected {
  border-color: white;
  color: white;
}
</style>
