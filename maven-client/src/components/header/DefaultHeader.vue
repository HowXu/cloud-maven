<script setup lang="ts">
import { AlignJustify, LogOut, Moon, Sun, X } from "lucide-vue-next";
import { onMounted, ref } from "vue";

import LoginModal from "@/components/header/LoginModal.vue";
import { settingsApi } from "@/api/settings";
import { useSession } from "@/composables/useSession";
import { useTheme } from "@/composables/useTheme";

defineEmits<{
  "select-home": [];
}>();

const { isDark, toggleTheme } = useTheme();
const { details, isLogged, logout } = useSession();
const menuOpen = ref(false);
const siteTitle = ref("Cloud Maven");

const toggleThemeFromMenu = () => {
  toggleTheme();
  menuOpen.value = false;
};

const logoutFromMenu = () => {
  logout();
  menuOpen.value = false;
};

onMounted(async () => {
  try {
    const response = await settingsApi.get();
    siteTitle.value = response.data.title || "Cloud Maven";
  } catch {
    // keep default
  }
});
</script>

<template>
  <header class="bg-cloud-wash dark:bg-black">
    <div class="content-container flex items-center justify-between gap-3 py-5 sm:gap-4 sm:py-8">
      <button class="min-w-0 text-left" type="button" @click="$emit('select-home')">
        <span class="block truncate text-xl font-semibold">{{ siteTitle }}</span>
      </button>

      <div class="flex shrink-0 items-center gap-2">
        <button class="icon-button sm:hidden" type="button" :title="isDark ? 'Use light theme' : 'Use dark theme'" @click="toggleTheme">
          <Sun v-if="isDark" class="h-4 w-4 shrink-0" />
          <Moon v-else class="h-4 w-4 shrink-0" />
        </button>

        <button class="icon-button sm:hidden" type="button" :title="menuOpen ? 'Close menu' : 'Open menu'" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" class="h-4 w-4 shrink-0" />
          <AlignJustify v-else class="h-4 w-4 shrink-0" />
        </button>

        <div class="hidden items-center gap-2 sm:flex">
          <button class="icon-button" type="button" :title="isDark ? 'Use light theme' : 'Use dark theme'" @click="toggleTheme">
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>

          <LoginModal v-if="!isLogged" />
          <button v-else class="soft-button" type="button" @click="logout">
            <LogOut class="h-4 w-4" />
            {{ details?.token.name }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="menuOpen" class="border-t border-gray-200 dark:border-gray-800 sm:hidden">
      <div class="content-container flex flex-col gap-2 py-3">
        <button class="soft-button mobile-menu-action" type="button" :title="isDark ? 'Use light theme' : 'Use dark theme'" @click="toggleThemeFromMenu">
          <Sun v-if="isDark" class="h-4 w-4 shrink-0" />
          <Moon v-else class="h-4 w-4 shrink-0" />
          <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>

        <LoginModal v-if="!isLogged" class="mobile-menu-login" @click="menuOpen = false" />
        <button v-else class="soft-button mobile-menu-action" type="button" @click="logoutFromMenu">
          <LogOut class="h-4 w-4 shrink-0" />
          {{ details?.token.name }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mobile-menu-action {
  width: 100%;
  justify-content: flex-start;
  border-radius: 0.5rem;
}

.mobile-menu-login :deep(.soft-button) {
  width: 100%;
  justify-content: flex-start;
}
</style>
