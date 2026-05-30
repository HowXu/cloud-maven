<script setup lang="ts">
import { X } from "lucide-vue-next";
import { ref } from "vue";
import { VueFinalModal } from "vue-final-modal";
import { createToast } from "mosha-vue-toastify";

import { useSession } from "@/composables/useSession";

const { login } = useSession();
const show = ref(false);
const name = ref("");
const secret = ref("");
const submitting = ref(false);

const emit = defineEmits<{
  (e: "click"): void;
}>();

const close = () => {
  show.value = false;
};

const submit = async () => {
  submitting.value = true;

  try {
    await login(name.value, secret.value);
    close();
    emit("click");
  } catch {
    createToast("Invalid access token", { type: "danger", position: "bottom-right" });
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <button class="soft-button" type="button" @click="show = true">
      Sign in
    </button>

    <VueFinalModal v-model="show" class="flex items-center justify-center px-4">
      <div class="modal-panel">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-lg font-semibold m-0">Sign in</h2>
          <button class="icon-button" type="button" @click="close">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="grid gap-3" @submit.prevent="submit">
          <label>
            <span class="muted-label">Name</span>
            <input v-model="name" class="field-control mt-1" type="text" autocomplete="username" required />
          </label>
          <label>
            <span class="muted-label">Secret</span>
            <input v-model="secret" class="field-control mt-1" type="password" autocomplete="current-password" required />
          </label>
          <button class="soft-button mt-2 w-full" type="submit" :disabled="submitting">
            {{ submitting ? "Signing in..." : "Sign in" }}
          </button>
        </form>
      </div>
    </VueFinalModal>
  </div>
</template>

<style scoped>
.modal-panel {
  width: min(24rem, calc(100vw - 2rem));
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
  box-shadow: 0 20px 45px rgb(15 23 42 / 0.24);
  color: rgb(55 65 81);
}

.dark .modal-panel {
  border-color: rgb(31 41 55);
  background: rgb(17 24 39);
  color: rgb(229 231 235);
}

.field-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.375rem;
  background: white;
  color: rgb(17 24 39);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.dark .field-control {
  border-color: rgb(55 65 81);
  background: rgb(31 41 55);
  color: rgb(229 231 235);
}

.field-control:focus {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 2px;
}
</style>
