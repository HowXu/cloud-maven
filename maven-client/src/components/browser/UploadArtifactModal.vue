<script setup lang="ts">
import { Upload, X } from "lucide-vue-next";
import { createToast } from "mosha-vue-toastify";
import { computed, ref, watch } from "vue";
import { VueFinalModal } from "vue-final-modal";

import { mavenApi } from "@/api/maven";

const props = defineProps<{
  path: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const show = ref(false);
const file = ref<File | null>(null);
const targetName = ref("");
const generateChecksums = ref(false);
const uploading = ref(false);

const normalizedBase = computed(() => props.path.replace(/^\/+|\/+$/g, ""));
const targetPath = computed(() => {
  const name = targetName.value.trim();
  return [normalizedBase.value, name].filter(Boolean).join("/");
});

const close = () => {
  show.value = false;
};

const reset = () => {
  file.value = null;
  targetName.value = "";
  generateChecksums.value = false;
};

const selectFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
  targetName.value = file.value?.name ?? "";
};

const isUnsafePath = (p: string) => /\.\.|\\\\|\/\/|[\u0000-\u001F\u007F]/.test(p) || p.startsWith("api/") || p.startsWith("/api/");

const upload = async () => {
  if (!file.value || !targetName.value.trim()) {
    createToast("Choose a file and target name", { type: "warning", position: "bottom-right" });
    return;
  }

  if (isUnsafePath(targetPath.value)) {
    createToast("Target path contains unsafe characters or patterns", { type: "warning", position: "bottom-right" });
    return;
  }

  uploading.value = true;

  try {
    await mavenApi.upload(targetPath.value, file.value, generateChecksums.value);
    createToast("Artifact uploaded", { type: "success", position: "bottom-right" });
    emit("uploaded");
    close();
    reset();
  } catch (err: any) {
    if (err?.response?.status === 413) {
      createToast("File too large for checksum mode", { type: "danger", position: "bottom-right" });
    } else {
      createToast("Artifact could not be uploaded", { type: "danger", position: "bottom-right" });
    }
  } finally {
    uploading.value = false;
  }
};

watch(show, (visible) => {
  if (!visible) {
    reset();
  }
});
</script>

<template>
  <div>
    <button class="soft-button" type="button" :disabled="disabled" @click="show = true">
      <Upload class="h-4 w-4" />
      Upload
    </button>

    <VueFinalModal v-model="show" class="flex items-center justify-center px-4">
      <div class="modal-panel">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <p class="muted-label">Artifact</p>
            <h2 class="text-lg font-semibold">Upload file</h2>
          </div>
          <button class="icon-button" type="button" @click="close">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="grid gap-4" @submit.prevent="upload">
          <label>
            <span class="muted-label">File</span>
            <input class="field-control mt-1" type="file" required @change="selectFile" />
          </label>

          <label>
            <span class="muted-label">Target file name</span>
            <input v-model="targetName" class="field-control mt-1" type="text" autocomplete="off" required />
          </label>

          <div class="rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {{ targetPath || "Select a file to preview the target path" }}
          </div>

          <label class="toggle-row">
            <input v-model="generateChecksums" type="checkbox" />
            <span>Generate checksum files</span>
          </label>

          <button class="soft-button w-full" type="submit" :disabled="uploading">
            <Upload class="h-4 w-4" />
            {{ uploading ? "Uploading..." : "Upload" }}
          </button>
        </form>
      </div>
    </VueFinalModal>
  </div>
</template>

<style scoped>
.modal-panel {
  width: min(30rem, calc(100vw - 2rem));
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
  box-shadow: 0 20px 45px rgb(15 23 42 / 0.24);
}

.toggle-row {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.75rem;
  color: rgb(55 65 81);
  font-size: 0.9rem;
}

.dark .modal-panel {
  border-color: rgb(31 41 55);
  background: rgb(17 24 39);
}

.dark .toggle-row {
  color: rgb(209 213 219);
}
</style>
