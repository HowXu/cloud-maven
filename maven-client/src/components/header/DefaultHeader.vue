<script setup lang="ts">
import { LogOut, Moon, Sun } from "lucide-vue-next";

import LoginModal from "@/components/header/LoginModal.vue";
import { useSession } from "@/composables/useSession";
import { useTheme } from "@/composables/useTheme";

defineEmits<{
  "select-home": [];
}>();

const { isDark, toggleTheme } = useTheme();
const { details, isLogged, logout } = useSession();
</script>

<template>
  <header class="bg-cloud-wash dark:bg-black">
    <div class="content-container flex items-start justify-between gap-4 py-8 sm:items-center">
      <button class="text-left" type="button" @click="$emit('select-home')">
        <span class="block text-xl font-semibold">Cloud-Maven</span>
        <span class="mt-1 block text-sm text-gray-500 dark:text-gray-400">Serverless Maven repository</span>
      </button>

      <div class="flex items-center gap-2">
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
  </header>
</template>
