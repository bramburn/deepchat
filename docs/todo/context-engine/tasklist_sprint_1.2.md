### Task List: Sub-Sprint 1.2 - Backend Configuration Logic

**Objective:** Implement the main process logic to securely store and validate the configuration data sent from the UI.

---

#### **Part 1: Setting up the IPC Handlers**

- [ ] **Create New File:** Create `src/main/presenter/contextCompressionPresenter.ts`. This file will contain all main-process logic for this feature.
- [ ] **Expose IPC in Preload:**
    - [ ] Open `src/preload/index.ts`.
    - [ ] Expose `saveContextCompressionSettings: (settings) => ipcRenderer.invoke(...)` to the renderer.
    - [ ] Expose `getContextCompressionSettings: () => ipcRenderer.invoke(...)` to the renderer.
- [ ] **Register IPC in Main Process:**
    - [ ] Open `src/main/presenter/index.ts` (or the main presenter registration file).
    - [ ] Import and instantiate the new `ContextCompressionPresenter`.
    - [ ] Call a `register()` method on the new presenter instance.
- [ ] **Implement IPC Handlers:**
    - [ ] In `contextCompressionPresenter.ts`, create the `register` method.
    - [ ] Inside `register`, create an `ipcMain.handle` for `save-context-compression-settings`.
    - [ ] Inside `register`, create an `ipcMain.handle` for `get-context-compression-settings`.

#### **Part 2: Implementing Secure Storage**

- [ ] **Install Dependencies:** Run `npm install electron-store electron-safe-storage`.
- [ ] **Implement `saveSettings` Logic:**
    - [ ] In `contextCompressionPresenter.ts`, import `Store` and `safeStorage`.
    - [ ] Create a `Store` instance.
    - [ ] In the `save-context-compression-settings` handler, get the `pineconeApiKey` from the incoming `settings` object.
    - [ ] Use `safeStorage.encryptString(pineconeApiKey)` to encrypt the key.
    - [ ] Store the **encrypted** key, `pineconeEnv`, and `ollamaModel` using `store.set()`. Store the encrypted key as a base64 string.
- [ ] **Implement `getSettings` Logic:**
    - [ ] In the `get-context-compression-settings` handler, use `store.get()` to retrieve the saved settings.
    - [ ] Return an object containing `pineconeEnv` and `ollamaModel`, but **explicitly exclude** the encrypted API key from the response sent to the renderer.

#### **Part 3: Implementing Validation Logic (TDD Approach)**

- [ ] **Create Test File:** Create `src/test/main/presenter/contextCompressionPresenter.test.ts`.
- [ ] **Write Pinecone Validation Test:**
    - [ ] Write a test case that mocks the `@pinecone-database/pinecone` client.
    - [ ] The test should check that your validation function returns `{ success: true }` on a successful API call.
    - [ ] Write another test case that simulates an API error and asserts the function returns `{ success: false, error: '...' }`.
- [ ] **Implement Pinecone Validation Function:**
    - [ ] In `contextCompressionPresenter.ts`, create a private `async` function `validatePinecone(apiKey, environment)`.
    - [ ] Install `@pinecone-database/pinecone` (`npm install @pinecone-database/pinecone`).
    - [ ] Inside a `try...catch` block, instantiate the `Pinecone` client and make a simple, non-destructive API call like `listIndexes()`.
    - [ ] Return the appropriate success or error object.
- [ ] **Write Ollama Validation Test:**
    - [ ] Write a test case that mocks `node-fetch`.
    - [ ] The test should check that your validation function correctly parses the `/api/tags` response and finds the model.
    - [ ] Write a test for when the model is not found.
    - [ ] Write a test for when the fetch call fails (Ollama server is offline).
- [ ] **Implement Ollama Validation Function:**
    - [ ] In `contextCompressionPresenter.ts`, create a private `async` function `validateOllamaModel(modelName)`.
    - [ ] Install `node-fetch` (`npm install node-fetch`).
    - [ ] Inside a `try...catch` block, fetch `http://127.0.0.1:11434/api/tags`.
    - [ ] Check if the response JSON contains a model whose name includes `modelName`.
    - [ ] Return the appropriate success or error object.

#### **Part 4: Integrating Validation into the IPC Handler**

- [ ] **Update `save-context-compression-settings` handler:**
    - [ ] Before saving, first `await` the result of `this.validatePinecone(...)`. If it fails, return the error object immediately.
    - [ ] Next, `await` the result of `this.validateOllamaModel(...)`. If it fails, return the error object immediately.
    - [ ] If both validations pass, proceed with encrypting and saving the settings.
    - [ ] Finally, return `{ success: true }`.
