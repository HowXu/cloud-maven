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

export const adminApi = {
  stats() {
    return apiClient.get<AdminStats>("/api/admin/stats");
  },
  tokens() {
    return apiClient.get<AccessTokenSummary[]>("/api/admin/tokens");
  },
};
