### User Story: Enable/Disable Context Compression for a Model

**As a** Power User, **I want to** enable or disable context compression for each individual model, **so that** I can control which conversations use the advanced context strategy.

**Workflow:**
1.  Open the configuration dialog for a specific LLM.
2.  See a toggle switch labeled "Enable Context Compression".
3.  If the main context compression settings are not configured, the toggle is disabled with an explanatory tooltip.
4.  If settings are configured, the toggle is enabled.
5.  The user can turn the toggle on or off.
6.  The state of the toggle is saved along with the rest of the model's configuration.

**File Changes:**
-   **Modify**: `src/renderer/src/components/ModelConfigDialog.vue` (Path requires verification, this is a likely candidate).
-   **Modify**: `src/shared/model.ts` (To add the new `contextCompressionEnabled` flag to the model configuration type definition).
-   **Modify**: The Pinia store responsible for managing model settings (e.g., `src/renderer/src/store/settings.ts`).

**Actions to Undertake:**
1.  **Filepath**: `src/shared/model.ts`
    -   **Action**: Add a new boolean property to the model configuration interface.
    -   **Implementation**:
        ```typescript
        export interface ModelConfig {
          // ... existing properties
          contextCompressionEnabled?: boolean;
        }
        ```
2.  **Filepath**: `src/renderer/src/components/ModelConfigDialog.vue`
    -   **Action**: Add a new toggle switch component to the dialog's template.
    -   **Implementation**:
        ```html
        <div class="form-group-switch">
          <label for="context-compression-toggle">Enable Context Compression</label>
          <Switch
            id="context-compression-toggle"
            :disabled="!isCompressionConfigured"
            v-model="currentModel.contextCompressionEnabled"
          />
          <p v-if="!isCompressionConfigured" class="tooltip-text">Configure Context Compression in global settings to enable this.</p>
        </div>
        ```
3.  **Filepath**: `src/renderer/src/components/ModelConfigDialog.vue`
    -   **Action**: Implement the logic in the component's script to control the toggle's state.
    -   **Implementation**:
        ```javascript
        import { computed } from 'vue';
        import { useSettingsStore } from '../store/settings'; // Path to be verified

        const settingsStore = useSettingsStore();

        // This computed property checks if the main settings are in place.
        const isCompressionConfigured = computed(() => {
          return settingsStore.hasValidCompressionConfig; // This property needs to be implemented in the store
        });

        // `currentModel` is the reactive model object being edited in the dialog.
        ```
    -   **Imports**: `import { computed } from 'vue';`, `import { useSettingsStore } from '../store/settings';`
4.  **Filepath**: `src/renderer/src/store/settings.ts` (or equivalent)
    -   **Action**: Add a getter or computed property to the settings store to check for valid configuration.
    -   **Implementation**:
        ```typescript
        // In the settings Pinia store
        getters: {
          hasValidCompressionConfig(state) {
            // This logic depends on how settings are stored.
            // It should check for the presence of the environment and model.
            return !!(state.contextCompression.pineconeEnv && state.contextCompression.ollamaModel);
          }
        }
        ```

**Acceptance Criteria:**
-   The "Enable Context Compression" toggle is visible in the model settings dialog.
-   The toggle is disabled with a tooltip explaining why if the main settings are incomplete.
-   The on/off state of the toggle is correctly saved and loaded for each model configuration.
-   The UI clearly reflects the current state of the context compression setting for the model.
-   The application's state is updated in real-time when the toggle is changed.

**Testing Plan:**
-   **Test Case 1 (Disabled State)**: Without configuring main settings, open a model's config. Verify the toggle is present, disabled, and a tooltip is visible.
-   **Test Case 2 (Enabled State)**: Configure the main settings. Open a model's config. Verify the toggle is enabled.
-   **Test Case 3 (Save On)**: Enable the toggle, save the model config. Reopen the config and verify the toggle is still on.
-   **Test Case 4 (Save Off)**: Disable the toggle, save the model config. Reopen the config and verify the toggle is still off.
