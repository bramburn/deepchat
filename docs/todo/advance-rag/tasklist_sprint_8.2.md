### Task List: Sub-Sprint 8.2 - Data Flow for Context Visualization

**Objective:** Implement the data pipeline to pass the retrieved context from the main process to the renderer UI components.

---

#### **Part 1: Attaching Context Data in `threadPresenter` (TDD)**

- [ ] **Open Presenter Test File:** Navigate to `src/test/main/presenter/threadPresenter.test.ts`.
- [ ] **Write Data Attachment Test:**
    - [ ] In a test for the main message handler, mock the full RAG pipeline to return a sample array of context messages.
    - [ ] Mock the `event.sender.send` IPC call.
    - [ ] Run the handler.
    - [ ] Assert that the `assistantMessage` object passed to the `send` mock contains a `retrievedContext` property, and that its value is an array of strings matching the content of the context messages.
- [ ] **Implement in Presenter:**
    - [ ] Open `src/main/presenter/threadPresenter.ts`.
    - [ ] In the main message handling function, after the RAG pipeline has produced the `finalMessages` for the prompt, store a copy of their content: `const contextStrings = finalMessages.map(m => m.content);`.
    - [ ] After the LLM has returned its response, find where the final `assistantMessage: ChatMessage` object is created.
    - [ ] Add the property to this object: `retrievedContext: contextStrings`.
    - [ ] Ensure this complete object is what gets sent to the renderer process.

#### **Part 2: State Management in Renderer (TDD)**

- [ ] **Open Store Test File:** Navigate to the test file for the `chat.ts` Pinia store.
- [ ] **Write Store Test:**
    - [ ] Write a test for the action that adds the final assistant message to the state (e.g., `addAssistantMessage`).
    - [ ] Create a mock `ChatMessage` payload that includes the `retrievedContext` array.
    - [ ] Call the action with this payload.
    - [ ] Assert that the message object added to the store's state includes the `retrievedContext` property with the correct data.
- [ ] **Implement in Store:**
    - [ ] Open `src/renderer/src/store/chat.ts`.
    - [ ] Locate the action that handles the incoming, fully formed assistant message.
    - [ ] No implementation change should be needed if the action simply pushes the entire message payload into the state array, as the new property will come along with it. Verify this is the case.

#### **Part 3: End-to-End Manual Verification**

- [ ] **Run the Application.**
- [ ] **Step 1:** Start a conversation with a model that has context compression enabled.
- [ ] **Step 2:** Have a conversation long enough to ensure context is being stored.
- [ ] **Step 3:** Ask a question that should trigger retrieval from older messages.
- [ ] **Step 4:** Check the main process logs to see what context was retrieved.
- [ ] **Step 5:** In the UI, verify that the new assistant response has the context visualization icon.
- [ ] **Step 6:** Click the icon.
- [ ] **Step 7:** **Assert:** The text displayed in the `ContextViewer` modal exactly matches the context that was logged in the main process.
