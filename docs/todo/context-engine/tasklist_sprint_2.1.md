### Task List: Sub-Sprint 2.1 - Model-Specific Toggle UI

**Objective:** Add a toggle switch to the model configuration dialog to control context compression for each model individually.

---

#### **Part 1: Updating the Data Structure (TDD Prep)**

- [ ] **Open Shared Type Definition:** Navigate to `src/shared/model.ts` (or the equivalent file defining the `ModelConfig` type).
- [ ] **Add Property:** Add a new optional boolean property `contextCompressionEnabled?: boolean;` to the `ModelConfig` interface.
- [ ] **Update Mock Data:** In your test files where you use mock `ModelConfig` objects, update them to reflect this new structure for relevant tests.

#### **Part 2: Implementing the UI Toggle**

- [ ] **Locate Component:** Find the Vue component responsible for the model settings dialog (e.g., `src/renderer/src/components/ModelConfigDialog.vue`).
- [ ] **Add Toggle to Template:**
    - [ ] Add a `<div>` to wrap the new toggle switch and its label.
    - [ ] Add a `<label>` with the text "Enable Context Compression".
    - [ ] Add a `<Switch>` component (assuming one exists in the project's UI library). Bind its value with `v-model="editableConfig.contextCompressionEnabled"`.
    - [ ] Bind the `:disabled` attribute of the switch to a new computed property, e.g., `!isCompressionConfigured`.
- [ ] **Add Tooltip/Helper Text:**
    - [ ] Below the switch, add a `<p>` tag with helper text (e.g., "Configure Context Compression in global settings to enable this.").
    - [ ] Use `v-if="!isCompressionConfigured"` to show this text only when the toggle is disabled.

#### **Part 3: Implementing the Component Logic**

- [ ] **Create Local Editable State:**
    - [ ] In the dialog component's script, ensure you are editing a local reactive copy of the model config prop (e.g., `editableConfig`), not the prop directly. This is crucial for cancel/save logic.
- [ ] **Create `isCompressionConfigured` Computed Property:**
    - [ ] Import `computed` from `vue` and your global settings store (e.g., `useGlobalSettingsStore`).
    - [ ] Create a `computed` property named `isCompressionConfigured` that returns `true` or `false` based on whether the main Pinecone/Ollama settings are valid. This logic should come from a getter in the Pinia store.
- [ ] **Update Pinia Store:**
    - [ ] Open the global settings store file (e.g., `src/renderer/src/store/settings.ts`).
    - [ ] Add a new getter `isCompressionConfigured` that checks if the required settings (e.g., `state.contextCompression.pineconeEnv`) are present.
    - [ ] Create an action in the store to load these settings from the main process on application startup.
- [ ] **Ensure State is Saved:**
    - [ ] Verify that when the user clicks the "Save" button in the dialog, the `editableConfig` object, including the new `contextCompressionEnabled` flag, is emitted or passed to the action that saves the model configuration.

#### **Part 4: Testing (TDD)**

- [ ] **Write Component Test File:** Create a test file for the `ModelConfigDialog.vue` component if one doesn't exist.
- [ ] **Test Case 1: Toggle Disabled:**
    - [ ] Write a test where the Pinia store's `isCompressionConfigured` getter returns `false`.
    - [ ] Mount the component and assert that the Switch is in a disabled state.
    - [ ] Assert that the helper text is visible.
- [ ] **Test Case 2: Toggle Enabled:**
    - [ ] Write a test where the Pinia store's `isCompressionConfigured` getter returns `true`.
    - [ ] Mount the component and assert that the Switch is enabled.
    - [ ] Assert that the helper text is not visible.
- [ ] **Test Case 3: State Saving:**
    - [ ] Write a test that simulates toggling the switch on.
    - [ ] Trigger the save event.
    - [ ] Assert that the emitted payload includes `contextCompressionEnabled: true`.
