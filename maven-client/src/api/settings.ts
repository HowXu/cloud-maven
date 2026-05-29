import { apiClient } from "@/api/client";
import type { ClientSettings } from "@/types";

export const settingsApi = {
  get() {
    return apiClient.get<ClientSettings>("/api/admin/settings");
  },
  update(settings: ClientSettings) {
    return apiClient.put<ClientSettings>("/api/admin/settings", settings);
  },
};
