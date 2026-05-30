<script setup lang="ts">
import { Copy } from "lucide-vue-next";
import { computed, ref, watch, onMounted } from "vue";
import hljs from "highlight.js";

import { createArtifactUrl } from "@/api/client";
import { mavenApi } from "@/api/maven";
import { settingsApi } from "@/api/settings";
import { useClipboardToast } from "@/composables/useClipboardToast";
import {
  type ArtifactCoordinates,
  type MavenMetadata,
  useMavenMetadata,
} from "@/composables/useMavenMetadata";

const props = defineProps<{
  path: string;
  repositoryId?: string;
}>();

type SnippetTab = "Maven" | "Gradle Kotlin" | "Gradle Groovy";

const {
  coordinatesFromPath,
  mergeMetadata,
  metadataCandidates,
  parseMetadata,
} = useMavenMetadata();
const { copy } = useClipboardToast();

const selected = ref<SnippetTab>("Maven");
const snippetTabs = ["Maven", "Gradle Kotlin", "Gradle Groovy"] as const;
const coordinates = ref<ArtifactCoordinates | null>(null);
const metadata = ref<MavenMetadata | null>(null);
const metadataLoading = ref(false);
const metadataNote = ref("");
let metadataRequestId = 0;

const repositoryId = computed(() => props.repositoryId || "Cloud Maven");
const baseUrl = ref("");
const repositoryUrl = computed(() => {
  if (baseUrl.value) return baseUrl.value;
  const prefix = import.meta.env.VITE_API_BASE_URL || "";
  return prefix ? new URL(prefix, window.location.origin).toString() : window.location.origin;
});

const effectiveVersion = computed(() => coordinates.value?.version || "VERSION");

const repositorySnippet = computed(() => {
  if (selected.value === "Gradle Kotlin") {
    return `repositories {\n  maven {\n    name = "${repositoryId.value}"\n    url = uri("${repositoryUrl.value}")\n  }\n}`;
  }

  if (selected.value === "Gradle Groovy") {
    return `repositories {\n  maven {\n    name = "${repositoryId.value}"\n    url = uri("${repositoryUrl.value}")\n  }\n}`;
  }

  return `<repository>\n  <id>${repositoryId.value}</id>\n  <url>${repositoryUrl.value}</url>\n</repository>`;
});

const artifactSnippet = computed(() => {
  const current = coordinates.value;

  if (!current) {
    return repositorySnippet.value;
  }

  if (selected.value === "Gradle Kotlin") {
    return `implementation("${current.groupId}:${current.artifactId}:${effectiveVersion.value}")`;
  }

  if (selected.value === "Gradle Groovy") {
    return `implementation '${current.groupId}:${current.artifactId}:${effectiveVersion.value}'`;
  }

  return `<dependency>\n  <groupId>${current.groupId}</groupId>\n  <artifactId>${current.artifactId}</artifactId>\n  <version>${effectiveVersion.value}</version>\n</dependency>`;
});

const snippet = computed(() => coordinates.value ? artifactSnippet.value : repositorySnippet.value);

const loadMetadata = async (path: string) => {
  const requestId = ++metadataRequestId;
  const fallback = coordinatesFromPath(path);

  selected.value = "Maven";
  coordinates.value = fallback;
  metadata.value = null;
  metadataNote.value = fallback
    ? "Looking for maven-metadata.xml..."
    : "Select an artifact path to generate dependency snippets.";

  if (!fallback) {
    return;
  }

  metadataLoading.value = true;

  try {
    for (const candidate of metadataCandidates(path)) {
      try {
        const response = await mavenApi.content(candidate.metadataPath);
        const parsed = parseMetadata(response.data);

        if (requestId !== metadataRequestId) {
          return;
        }

        if (parsed) {
          metadata.value = parsed;
          coordinates.value = mergeMetadata(candidate, parsed);
          metadataNote.value = candidate.source === "version"
            ? "Using artifact metadata from the parent path."
            : "Using artifact metadata from this path.";
          return;
        }
      } catch {
        // Try the next Maven metadata candidate before falling back.
      }
    }

    if (requestId === metadataRequestId) {
      metadataNote.value = fallback.version
        ? "Metadata was not found; using the version inferred from the path."
        : "Metadata was not found; publish maven-metadata.xml or select a version path.";
    }
  } finally {
    if (requestId === metadataRequestId) {
      metadataLoading.value = false;
    }
  }
};

watch(
  () => props.path,
  (path) => {
    loadMetadata(path);
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    const response = await settingsApi.get();
    baseUrl.value = response.data.baseUrl || "";
  } catch {
    // keep fallback
  }
});

const selectTab = (tab: (typeof snippetTabs)[number]) => {
  selected.value = tab;
};

const highlightedCode = computed(() => {
  const code = snippet.value;
  const lang = selected.value === "Maven" ? "xml" : selected.value === "Gradle Kotlin" ? "kotlin" : "gradle";
  try {
    return hljs.highlight(code, { language: lang }).value;
  } catch {
    return code;
  }
});
</script>

<template>
  <aside class="panel-surface lift rounded-lg p-5 sm:sticky sm:top-6 sm:self-start">
    <div class="mb-4">
      <p class="muted-label">Snippet</p>
      <h2 class="font-semibold">{{ coordinates ? "Artifact details" : "Repository details" }}</h2>
    </div>

    <div v-if="coordinates" class="mb-4 grid gap-2 rounded-md bg-gray-50 p-3 text-xs dark:bg-gray-800">
      <div class="metadata-row">
        <span>Group</span>
        <strong>{{ coordinates.groupId }}</strong>
      </div>
      <div class="metadata-row">
        <span>Artifact</span>
        <strong>{{ coordinates.artifactId }}</strong>
      </div>
      <div class="metadata-row">
        <span>Version</span>
        <strong>{{ effectiveVersion }}</strong>
      </div>
      <div v-if="metadata?.lastUpdated" class="metadata-row">
        <span>Updated</span>
        <strong>{{ metadata.lastUpdated }}</strong>
      </div>
    </div>

    <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
      <span v-if="metadataLoading">Reading metadata...</span>
      <span v-else>{{ metadataNote }}</span>
    </p>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in snippetTabs"
          :key="tab"
          class="snippet-tab"
          :class="{ selected: selected === tab }"
          type="button"
          @click="selectTab(tab)"
        >
          {{ tab }}
        </button>
      </div>
      <button class="icon-button" type="button" title="Copy snippet" @click="copy(snippet)">
        <Copy class="h-4 w-4" />
      </button>
    </div>

    <transition name="slide-fade" mode="out-in">
      <pre :key="selected + path + effectiveVersion" class="snippet-code"><code v-html="highlightedCode"></code></pre>
    </transition>
  </aside>
</template>

<style scoped>
.metadata-row {
  display: grid;
  grid-template-columns: 4.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.metadata-row span {
  color: rgb(107 114 128);
}

.metadata-row strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
}

.snippet-tab {
  border-radius: 0.375rem;
  padding: 0.35rem 0.55rem;
  color: rgb(75 85 99);
  font-size: 0.78rem;
  transition: background-color 180ms ease, color 180ms ease;
}

.snippet-tab:hover,
.snippet-tab.selected {
  background: rgb(243 244 246);
  color: rgb(17 24 39);
}

.snippet-code {
  min-height: 9rem;
  overflow: auto;
  border-radius: 0.5rem;
  background: rgb(243 244 246);
  padding: 1rem;
  font-family: Consolas, Monaco, monospace;
  font-size: 0.8rem;
  line-height: 1.45;
  white-space: pre;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.snippet-code code {
  display: block;
  min-width: 0;
}

.dark .metadata-row span {
  color: rgb(156 163 175);
}

.dark .snippet-tab {
  color: rgb(209 213 219);
}

.dark .snippet-tab:hover,
.dark .snippet-tab.selected {
  background: rgb(31 41 55);
  color: white;
}

.dark .snippet-code {
  background: rgb(31 41 55);
  color: rgb(229 231 235);
}

.dark .snippet-code code {
  color: inherit;
}
</style>
