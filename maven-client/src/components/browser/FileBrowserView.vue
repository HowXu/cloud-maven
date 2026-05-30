<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";

import BreadcrumbNavigation from "@/components/browser/BreadcrumbNavigation.vue";
import DeleteDirectoryModal from "@/components/browser/DeleteDirectoryModal.vue";
import FileList from "@/components/browser/FileList.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import SnippetsCard from "@/components/card/SnippetsCard.vue";
import NotFoundPage from "@/pages/NotFoundPage.vue";
import { useRepository } from "@/composables/useRepository";

const route = useRoute();
const repository = useRepository();

defineProps<{
  repositoryId?: string;
}>();

const currentPath = computed(() => route.path.replace(/^\/+/, ""));

watch(
  currentPath,
  (path) => {
    repository.load(path).catch(() => undefined);
  },
  { immediate: true },
);

const canDelete = computed(() => repository.details.value?.canDelete === true);
</script>

<template>
  <section class="content-container py-8">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <div class="mb-4 flex flex-wrap items-center justify-end gap-3">
          <BreadcrumbNavigation :path="currentPath" />
          <DeleteDirectoryModal
            v-if="canDelete"
            :path="currentPath"
            @deleted="repository.load(currentPath, true)"
          />
        </div>

        <div class="panel-surface rounded-lg">
          <LoadingState v-if="repository.loading.value" label="Loading Maven directory..." />
          <NotFoundPage v-else-if="repository.error.value && currentPath" embedded />
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

      <SnippetsCard :path="currentPath" :repository-id="repositoryId" />
    </div>
  </section>
</template>
