<script setup lang="ts">
import { Save } from "lucide-vue-next";
import { onMounted, reactive, ref, watch } from "vue";
import { createToast } from "mosha-vue-toastify";

import { settingsApi } from "@/api/settings";
import { useSession } from "@/composables/useSession";
import type { ClientSettings } from "@/types";

const { isManager } = useSession();
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const form = reactive<ClientSettings>({
  title: "Cloud Maven",
  baseUrl: "",
  defaultRepository: "",
  anonymousRead: true,
  allowOverwrite: false,
  generateChecksums: true,
  maintainMetadata: true,
  allowedCorsOrigins: [],
  maxChecksumUploadSize: 52428800,
});

const loadSettings = async () => {
  if (!isManager.value) {
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await settingsApi.get();
    Object.assign(form, response.data);
  } catch {
    error.value = "Settings API is not available yet.";
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;

  try {
    const response = await settingsApi.update({ ...form });
    Object.assign(form, response.data);
    createToast("Settings saved", { type: "success", position: "bottom-right" });
  } catch {
    createToast("Settings could not be saved", { type: "danger", position: "bottom-right" });
  } finally {
    saving.value = false;
  }
};

onMounted(loadSettings);
watch(isManager, loadSettings);
</script>

<template>
  <section class="content-container py-5 sm:py-8">
    <div class="mb-6">
      <p class="muted-label">Settings</p>
      <h2 class="text-xl font-semibold">Repository behavior</h2>
      <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
        These controls define the frontend contract for the Worker settings API.
      </p>
    </div>

    <div v-if="!isManager" class="panel-surface rounded-lg p-5 text-sm text-gray-600 dark:text-gray-300 sm:p-8">
      Manager access is required to edit settings.
    </div>

    <form v-else class="panel-surface max-w-3xl rounded-lg p-5 sm:p-6" @submit.prevent="saveSettings">
      <p v-if="loading" class="mb-4 text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
      <p v-if="error" class="mb-4 text-sm text-amber-700 dark:text-amber-300">{{ error }}</p>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="muted-label">Title</span>
          <input v-model="form.title" class="field-control mt-1" type="text" />
        </label>
        <label class="block">
          <span class="muted-label">Base URL</span>
          <input v-model="form.baseUrl" class="field-control mt-1" type="url" placeholder="https://repo.example.com" />
        </label>
        <label class="block">
          <span class="muted-label">Default repository</span>
          <input v-model="form.defaultRepository" class="field-control mt-1" type="text" />
        </label>
      </div>

      <div class="mt-6 grid gap-3">
        <label class="toggle-row">
          <input v-model="form.anonymousRead" type="checkbox" />
          <span>Allow anonymous read access</span>
        </label>
        <label class="toggle-row">
          <input v-model="form.allowOverwrite" type="checkbox" />
          <span>Allow artifact overwrite</span>
        </label>
        <label class="toggle-row">
          <input v-model="form.generateChecksums" type="checkbox" />
          <span>Generate checksum files on upload</span>
        </label>
        <label class="toggle-row">
          <input v-model="form.maintainMetadata" type="checkbox" />
          <span>Maintain maven-metadata.xml automatically</span>
        </label>
      </div>

      <div class="mt-6 flex justify-end">
        <button class="soft-button" type="submit" :disabled="saving">
          <Save class="h-4 w-4" />
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.toggle-row {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.75rem;
  color: rgb(55 65 81);
  font-size: 0.9rem;
}

.dark .toggle-row {
  color: rgb(209 213 219);
}
</style>
