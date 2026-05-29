import { apiClient } from "@/api/client";
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
    return apiClient.post<SessionDetails>("/api/auth/login", payload);
  },
  logout() {
    return apiClient.post<void>("/api/auth/logout");
  },
};
