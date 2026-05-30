<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";

import BreadcrumbNavigation from "@/components/browser/BreadcrumbNavigation.vue";
import FileList from "@/components/browser/FileList.vue";
import DeleteEntryModal from "@/components/browser/DeleteEntryModal.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import SnippetsCard from "@/components/card/SnippetsCard.vue";
import { useRepository } from "@/composables/useRepository";

const route = useRoute();
const repository = useRepository();

const currentPath = computed(() => route.path.replace(/^\/+/, ""));

watch(
  currentPath,
  (path) => {
    repository.load(path).catch(() => undefined);
  },
  { immediate: true },
);
</script>

<template>
  <section class="content-container py-8">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <div class="mb-4 flex flex-wrap items-center justify-end gap-3">
          <DeleteEntryModal
            v-if="repository.canDelete.value"
            :path="currentPath"
            @deleted="repository.load(currentPath, true)"
          />
        </div>

        <div class="panel-surface rounded-lg">
          <LoadingState v-if="repository.loading.value" label="Loading Maven directory..." />
          <ErrorState
            v-else-if="repository.error.value"
            :message="repository.error.value"
            @retry="repository.load(currentPath, true)"
          />
          <FileList
            v-else
            :path="currentPath"
            :entries="repository.entries.value"
            @changed="repository.load(currentPath, true)"
          />
        </div>
      </div>

      <SnippetsCard :path="currentPath" />
    </div>
  </section>
</template>
