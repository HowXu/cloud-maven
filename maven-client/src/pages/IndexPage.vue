<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from "vue";

import AdminPage from "@/pages/AdminPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import FileBrowserView from "@/components/browser/FileBrowserView.vue";
import DefaultHeader from "@/components/header/DefaultHeader.vue";
import IntroCard from "@/components/common/IntroCard.vue";
import { settingsApi } from "@/api/settings";
import { siteConfig } from "@/site.config";
import { useSession } from "@/composables/useSession";
import { applySiteSettings } from "@/site.config";

type TabName = "Directory" | "Admin" | "Settings";

const selectedTab = ref<TabName>((localStorage.getItem("cloud-maven-tab") as TabName) || "Directory");
const { isManager, isLogged } = useSession();
const defaultRepo = ref("");

const visibleTabs = computed<TabName[]>(() => {
  const tabs: TabName[] = ["Directory"];

  if (isLogged.value && isManager.value) {
    tabs.push("Admin");
  }

  if (isLogged.value) {
    tabs.push("Settings");
  }

  return tabs;
});

watchEffect(() => {
  localStorage.setItem("cloud-maven-tab", selectedTab.value);

  if (!visibleTabs.value.includes(selectedTab.value)) {
    selectedTab.value = "Directory";
  }
});

const siteData = siteConfig;

onMounted(async () => {
  try {
    const response = await settingsApi.get();
    defaultRepo.value = response.data.defaultRepository || "";
    applySiteSettings({ title: response.data.title });
  } catch {
    // ignore
  }
});
</script>

<template>
  <DefaultHeader @select-home="selectedTab = 'Directory'" />

  <main class="bg-cloud-wash dark:bg-black">
    <div class="content-container">
      <IntroCard
        v-if="selectedTab === 'Directory'"
        :image-url="siteData.introImageUrl"
        :title="siteData.introTitle"
        :lines="siteData.introLines"
      />

      <nav class="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto" aria-label="Main sections">
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
      <FileBrowserView v-if="selectedTab === 'Directory'" key="directory" :repository-id="defaultRepo" />
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
  text-align: center;
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
