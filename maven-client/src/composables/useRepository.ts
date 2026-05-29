import { computed, ref } from "vue";
import { createToast } from "mosha-vue-toastify";

import { mavenApi } from "@/api/maven";
import type { RepositoryDetails } from "@/types";

const cache = new Map<string, RepositoryDetails>();

export function useRepository() {
  const details = ref<RepositoryDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const entries = computed(() => details.value?.entries ?? []);
  const canWrite = computed(() => details.value?.canWrite === true);

  const load = async (path: string, force = false) => {
    const normalized = path.replace(/^\/+/, "");

    if (!force && cache.has(normalized)) {
      details.value = cache.get(normalized) ?? null;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await mavenApi.details(normalized);
      cache.set(normalized, response.data);
      details.value = response.data;
    } catch (requestError) {
      details.value = null;
      error.value = "Directory is unavailable or you do not have permission to view it.";
      createToast(error.value, { type: "danger", position: "bottom-right" });
      throw requestError;
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    if (!details.value) {
      return;
    }

    cache.delete(details.value.path);
    await load(details.value.path, true);
  };

  return {
    details,
    entries,
    loading,
    error,
    canWrite,
    load,
    refresh,
  };
}
