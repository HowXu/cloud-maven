<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, reactive, ref, watch } from "vue";
import { VueFinalModal } from "vue-final-modal";

import type { AccessPermission } from "@/types";

const props = defineProps<{
  show: boolean;
  initial?: {
    name: string;
    description?: string;
    path: string;
    actions: AccessPermission["actions"];
  };
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", data: { name: string; description: string; path: string; actions: AccessPermission["actions"] }): void;
}>();

const permissionActions = ["read", "write", "delete", "manage"] as const;

const form = reactive({
  name: "",
  description: "",
  path: "/",
  actions: ["read"] as AccessPermission["actions"],
});

const normalizedPath = computed(() => {
  const trimmed = form.path.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
});

watch(() => props.show, (shown) => {
  if (shown && props.initial) {
    form.name = props.initial.name;
    form.description = props.initial.description ?? "";
    form.path = props.initial.path;
    form.actions = [...props.initial.actions];
  } else if (shown) {
    form.name = "";
    form.description = "";
    form.path = "/";
    form.actions = ["read"];
  }
});

const save = () => {
  emit("save", {
    name: form.name.trim(),
    description: form.description.trim(),
    path: normalizedPath.value,
    actions: [...form.actions],
  });
};
</script>

<template>
  <VueFinalModal :model-value="show" class="flex items-center justify-center px-4" @update:model-value="emit('close')">
    <div class="modal-panel">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <p class="muted-label">Access token</p>
          <h2 class="text-lg font-semibold">{{ initial ? 'Edit token' : 'Create token' }}</h2>
        </div>
        <button class="icon-button" type="button" @click="emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>

      <form class="grid gap-4" @submit.prevent="save">
        <label>
          <span class="muted-label">Name</span>
          <input v-model="form.name" class="field-control mt-1" type="text" autocomplete="off" required />
        </label>

        <label>
          <span class="muted-label">Description</span>
          <input v-model="form.description" class="field-control mt-1" type="text" autocomplete="off" />
        </label>

        <label>
          <span class="muted-label">Path scope</span>
          <input v-model="form.path" class="field-control mt-1" type="text" placeholder="/" />
        </label>

        <div>
          <span class="muted-label">Permissions</span>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label
              v-for="action in permissionActions"
              :key="action"
              class="permission-option"
            >
              <input v-model="form.actions" :value="action" type="checkbox" />
              <span>{{ action }}</span>
            </label>
          </div>
        </div>

        <button class="soft-button w-full" type="submit">
          <span>{{ initial ? 'Save changes' : 'Create token' }}</span>
        </button>
      </form>
    </div>
  </VueFinalModal>
</template>

<style scoped>
.modal-panel {
  width: min(24rem, calc(100vw - 2rem));
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
  box-shadow: 0 20px 45px rgb(15 23 42 / 0.24);
}

.permission-option {
  display: flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.375rem;
  padding: 0.45rem 0.65rem;
  color: rgb(55 65 81);
  font-size: 0.85rem;
}

.dark .modal-panel {
  border-color: rgb(31 41 55);
  background: rgb(17 24 39);
}

.dark .permission-option {
  border-color: rgb(55 65 81);
  color: rgb(209 213 219);
}
</style>