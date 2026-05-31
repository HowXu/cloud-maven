import { computed, ref } from "vue";
import { createToast } from "mosha-vue-toastify";

import { authApi } from "@/api/auth";
import { apiClient, setAuthorization } from "@/api/client";
import { clearRepositoryCache } from "@/composables/useRepository";
import type { SessionDetails } from "@/types";

const tokenName = ref("");
const tokenSecret = ref("");
const details = ref<SessionDetails | null>(null);
const initialized = ref(false);

const persistToken = (name: string, secret: string) => {
  tokenName.value = name;
  tokenSecret.value = secret;
  setAuthorization(name, secret);
};

export function useSession() {
  const isLogged = computed(() => details.value !== null);
  const isManager = computed(() => details.value?.roles?.includes("manager") === true);

  const initializeSession = async () => {
    try {
      const response = await authApi.me();
      details.value = response.data;
    } catch {
      tokenName.value = "";
      tokenSecret.value = "";
      delete apiClient.defaults.headers.common.Authorization;
      clearRepositoryCache();
    } finally {
      initialized.value = true;
    }
  };

  const login = async (name: string, secret: string) => {
    const response = await authApi.login({ name, secret });
    persistToken(name, secret);
    details.value = response.data;
    createToast(`Signed in as ${name}`, { type: "success", position: "bottom-right" });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // A local logout is still valid if the server does not keep state.
    }

    tokenName.value = "";
    tokenSecret.value = "";
    localStorage.removeItem("cloud-maven-token-name");
    localStorage.removeItem("cloud-maven-token-secret");
    delete apiClient.defaults.headers.common.Authorization;
    details.value = null;
    clearRepositoryCache();
    createToast("Signed out", { type: "info", position: "bottom-right" });
  };

  const can = (path: string, action: "read" | "write" | "delete" | "manage") => {
    if (isManager.value) {
      return true;
    }

    return details.value?.permissions.some((permission) => {
      const permPath = permission.path.replace(/\/$/, "");
      if (permPath === "" || permPath === "/") {
        return permission.actions.includes(action);
      }
      return (path === permPath || path.startsWith(permPath + "/")) && permission.actions.includes(action);
    }) === true;
  };

  return {
    initialized,
    details,
    tokenName,
    isLogged,
    isManager,
    initializeSession,
    login,
    logout,
    can,
  };
}
