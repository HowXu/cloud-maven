<script setup lang="ts">
import { AlignJustify, LogOut, Moon, Sun, X } from "lucide-vue-next";
import { ref } from "vue";

import LoginModal from "@/components/header/LoginModal.vue";
import { useSession } from "@/composables/useSession";
import { useTheme } from "@/composables/useTheme";

defineEmits<{
  "select-home": [];
}>();

const { isDark, toggleTheme } = useTheme();
const { details, isLogged, logout } = useSession();
const menuOpen = ref(false);
</script>

<template>
  <header class="bg-cloud-wash dark:bg-black">
    <div class="content-container flex items-start justify-between gap-4 py-8 sm:items-center">
      <button class="text-left" type="button" @click="$emit('select-home')">
        <span class="block text-xl font-semibold">Cloud-Maven</span>
        <span class="mt-1 block text-sm text-gray-500 dark:text-gray-400">Serverless Maven repository</span>
      </button>

      <div class="flex items-center gap-2">
        <button class="icon-button sm:hidden" type="button" :title="menuOpen ? 'Close menu' : 'Open menu'" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" class="h-4 w-4" />
          <AlignJustify v-else class="h-4 w-4" />
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

    <div v-if="menuOpen" class="border-t border-gray-200 px-4 pb-4 pt-3 dark:border-gray-800 sm:hidden">
      <div class="flex flex-col gap-2">
        <button class="icon-button w-full justify-start gap-2 border" type="button" :title="isDark ? 'Use light theme' : 'Use dark theme'" @click="toggleTheme; menuOpen = false">
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
          <span>{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
        </button>

        <LoginModal v-if="!isLogged" @click="menuOpen = false" />
        <button v-else class="soft-button w-full justify-start gap-2 border" type="button" @click="logout; menuOpen = false">
          <LogOut class="h-4 w-4" />
          {{ details?.token.name }}
        </button>
      </div>
    </div>
  </header>
</template>
