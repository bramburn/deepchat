### Implementation Guidance: Sub-Sprint 1.1 - Configuration UI

This guide provides technical direction for implementing the user interface for configuring context compression settings.

**Objective:** To create the user interface components within the main settings page that allow users to configure their Pinecone and Ollama credentials.

**1. File to Modify:**
The primary file for this task is likely a Vue component responsible for rendering the settings page. Based on the project structure, a probable candidate is `src/renderer/src/shell/Settings/SettingsTabView.vue`. A global search for "Settings" in `.vue` files will confirm the exact location.

**2. Component Implementation (Vue 3 with Composition API):**

It is recommended to use Vue 3's Composition API for managing the component's logic.

**Template (`<template>` section):**
The HTML structure should be organized and use clear labels. Use `type="password"` for the API key to ensure it is masked.

```html
<!-- In SettingsTabView.vue -->
<template>
  <div class="settings-section">
    <h2>Context Compression</h2>
    <p class="text-sm text-gray-500">
      Enable long-term memory by embedding and storing chat history in a Pinecone vector database.
      Requires a running Ollama instance with a compatible embedding model.
    </p>

    <div class="form-group mt-4">
      <label for="pinecone-api-key" class="block text-sm font-medium text-gray-700">Pinecone API Key</label>
      <input id="pinecone-api-key" type="password" v-model="settings.pineconeApiKey" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Enter your Pinecone API key">
    </div>

    <div class="form-group mt-4">
      <label for="pinecone-env" class="block text-sm font-medium text-gray-700">Pinecone Environment</label>
      <input id="pinecone-env" type="text" v-model="settings.pineconeEnv" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., us-west1-gcp">
    </div>

    <div class="form-group mt-4">
      <label for="ollama-model" class="block text-sm font-medium text-gray-700">Ollama Embedding Model</label>
      <input id="ollama-model" type="text" v-model="settings.ollamaModel" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., nomic-embed-text">
    </div>

    <div class="mt-6 flex items-center">
      <button @click="handleSave" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Save Settings
      </button>
      <p v-if="statusMessage" class="ml-4 text-sm text-gray-600">{{ statusMessage }}</p>
    </div>
  </div>
</template>
```

**Script (`<script setup>` section):**
Use `ref` for reactive state. The component should load existing settings on mount and call the main process via an IPC channel to save them.

```javascript
// In SettingsTabView.vue
import { ref, onMounted } from 'vue';

// Define the shape of the settings object
const settings = ref({
  pineconeApiKey: '',
  pineconeEnv: '',
  ollamaModel: 'nomic-embed-text'
});

const statusMessage = ref('');

// On component mount, load the existing configuration (excluding the API key for security)
onMounted(async () => {
  const existingSettings = await window.api.getContextCompressionSettings();
  if (existingSettings) {
    settings.value.pineconeEnv = existingSettings.pineconeEnv || '';
    settings.value.ollamaModel = existingSettings.ollamaModel || 'nomic-embed-text';
  }
});

// Handle the save button click
async function handleSave() {
  statusMessage.value = 'Validating and saving...';
  try {
    // The main process will handle validation and secure storage
    const result = await window.api.saveContextCompressionSettings(settings.value);
    if (result.success) {
      statusMessage.value = 'Settings saved successfully!';
      // Clear the API key from the form after successful save
      settings.value.pineconeApiKey = '';
    } else {
      statusMessage.value = `Error: ${result.error}`;
    }
  } catch (error) {
    statusMessage.value = 'An unexpected error occurred.';
    console.error('Failed to save settings:', error);
  }
}
```

**3. IPC Communication:**
The renderer process (Vue component) cannot directly save files or perform secure actions. It must communicate with the main process via IPC (Inter-Process Communication). The `preload` script is responsible for exposing a secure API to the renderer.

-   **`src/preload/index.ts`**: Expose the `saveContextCompressionSettings` and `getContextCompressionSettings` functions.
    ```typescript
    // In contextBridge.exposeInMainWorld('api', ...);
    saveContextCompressionSettings: (settings) => ipcRenderer.invoke('save-context-compression-settings', settings),
    getContextCompressionSettings: () => ipcRenderer.invoke('get-context-compression-settings'),
    ```

-   **`src/main/presenter/index.ts` (or similar main process file)**: Handle the IPC call, perform validation, and store the data securely. This part is covered in Sub-Sprint 1.2.

**4. Key Considerations:**
-   **Security:** Never store the API key in the Vue component's state long-term or display it after it has been entered. The `type="password"` input is a basic but essential first step. The actual secure storage will be handled in the main process (Sub-Sprint 1.2).
-   **User Experience (UX):** Provide clear feedback to the user during and after the save operation (e.g., "Saving...", "Success!", "Invalid API Key"). Disable the save button while a save is in progress to prevent multiple clicks.
-   **Validation:** While Sub-Sprint 1.2 covers backend validation, basic frontend validation (e.g., checking if fields are empty) can provide faster feedback to the user.
