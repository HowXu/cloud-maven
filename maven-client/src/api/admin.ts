import { apiClient } from "@/api/client";
import type { AccessPermission, AdminStats } from "@/types";

export interface AccessTokenSummary {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  permissions: AccessPermission[];
}

export interface CreateAccessTokenPayload {
  name: string;
  description?: string;
  permissions: AccessPermission[];
}

export interface CreateAccessTokenResponse extends AccessTokenSummary {
  secret: string;
}

export interface UpdateAccessTokenPayload {
  name?: string;
  description?: string;
  enabled?: boolean;
  permissions?: AccessPermission[];
}

export const adminApi = {
  stats() {
    return apiClient.get<AdminStats>("/api/admin/stats");
  },
  tokens() {
    return apiClient.get<AccessTokenSummary[]>("/api/admin/tokens");
  },
  createToken(payload: CreateAccessTokenPayload) {
    return apiClient.post<CreateAccessTokenResponse>("/api/admin/tokens", payload);
  },
  updateToken(id: string, payload: UpdateAccessTokenPayload) {
    return apiClient.put<AccessTokenSummary>(`/api/admin/tokens/${id}`, payload);
  },
  deleteToken(id: string) {
    return apiClient.delete<void>(`/api/admin/tokens/${id}`);
  },
};
