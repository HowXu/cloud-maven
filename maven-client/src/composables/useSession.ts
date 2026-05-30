import { computed, ref } from "vue";
import { createToast } from "mosha-vue-toastify";

import { authApi } from "@/api/auth";
import { apiClient, setAuthorization } from "@/api/client";
import type { SessionDetails } from "@/types";

const tokenNameKey = "cloud-maven-token-name";
const tokenSecretKey = "cloud-maven-token-secret";

const tokenName = ref(localStorage.getItem(tokenNameKey) || "");
const tokenSecret = ref(localStorage.getItem(tokenSecretKey) || "");
const details = ref<SessionDetails | null>(null);
const initialized = ref(false);

setAuthorization(tokenName.value, tokenSecret.value);

const persistToken = (name: string, secret: string) => {
  tokenName.value = name;
  tokenSecret.value = secret;
  localStorage.setItem(tokenNameKey, name);
  localStorage.setItem(tokenSecretKey, secret);
  setAuthorization(name, secret);
};

export function useSession() {
  const isLogged = computed(() => details.value !== null);
  const isManager = computed(() => details.value?.roles.includes("manager") === true);

  const initializeSession = async () => {
    if (!tokenName.value || !tokenSecret.value) {
      initialized.value = true;
      return;
    }

    try {
      const response = await authApi.me();
      details.value = response.data;
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
    localStorage.removeItem(tokenNameKey);
    localStorage.removeItem(tokenSecretKey);
    delete apiClient.defaults.headers.common.Authorization;
    details.value = null;
    createToast("Signed out", { type: "info", position: "bottom-right" });
  };

  const can = (path: string, action: "read" | "write" | "delete" | "manage") => {
    if (isManager.value) {
      return true;
    }

    return details.value?.permissions.some((permission) => (
      path.startsWith(permission.path) && permission.actions.includes(action)
    )) === true;
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
