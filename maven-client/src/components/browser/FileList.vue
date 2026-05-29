<script setup lang="ts">
import { FileArchive, Folder, HardDriveDownload, LoaderCircle } from "lucide-vue-next";
import { createToast } from "mosha-vue-toastify";
import { computed, ref } from "vue";

import { createArtifactUrl } from "@/api/client";
import { mavenApi } from "@/api/maven";
import DeleteArtifactModal from "@/components/browser/DeleteArtifactModal.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import type { RepositoryEntry } from "@/types";

const props = defineProps<{
  path: string;
  entries: RepositoryEntry[];
}>();

const emit = defineEmits<{
  changed: [];
}>();

const sortedEntries = computed(() => [...props.entries].sort((left, right) => {
  if (left.type !== right.type) {
    return left.type === "DIRECTORY" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}));
const downloadingPath = ref<string | null>(null);

const childPath = (entry: RepositoryEntry) => {
  const base = props.path.replace(/^\/+|\/+$/g, "");
  return `/${[base, entry.name].filter(Boolean).join("/")}`;
};

const formatSize = (size?: number) => {
  if (size === undefined) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

const downloadEntry = async (entry: RepositoryEntry) => {
  const path = childPath(entry).replace(/^\/+/, "");
  downloadingPath.value = path;

  try {
    const response = await mavenApi.download(path);
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data]);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = entry.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    createToast(`Downloading ${entry.name}`, { type: "info", position: "bottom-right", timeout: 1800 });
  } catch {
    createToast(`Cannot download ${entry.name}`, { type: "danger", position: "bottom-right" });
  } finally {
    downloadingPath.value = null;
  }
};
</script>

<template>
  <div>
    <EmptyState
      v-if="sortedEntries.length === 0"
      title="Directory is empty"
      message="No visible Maven files or child directories were returned for this path."
    />

    <div
      v-for="entry in sortedEntries"
      :key="entry.path || entry.name"
      class="entry-row"
    >
      <router-link
        v-if="entry.type === 'DIRECTORY'"
        class="entry-main"
        :to="childPath(entry)"
      >
        <Folder class="h-5 w-5 text-blue-600" />
        <span class="truncate font-medium">{{ entry.name }}</span>
      </router-link>

      <a
        v-else
        class="entry-main"
        :href="createArtifactUrl(childPath(entry))"
        target="_blank"
        rel="noreferrer"
      >
        <FileArchive class="h-5 w-5 text-teal-700" />
        <span class="truncate font-medium">{{ entry.name }}</span>
      </a>

      <span class="hidden text-right text-xs text-gray-500 dark:text-gray-400 sm:block">{{ formatSize(entry.size) }}</span>
      <span class="hidden text-right text-xs text-gray-500 dark:text-gray-400 md:block">{{ formatDate(entry.updatedAt) }}</span>

      <div v-if="entry.type === 'FILE'" class="entry-actions">
        <button
          class="icon-button"
          type="button"
          :disabled="downloadingPath === childPath(entry).replace(/^\/+/, '')"
          :title="downloadingPath === childPath(entry).replace(/^\/+/, '') ? 'Downloading' : 'Download'"
          @click="downloadEntry(entry)"
        >
          <LoaderCircle v-if="downloadingPath === childPath(entry).replace(/^\/+/, '')" class="h-4 w-4 animate-spin" />
          <HardDriveDownload v-else class="h-4 w-4" />
        </button>
        <DeleteArtifactModal :base-path="path" :entry="{ name: entry.name, path: entry.path, type: entry.type }" @deleted="emit('changed')" />
      </div>
      <div v-else class="entry-actions">
        <DeleteArtifactModal :base-path="path" :entry="{ name: entry.name, path: entry.path, type: entry.type }" @deleted="emit('changed')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.5rem;
  border-bottom: 1px solid rgb(229 231 235);
  padding: 0.55rem 0.75rem;
}

@media (min-width: 640px) {
  .entry-row {
    grid-template-columns: minmax(0, 1fr) 5.5rem auto;
  }
}

@media (min-width: 768px) {
  .entry-row {
    grid-template-columns: minmax(0, 1fr) 5.5rem 7.5rem auto;
  }
}

.entry-row:last-child {
  border-bottom: 0;
}

.entry-row:hover {
  background: rgb(249 250 251);
}

.entry-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
}

.entry-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.dark .entry-row {
  border-color: rgb(31 41 55);
}

.dark .entry-row:hover {
  background: rgb(17 24 39);
}
</style>
