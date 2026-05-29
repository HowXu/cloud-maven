<script setup lang="ts">
import { Copy, Database, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-vue-next";
import { createToast } from "mosha-vue-toastify";
import { computed, onMounted, reactive, ref, watch } from "vue";

import { adminApi, type AccessTokenSummary } from "@/api/admin";
import LoginModal from "@/components/header/LoginModal.vue";
import { useClipboardToast } from "@/composables/useClipboardToast";
import { useSession } from "@/composables/useSession";
import type { AccessPermission, AdminStats } from "@/types";

const { isManager, isLogged, details } = useSession();
const { copy } = useClipboardToast();
const stats = ref<AdminStats | null>(null);
const tokens = ref<AccessTokenSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const creating = ref(false);
const tokenBusy = ref<Record<string, boolean>>({});
const createdSecret = ref("");
const createdTokenName = ref("");
const permissionActions = ["read", "write", "delete", "manage"] as const;

type PermissionAction = AccessPermission["actions"][number];

const createForm = reactive<{
  name: string;
  description: string;
  path: string;
  actions: PermissionAction[];
}>({
  name: "",
  description: "",
  path: "/",
  actions: ["read"],
});

const tokenCount = computed(() => tokens.value.length);

const normalizePermissionPath = (path: string) => {
  const trimmed = path.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

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

const createToken = async () => {
  const name = createForm.name.trim();

  if (!name) {
    createToast("Token name is required", { type: "warning", position: "bottom-right" });
    return;
  }

  if (createForm.actions.length === 0) {
    createToast("Select at least one permission", { type: "warning", position: "bottom-right" });
    return;
  }

  creating.value = true;

  try {
    const response = await adminApi.createToken({
      name,
      description: createForm.description.trim() || undefined,
      permissions: [{
        path: normalizePermissionPath(createForm.path),
        actions: [...createForm.actions],
      }],
    });

    createdTokenName.value = response.data.name;
    createdSecret.value = response.data.secret;
    createForm.name = "";
    createForm.description = "";
    createForm.path = "/";
    createForm.actions = ["read"];
    createToast("Token created", { type: "success", position: "bottom-right" });
    await loadAdminData();
  } catch {
    createToast("Token could not be created", { type: "danger", position: "bottom-right" });
  } finally {
    creating.value = false;
  }
};

const setTokenBusy = (id: string, busy: boolean) => {
  tokenBusy.value = {
    ...tokenBusy.value,
    [id]: busy,
  };
};

const toggleToken = async (token: AccessTokenSummary) => {
  setTokenBusy(token.id, true);

  try {
    const response = await adminApi.updateToken(token.id, { enabled: !token.enabled });
    tokens.value = tokens.value.map((entry) => entry.id === token.id ? response.data : entry);
    createToast(response.data.enabled ? "Token enabled" : "Token disabled", {
      type: "success",
      position: "bottom-right",
    });
  } catch {
    createToast("Token state could not be updated", { type: "danger", position: "bottom-right" });
  } finally {
    setTokenBusy(token.id, false);
  }
};

const removeToken = async (token: AccessTokenSummary) => {
  if (!window.confirm(`Delete token "${token.name}"?`)) {
    return;
  }

  setTokenBusy(token.id, true);

  try {
    await adminApi.deleteToken(token.id);
    tokens.value = tokens.value.filter((entry) => entry.id !== token.id);
    createToast("Token deleted", { type: "success", position: "bottom-right" });
  } catch {
    createToast("Token could not be deleted", { type: "danger", position: "bottom-right" });
  } finally {
    setTokenBusy(token.id, false);
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
          <strong class="mt-2 block text-2xl">{{ tokenCount || "-" }}</strong>
        </article>
      </div>

      <section class="mt-8 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div class="panel-surface rounded-lg p-5">
          <div class="mb-5">
            <p class="muted-label">Access token</p>
            <h3 class="mt-1 text-lg font-semibold">Create token</h3>
          </div>

          <form class="grid gap-4" @submit.prevent="createToken">
            <label>
              <span class="muted-label">Name</span>
              <input v-model="createForm.name" class="field-control mt-1" type="text" autocomplete="off" required />
            </label>

            <label>
              <span class="muted-label">Description</span>
              <input v-model="createForm.description" class="field-control mt-1" type="text" autocomplete="off" />
            </label>

            <label>
              <span class="muted-label">Path scope</span>
              <input v-model="createForm.path" class="field-control mt-1" type="text" placeholder="/" />
            </label>

            <div>
              <span class="muted-label">Permissions</span>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <label
                  v-for="action in permissionActions"
                  :key="action"
                  class="permission-option"
                >
                  <input v-model="createForm.actions" :value="action" type="checkbox" />
                  <span>{{ action }}</span>
                </label>
              </div>
            </div>

            <button class="soft-button w-full" type="submit" :disabled="creating">
              <Plus class="h-4 w-4" />
              {{ creating ? "Creating..." : "Create token" }}
            </button>
          </form>

          <div v-if="createdSecret" class="secret-panel mt-5">
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="font-medium">Secret for {{ createdTokenName }}</p>
              <button class="icon-button" type="button" title="Copy secret" @click="copy(createdSecret)">
                <Copy class="h-4 w-4" />
              </button>
            </div>
            <code>{{ createdSecret }}</code>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-lg font-semibold">Access tokens</h3>
          <div class="panel-surface overflow-hidden rounded-lg">
            <div v-if="tokens.length === 0" class="p-5 text-sm text-gray-500 dark:text-gray-400">
              Token management API is ready, but no tokens were returned.
            </div>
            <div
              v-for="token in tokens"
              :key="token.id"
              class="token-row"
            >
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium">{{ token.name }}</p>
                  <span class="status-pill" :class="token.enabled ? 'enabled' : 'disabled'">
                    {{ token.enabled ? "Enabled" : "Disabled" }}
                  </span>
                </div>
                <p class="mt-1 text-gray-500 dark:text-gray-400">{{ token.description || "No description" }}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="permission in token.permissions"
                    :key="`${token.id}-${permission.path}-${permission.actions.join('-')}`"
                    class="permission-pill"
                  >
                    {{ permission.path }} · {{ permission.actions.join(", ") }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 justify-self-start md:justify-self-end">
                <button
                  class="soft-button"
                  type="button"
                  :disabled="tokenBusy[token.id]"
                  @click="toggleToken(token)"
                >
                  <ShieldCheck class="h-4 w-4" />
                  {{ token.enabled ? "Disable" : "Enable" }}
                </button>
                <button
                  class="icon-button"
                  type="button"
                  title="Delete token"
                  :disabled="tokenBusy[token.id]"
                  @click="removeToken(token)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
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

.token-row {
  display: grid;
  gap: 1rem;
  border-bottom: 1px solid rgb(229 231 235);
  padding: 1rem;
  font-size: 0.9rem;
}

.token-row:last-child {
  border-bottom: 0;
}

@media (min-width: 768px) {
  .token-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

.status-pill,
.permission-pill {
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
}

.status-pill.enabled {
  background: rgb(209 250 229);
  color: rgb(6 95 70);
}

.status-pill.disabled {
  background: rgb(229 231 235);
  color: rgb(75 85 99);
}

.permission-pill {
  background: rgb(243 244 246);
  color: rgb(75 85 99);
}

.secret-panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.5rem;
  background: rgb(239 246 255);
  padding: 0.85rem;
  font-size: 0.85rem;
}

.secret-panel code {
  display: block;
  overflow-wrap: anywhere;
  font-family: Consolas, Monaco, monospace;
}

.dark .permission-option {
  border-color: rgb(55 65 81);
  color: rgb(209 213 219);
}

.dark .permission-pill {
  background: rgb(31 41 55);
  color: rgb(209 213 219);
}

.dark .secret-panel {
  border-color: rgb(30 64 175);
  background: rgb(30 58 138 / 0.3);
}
</style>
