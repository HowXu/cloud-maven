import { apiClient, createXBasicHeader } from "@/api/client";
import type { SessionDetails } from "@/types";

export interface LoginPayload {
  name: string;
  secret: string;
}

export const authApi = {
  me() {
    return apiClient.get<SessionDetails>("/api/auth/me");
  },
  login(payload: LoginPayload) {
    return apiClient.get<SessionDetails>("/api/auth/me", {
      headers: createXBasicHeader(payload.name, payload.secret),
    });
  },
  logout() {
    return apiClient.post<void>("/api/auth/logout");
  },
};
