### User Story: Configure Context Compression Settings

**As a** Power User, **I want to** configure my Pinecone and Ollama settings in the application, **so that** I can use them for context compression.

**Workflow:**
1.  Navigate to the main settings page.
2.  Locate the new "Context Compression" section.
3.  Enter Pinecone API Key and Environment.
4.  Specify the Ollama embedding model.
5.  Save the configuration.
6.  Receive feedback on whether the configuration was saved successfully.

**File Changes:**
-   **Modify**: `src/renderer/src/shell/Settings/SettingsTabView.vue` (Path requires verification from the codebase)

**Actions to Undertake:**
1.  **Filepath**: `src/renderer/src/shell/Settings/SettingsTabView.vue`
    -   **Action**: Add a new section titled "Context Compression".
    -   **Implementation**:
        ```html
        <div class="settings-section">
          <h2>Context Compression</h2>
          <p>Configure Pinecone and a local embedding model to enable context compression.</p>
          <!-- Form elements will go here -->
        </div>
        ```
2.  **Filepath**: `src/renderer/src/shell/Settings/SettingsTabView.vue`
    -   **Action**: Add input fields for Pinecone API Key (as password), Pinecone Environment, and Ollama Model Name.
    -   **Implementation**:
        ```html
        <div class="form-group">
          <label for="pinecone-api-key">Pinecone API Key</label>
          <input id="pinecone-api-key" type="password" v-model="compressionSettings.pineconeApiKey" />
        </div>
        <div class="form-group">
          <label for="pinecone-env">Pinecone Environment</label>
          <input id="pinecone-env" type="text" v-model="compressionSettings.pineconeEnv" />
        </div>
        <div class="form-group">
          <label for="ollama-model">Ollama Embedding Model</label>
          <input id="ollama-model" type="text" v-model="compressionSettings.ollamaModel" placeholder="e.g., nomic-embed-text" />
        </div>
        ```
3.  **Filepath**: `src/renderer/src/shell/Settings/SettingsTabView.vue`
    -   **Action**: Add a "Save" button and a status message area.
    -   **Implementation**:
        ```html
        <button @click="saveCompressionSettings">Save</button>
        <p v-if="saveStatus">{{ saveStatus }}</p>
        ```
4.  **Filepath**: `src/renderer/src/shell/Settings/SettingsTabView.vue`
    -   **Action**: Implement the component's script to handle data and the save action.
    -   **Implementation**:
        ```javascript
        import { ref } from 'vue';
        // Assuming an IPC channel is set up to communicate with the main process
        const compressionSettings = ref({
          pineconeApiKey: '',
          pineconeEnv: '',
          ollamaModel: 'nomic-embed-text'
        });
        const saveStatus = ref('');

        async function saveCompressionSettings() {
          saveStatus.value = 'Saving...';
          const result = await window.api.saveContextCompressionSettings(compressionSettings.value);
          if (result.success) {
            saveStatus.value = 'Settings saved and validated successfully!';
          } else {
            saveStatus.value = `Error: ${result.error}`;
          }
        }
        ```
    -   **Imports**: `import { ref } from 'vue';`

**Acceptance Criteria:**
-   The new "Context Compression" section is clearly visible on the settings page.
-   Users can input their Pinecone API key (masked) and environment.
-   Users can specify the Ollama model.
-   The application provides clear validation messages for incorrect or missing inputs upon saving.
-   Saved credentials are not displayed in plain text after being saved and reloaded.

**Testing Plan:**
-   **Test Case 1**: Open settings and verify the new section and fields are present.
-   **Test Case 2**: Enter valid data, click save, and verify a success message is shown.
-   **Test Case 3**: Enter invalid data (e.g., leave a field blank), click save, and verify an appropriate error message is shown.
-   **Test Case 4**: After saving, close and reopen the settings to ensure the non-sensitive fields (Environment, Model) are populated, and the API key field is empty.
