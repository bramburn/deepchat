### Task List: Sub-Sprint 1.1 - Configuration UI

**Objective:** Create the user interface components for configuring Pinecone and Ollama settings.

**File to Modify:** `src/renderer/src/shell/Settings/SettingsTabView.vue` (or similar settings component)

---

#### **Part 1: Scaffolding the UI Section**

- [ ] **Open File:** Navigate to and open `src/renderer/src/shell/Settings/SettingsTabView.vue`.
- [ ] **Add Section:** Add a new root `<div>` for the "Context Compression" section with a `<h2>` title and a `<p>` tag for a brief description.
- [ ] **Styling:** Apply existing CSS classes (e.g., `settings-section`) to the new `<div>` to ensure it matches the visual style of other settings sections.

#### **Part 2: Implementing the Input Fields**

- [ ] **Pinecone API Key:**
    - [ ] Add a `<div>` to act as a form group.
    - [ ] Inside the group, add a `<label>` with the text "Pinecone API Key".
    - [ ] Add an `<input>` field.
    - [ ] Set the `type` attribute of the input to `password` to mask the key.
    - [ ] Bind the input to a new Vue reactive state variable, e.g., `v-model="compressionSettings.pineconeApiKey"`.
- [ ] **Pinecone Environment:**
    - [ ] Add a `<div>` to act as a form group.
    - [ ] Inside the group, add a `<label>` with the text "Pinecone Environment".
    - [ ] Add an `<input>` field of `type="text"`.
    - [ ] Bind the input to `v-model="compressionSettings.pineconeEnv"`.
    - [ ] Add a `placeholder` attribute (e.g., "e.g., us-west1-gcp").
- [ ] **Ollama Embedding Model:**
    - [ ] Add a `<div>` to act as a form group.
    - [ ] Inside the group, add a `<label>` with the text "Ollama Embedding Model".
    - [ ] Add an `<input>` field of `type="text"`.
    - [ ] Bind the input to `v-model="compressionSettings.ollamaModel"`.
    - [ ] Set a default value or placeholder (e.g., "nomic-embed-text").

#### **Part 3: Implementing the Component Logic**

- [ ] **Import `ref`:** In the `<script setup>` section, import `ref` from `vue`.
- [ ] **Define State:** Create a `ref` named `compressionSettings` to hold the values for the input fields (`pineconeApiKey`, `pineconeEnv`, `ollamaModel`).
- [ ] **Add Save Button:**
    - [ ] Add a `<button>` element with the text "Save Settings".
    - [ ] Add a `@click` handler that calls a new function, e.g., `handleSave`.
- [ ] **Add Status Message:**
    - [ ] Add a `<p>` tag to display status updates (e.g., "Saving...", "Settings saved!").
    - [ ] Bind its visibility to a new state variable, e.g., `v-if="statusMessage"`.
    - [ ] Bind its content to the `statusMessage` variable.
- [ ] **Implement `handleSave` function:**
    - [ ] Define an `async` function named `handleSave`.
    - [ ] Set `statusMessage.value` to "Validating and saving...".
    - [ ] Call a (yet-to-be-created) IPC function, e.g., `window.api.saveContextCompressionSettings(compressionSettings.value)`.
    - [ ] Based on the `result` of the IPC call, update `statusMessage.value` to show either a success or an error message.
    - [ ] On success, clear the `pineconeApiKey` field in the `compressionSettings` state object for security.
- [ ] **Load Existing Settings:**
    - [ ] Import `onMounted` from `vue`.
    - [ ] Use the `onMounted` hook to call a new IPC function `window.api.getContextCompressionSettings()`.
    - [ ] Populate the `compressionSettings` state with the loaded data (but **exclude** the API key).

