### Task List: Sub-Sprint 3.2 - Pinecone Integration and Storage

**Objective:** Integrate with the Pinecone API to store the newly generated embeddings in a thread-specific namespace.

---

#### **Part 1: Pinecone Service (TDD)**

- [ ] **Install Dependencies:** Run `npm install @pinecone-database/pinecone uuid` and `npm install -D @types/uuid`.
- [ ] **Create Service File:** Create `src/main/services/PineconeService.ts`.
- [ ] **Create Test File:** Create `src/test/main/services/PineconeService.test.ts`.
- [ ] **Write Pinecone Service Tests:**
    - [ ] Write a test that mocks the `@pinecone-database/pinecone` client.
    - [ ] Test the `initialize` method to ensure it correctly creates a Pinecone client.
    - [ ] Write a test for the `upsertVectors` method. Mock the `index.namespace(namespace).upsert` call and assert that it was called with the correctly formatted vectors.
    - [ ] Write a test to simulate an API error during upsert and assert that the error is logged and handled.
- [ ] **Implement Pinecone Service:**
    - [ ] In `PineconeService.ts`, define a class `PineconeService` using a singleton pattern (`getInstance`).
    - [ ] Implement a private `async initialize()` method that retrieves the decrypted API key and environment, then creates the `Pinecone` client and gets the index reference (e.g., `this.pinecone.index(...)`).
    - [ ] Implement a public `async upsertVectors(namespace: string, vectors: Vector[])` method.
    - [ ] Inside `upsertVectors`, first call `await this.initialize()`.
    - [ ] Then, inside a `try...catch` block, call `await this.index!.namespace(namespace).upsert(vectors)`.
    - [ ] Log success and errors appropriately.

#### **Part 2: Integrating Storage into `ContextCompressionService`**

- [ ] **Open Service File:** Open `src/main/services/ContextCompressionService.ts`.
- [ ] **Import Dependencies:** Import the `PineconeService` and `v4 as uuidv4` from `uuid`.
- [ ] **Instantiate Service:** Get the singleton instance of the `PineconeService` in the constructor.
- [ ] **Create `processAndStore` Method:**
    - [ ] Create a new public `async` method `processAndStore(thread: ChatThread, newMessage: ChatMessage)` which will be the main entry point called by the `threadPresenter`.
    - [ ] **Step 1:** Call `await this.embedAndPrepareMessage(newMessage)` to get the embedded chunks from the previous sprint's work.
    - [ ] **Step 2:** Create a `vectors` array by mapping over the `embeddedChunks`.
    - [ ] **Step 3:** For each chunk, create a vector object:
        - [ ] `id`: `uuidv4()`
        - [ ] `values`: `chunk.embedding`
        - [ ] `metadata`: `{ text: chunk.text, sourceMessageId: chunk.sourceMessageId, role: newMessage.role, timestamp: new Date().toISOString() }`
    - [ ] **Step 4:** Check if `vectors.length > 0`.
    - [ ] **Step 5:** If so, call `await this.pineconeService.upsertVectors(thread.id, vectors)`. Use the `thread.id` as the namespace.

#### **Part 3: Updating the `threadPresenter`**

- [ ] **Open Presenter File:** Open `src/main/presenter/threadPresenter.ts`.
- [ ] **Update `if` block:** In the conditional logic from Sprint 2.2, change the call from `processContext` to `await this.compressionService.processAndStore(thread, newMessage)`.
    - **Note:** This changes the flow. The presenter should now call the compression service in a fire-and-forget manner *after* sending the message to the LLM, or the embedding process will delay the user's response.
- [ ] **Refactor Flow:**
    - [ ] The `threadPresenter` should first send the message to the LLM as usual.
    - [ ] *After* getting the response and updating the thread, it should then, in the background, call `this.compressionService.processAndStore(thread, userMessage)` and `this.compressionService.processAndStore(thread, assistantMessage)`.
    - [ ] This ensures that the context storage process does not block the chat interaction.

