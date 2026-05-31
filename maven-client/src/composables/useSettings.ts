import { ref } from "vue";

import { settingsApi } from "@/api/settings";
import { applySiteSettings } from "@/site.config";

const title = ref("Cloud Maven");
const defaultRepo = ref("");
const baseUrl = ref("");
const loaded = ref(false);

let pending: Promise<void> | null = null;

const fetchSettings = () => {
  if (loaded.value) return;
  if (pending) return pending;

  pending = settingsApi.get().then((response) => {
    title.value = response.data.title || "Cloud Maven";
    defaultRepo.value = response.data.defaultRepository || "";
    baseUrl.value = response.data.baseUrl || "";
    applySiteSettings({ title: response.data.title });
  }).catch(() => {
    // keep defaults
  }).finally(() => {
    loaded.value = true;
    pending = null;
  });

  return pending;
};

export function useSettings() {
  fetchSettings();

  return {
    title,
    defaultRepo,
    baseUrl,
    loaded,
  };
}
