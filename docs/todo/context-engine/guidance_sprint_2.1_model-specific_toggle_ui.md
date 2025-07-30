### Implementation Guidance: Sub-Sprint 2.1 - Model-Specific Toggle UI

This guide provides technical direction for adding a UI toggle to enable or disable context compression on a per-model basis.

**Objective:** To add a toggle switch to the model settings pop-up that allows users to enable or disable context compression for individual models.

**1. Data Model Modification:**
First, the data structure for a model configuration needs to be updated to include the new setting.

-   **File:** `src/shared/model.ts`
-   **Action:** Add an optional boolean flag `contextCompressionEnabled` to the `ModelConfig` interface.

```typescript
// src/shared/model.ts
export interface ModelConfig {
  id: string;
  name: string;
  // ... other properties
  contextCompressionEnabled?: boolean; // Add this line
}
```

**2. UI Component Modification (`ModelConfigDialog.vue`):**
This is the main part of the task. You will need to find the Vue component that renders the dialog for adding or editing a model configuration.

-   **File to find:** Search for a file named `ModelConfigDialog.vue`, `ModelSettings.vue`, or similar.
-   **Action:** Add a toggle switch to this component's template and the logic to control it.

**Template Modification:**
It's recommended to use a pre-existing UI component library if the project has one (e.g., Shadcn, Element, Vuetify). If not, a simple HTML checkbox can be styled as a toggle. The example below assumes a generic `<Switch>` component.

```html
<!-- In ModelConfigDialog.vue template -->
<div class="flex items-center justify-between mt-4">
  <div>
    <label for="context-compression-toggle" class="font-medium text-gray-700">Enable Context Compression</label>
    <p class="text-sm text-gray-500">Use Pinecone and Ollama for long-term memory.</p>
  </div>
  <Switch
    id="context-compression-toggle"
    :disabled="!isCompressionConfigured"
    v-model="editableConfig.contextCompressionEnabled"
    class="..."
  />
</div>
<div v-if="!isCompressionConfigured" class="mt-2 text-xs text-red-600">
  You must configure Context Compression in the main application settings to enable this feature.
</div>
```

**Script Logic (`<script setup>`):**
The component needs to know if the global context compression settings are configured. This should be retrieved from a central Pinia store.

```javascript
// In ModelConfigDialog.vue script
import { ref, computed, onMounted, watch } from 'vue';
import { useGlobalSettingsStore } from '@/stores/globalSettings'; // Adjust path
import Switch from '@/components/ui/Switch.vue'; // Adjust path

const props = defineProps<{ model: ModelConfig }>();
const emit = defineEmits(['save']);

const globalSettingsStore = useGlobalSettingsStore();

// A local, editable copy of the model config
const editableConfig = ref<ModelConfig>({});

// Check if the main settings are configured
const isCompressionConfigured = computed(() => globalSettingsStore.isCompressionConfigured);

// When the dialog opens, copy the prop to a local ref
onMounted(() => {
  editableConfig.value = { ...props.model };
});

// If the original model prop changes, update the local ref
watch(() => props.model, (newModel) => {
  editableConfig.value = { ...newModel };
});

function onSave() {
  // When saving, emit the local, edited config
  emit('save', editableConfig.value);
}
```

**3. State Management (Pinia):**
A getter should be added to the global settings store to easily check if context compression is ready to be used.

-   **File:** `src/renderer/src/store/settings.ts` (or equivalent)
-   **Action:** Add a getter.

```typescript
// In your settings Pinia store
import { defineStore } from 'pinia';

export const useGlobalSettingsStore = defineStore('globalSettings', {
  state: () => ({
    // This assumes you have a nested object for these settings
    contextCompression: {
      pineconeEnv: null,
      ollamaModel: null,
      // Note: The API key should NOT be stored here
    }
  }),
  getters: {
    isCompressionConfigured(state) {
      return !!state.contextCompression.pineconeEnv && !!state.contextCompression.ollamaModel;
    },
  },
  actions: {
    // Action to load these settings from the main process
    async loadCompressionConfig() {
      const config = await window.api.getContextCompressionSettings();
      if (config) {
        this.contextCompression.pineconeEnv = config.pineconeEnv;
        this.contextCompression.ollamaModel = config.ollamaModel;
      }
    }
  }
});
```

**4. Key Considerations:**
-   **Clarity:** The UI must make it very clear to the user *why* the toggle is disabled. A simple disabled state is not enough; a tooltip or helper text is crucial.
-   **Centralized Logic:** The check for whether compression is configured (`isCompressionConfigured`) should be in a central store. Do not duplicate this logic in multiple components.
-   **Props vs. Local State:** The dialog should edit a local copy of the model configuration object. This prevents unintended changes if the user cancels the dialog and makes it clear that changes are only committed upon saving.
