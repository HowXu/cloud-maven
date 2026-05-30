export type EntryType = "DIRECTORY" | "FILE";

export interface RepositoryEntry {
  name: string;
  path: string;
  type: EntryType;
  size?: number;
  updatedAt?: string;
  contentType?: string;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

export interface RepositoryDetails {
  path: string;
  parentPath: string | null;
  entries: RepositoryEntry[];
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface AccessPermission {
  path: string;
  actions: Array<"read" | "write" | "delete" | "manage">;
}

export interface SessionDetails {
  token: {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
  };
  roles: string[];
  permissions: AccessPermission[];
}

export interface AdminStats {
  repositories: number;
  objects: number;
  storageBytes: number;
  requests24h: number;
  errors24h: number;
}

export interface ClientSettings {
  title: string;
  baseUrl: string;
  defaultRepository: string;
  anonymousRead: boolean;
  allowOverwrite: boolean;
  generateChecksums: boolean;
  maintainMetadata: boolean;
  introImage: string;
}
