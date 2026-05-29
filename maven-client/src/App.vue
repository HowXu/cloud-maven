<script setup lang="ts">
import { useSession } from "@/composables/useSession";
import { useTheme } from "@/composables/useTheme";

const { isDark, initializeTheme } = useTheme();
const { initializeSession } = useSession();

initializeTheme();
initializeSession().catch(() => undefined);
</script>

<template>
  <div :class="{ dark: isDark }">
    <div class="page-shell">
      <router-view />
    </div>
  </div>
</template>
