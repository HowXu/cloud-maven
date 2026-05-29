import { apiClient } from "@/api/client";
import type { RepositoryDetails } from "@/types";

const normalizePath = (path: string) => path.replace(/^\/+/, "");

export const mavenApi = {
  details(path: string) {
    const normalized = normalizePath(path);
    return apiClient.get<RepositoryDetails>(`/api/maven/details/${normalized}`);
  },
  content(path: string) {
    return apiClient.get<string>(`/${normalizePath(path)}`, {
      responseType: "text",
    });
  },
  download(path: string) {
    return apiClient.get<Blob>(`/${normalizePath(path)}`, {
      responseType: "blob",
    });
  },
  upload(path: string, file: File, generateChecksums = false) {
    return apiClient.put(`/${normalizePath(path)}`, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Generate-Checksums": String(generateChecksums),
      },
    });
  },
  delete(path: string) {
    return apiClient.delete<void>(`/${normalizePath(path)}`);
  },
  deleteArtifact(path: string) {
    return apiClient.delete<void>(`/api/maven/artifacts/${normalizePath(path)}`);
  },
};
