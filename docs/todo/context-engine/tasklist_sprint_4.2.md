### Task List: Sub-Sprint 4.2 - Pinecone Deletion Logic

**Objective:** Implement the final step of deleting all vectors for a given namespace from the Pinecone index.

---

#### **Part 1: Implementing the Deletion Method (TDD)**

- [ ] **Open Service Test File:** Navigate to `src/test/main/services/PineconeService.test.ts`.
- [ ] **Write Deletion Tests:**
    - [ ] Write a test for the `deleteNamespace` method.
    - [ ] Mock the Pinecone client's `index.namespace(namespace).deleteAll` method.
    - [ ] Call `deleteNamespace` and assert that the mocked `deleteAll` method was called on the correct namespace.
    - [ ] Write a test where the mocked `deleteAll` method throws an error. Assert that the error is caught and logged, and does not crash the service.
    - [ ] Write a test for the case where the service is not initialized (e.g., no API key). Assert that the method logs a warning and returns without attempting to call the Pinecone client.
- [ ] **Implement `deleteNamespace` Method:**
    - [ ] Open `src/main/services/PineconeService.ts`.
    - [ ] Create a new public `async` method `deleteNamespace(namespace: string): Promise<void>`.
    - [ ] **Step 1:** Call `await this.initialize()` to ensure the client is ready.
    - [ ] **Step 2:** Add a guard clause: `if (!this.index) { ... }` to handle cases where initialization failed.
    - [ ] **Step 3:** Wrap the core logic in a `try...catch` block.
    - [ ] **Step 4:** Inside the `try` block, log the intent: `logger.info({ namespace }, 'Initiating deletion...')`.
    - [ ] **Step 5:** Make the API call: `await this.index.namespace(namespace).deleteAll();`.
    - [ ] **Step 6:** Log the successful completion.
    - [ ] **Step 7:** In the `catch` block, log the error. **Do not** re-throw the error, as this is a background task.

#### **Part 2: End-to-End Manual Testing**

- [ ] **Setup:**
    - [ ] Ensure your Pinecone and Ollama credentials are correctly configured in the application settings.
    - [ ] Enable context compression for at least one model.
- [ ] **Execution:**
    - [ ] **Step 1:** Start a new chat with the enabled model.
    - [ ] **Step 2:** Send several messages to ensure embeddings are generated and stored.
    - [ ] **Step 3:** Go to your Pinecone account console and verify that a new namespace (matching the thread ID) has been created and contains vectors.
    - [ ] **Step 4:** Go back to the DeepChat application and delete the chat thread.
- [ ] **Verification:**
    - [ ] **Step 5:** Check the main process logs to confirm the entire deletion pipeline was triggered (from the IPC event to the final deletion log).
    - [ ] **Step 6:** Refresh your Pinecone console. Verify that the namespace associated with the deleted thread is now empty or has been completely removed.
- [ ] **Negative Test Case:**
    - [ ] **Step 7:** Delete a different thread that had context compression disabled.
    - [ ] **Step 8:** Verify that no errors occurred in the main process logs. The deletion logic should handle non-existent namespaces gracefully.

