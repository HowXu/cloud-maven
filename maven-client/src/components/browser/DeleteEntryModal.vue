<script setup lang="ts">
import { Trash2, X } from "lucide-vue-next";
import { createToast } from "mosha-vue-toastify";
import { computed, ref } from "vue";
import { VueFinalModal } from "vue-final-modal";

import { mavenApi } from "@/api/maven";
import type { RepositoryEntry } from "@/types";

const props = defineProps<{
  basePath: string;
  entry: RepositoryEntry;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const show = ref(false);
const deleting = ref(false);
const canDelete = computed(() => props.entry.permissions?.delete === true);
const entryPath = computed(() => {
  const base = props.basePath.replace(/^\/+|\/+$/g, "");
  return [base, props.entry.name].filter(Boolean).join("/");
});

const close = () => {
  show.value = false;
};

const remove = async () => {
  deleting.value = true;

  try {
    await mavenApi.delete(entryPath.value);
    createToast("Artifact deleted", { type: "success", position: "bottom-right" });
    emit("deleted");
    close();
  } catch {
    createToast("Artifact could not be deleted", { type: "danger", position: "bottom-right" });
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <button
      class="icon-button"
      type="button"
      :disabled="!canDelete"
      title="Delete"
      @click="show = true"
    >
      <Trash2 class="h-4 w-4" />
    </button>

    <VueFinalModal v-model="show" class="flex items-center justify-center px-4">
      <div class="modal-panel">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <p class="muted-label">Delete artifact</p>
            <h2 class="text-lg font-semibold">{{ entry.name }}</h2>
          </div>
          <button class="icon-button" type="button" @click="close">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="text-sm text-gray-600 dark:text-gray-300">
          This removes the file at <code>{{ entryPath }}</code>.
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="soft-button" type="button" @click="close">Cancel</button>
          <button class="soft-button danger-button" type="button" :disabled="deleting" @click="remove">
            <Trash2 class="h-4 w-4" />
            {{ deleting ? "Deleting..." : "Delete" }}
          </button>
        </div>
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

.danger-button {
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

code {
  overflow-wrap: anywhere;
  font-family: Consolas, Monaco, monospace;
}

.dark .modal-panel {
  border-color: rgb(31 41 55);
  background: rgb(17 24 39);
}

.dark .danger-button {
  border-color: rgb(127 29 29);
  color: rgb(252 165 165);
}
</style>
