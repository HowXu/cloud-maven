<script setup lang="ts">
import { Database, KeyRound, RefreshCw, ShieldCheck } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";

import { adminApi, type AccessTokenSummary } from "@/api/admin";
import LoginModal from "@/components/header/LoginModal.vue";
import { useSession } from "@/composables/useSession";
import type { AdminStats } from "@/types";

const { isManager, isLogged, details } = useSession();
const stats = ref<AdminStats | null>(null);
const tokens = ref<AccessTokenSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadAdminData = async () => {
  if (!isManager.value) {
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const [statsResponse, tokensResponse] = await Promise.all([
      adminApi.stats(),
      adminApi.tokens(),
    ]);

    stats.value = statsResponse.data;
    tokens.value = tokensResponse.data;
  } catch {
    error.value = "Admin data is not available yet.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadAdminData);
watch(isManager, loadAdminData);
</script>

<template>
  <section class="content-container py-8">
    <div v-if="!isLogged" class="panel-surface rounded-lg p-8">
      <p class="muted-label">Admin</p>
      <h2 class="mt-2 text-xl font-semibold">Sign in to manage this Maven repository</h2>
      <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
        Administrative views are protected by an access token with manager permissions.
      </p>
      <LoginModal class="mt-6" />
    </div>

    <div v-else-if="!isManager" class="panel-surface rounded-lg p-8">
      <div class="flex items-center gap-3">
        <ShieldCheck class="h-5 w-5 text-amber-600" />
        <h2 class="text-xl font-semibold">Current token is not a manager</h2>
      </div>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        You are signed in as {{ details?.token.name }}, but this area requires manager access.
      </p>
    </div>

    <div v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="muted-label">Admin</p>
          <h2 class="text-xl font-semibold">Repository control panel</h2>
        </div>
        <button class="soft-button" type="button" @click="loadAdminData">
          <RefreshCw class="h-4 w-4" />
          Refresh
        </button>
      </div>

      <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading admin data...</p>
      <p v-if="error" class="mb-4 text-sm text-amber-700 dark:text-amber-300">{{ error }}</p>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article class="panel-surface rounded-lg p-5">
          <Database class="mb-4 h-5 w-5 text-blue-600" />
          <p class="muted-label">Repositories</p>
          <strong class="mt-2 block text-2xl">{{ stats?.repositories ?? "-" }}</strong>
        </article>
        <article class="panel-surface rounded-lg p-5">
          <Database class="mb-4 h-5 w-5 text-teal-700" />
          <p class="muted-label">Objects</p>
          <strong class="mt-2 block text-2xl">{{ stats?.objects ?? "-" }}</strong>
        </article>
        <article class="panel-surface rounded-lg p-5">
          <ShieldCheck class="mb-4 h-5 w-5 text-amber-600" />
          <p class="muted-label">Requests 24h</p>
          <strong class="mt-2 block text-2xl">{{ stats?.requests24h ?? "-" }}</strong>
        </article>
        <article class="panel-surface rounded-lg p-5">
          <KeyRound class="mb-4 h-5 w-5 text-blue-600" />
          <p class="muted-label">Tokens</p>
          <strong class="mt-2 block text-2xl">{{ tokens.length || "-" }}</strong>
        </article>
      </div>

      <section class="mt-8">
        <h3 class="mb-3 text-lg font-semibold">Access tokens</h3>
        <div class="panel-surface overflow-hidden rounded-lg">
          <div v-if="tokens.length === 0" class="p-5 text-sm text-gray-500 dark:text-gray-400">
            Token management API is ready, but no tokens were returned.
          </div>
          <div
            v-for="token in tokens"
            :key="token.id"
            class="grid gap-2 border-b border-gray-200 p-4 text-sm last:border-b-0 dark:border-gray-800 md:grid-cols-[1fr_auto]"
          >
            <div>
              <p class="font-medium">{{ token.name }}</p>
              <p class="text-gray-500 dark:text-gray-400">{{ token.description || "No description" }}</p>
            </div>
            <span class="self-center rounded-full px-3 py-1 text-xs" :class="token.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'">
              {{ token.enabled ? "Enabled" : "Disabled" }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
