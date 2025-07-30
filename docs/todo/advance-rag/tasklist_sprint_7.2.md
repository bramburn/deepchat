### Task List: Sub-Sprint 7.2 - Embedding and Storing Summaries

**Objective:** Embed the generated summaries, store them in Pinecone, and atomically replace the original message vectors.

---

#### **Part 1: Pinecone Vector Deletion (TDD)**

- [ ] **Open Test File:** Open `src/test/main/services/PineconeService.test.ts`.
- [ ] **Write Deletion Test:**
    - [ ] Write a test for a new `deleteVectors` method.
    - [ ] Mock the Pinecone client's `index.namespace(namespace).deleteMany` method.
    - [ ] Call `pineconeService.deleteVectors(...)` with a sample array of IDs.
    - [ ] Assert that the mocked `deleteMany` was called with the correct IDs.
- [ ] **Implement `deleteVectors` Method:**
    - [ ] Open `src/main/services/PineconeService.ts`.
    - [ ] Create a new public `async` method `deleteVectors(namespace: string, ids: string[]): Promise<void>`.
    - [ ] Inside a `try...catch` block, call `await this.index!.namespace(namespace).deleteMany(ids)`.
    - [ ] Log success or failure. Re-throw the error so the calling transaction can handle it.

#### **Part 2: The Storage Transaction (TDD)**

- [ ] **Open Test File:** Open `src/test/main/services/ContextCompressionService.test.ts`.
- [ ] **Write Storage Transaction Test:**
    - [ ] Write a test for a new `_embedAndStoreSummary` method.
    - [ ] Mock the `ollamaService.generateEmbedding`, `pineconeService.upsertVectors`, and `pineconeService.deleteVectors` methods.
    - [ ] Call `_embedAndStoreSummary`.
    - [ ] **Assert Order:** Assert that `upsertVectors` is called *before* `deleteVectors`.
    - [ ] **Assert Upsert Payload:** Assert that the vector passed to `upsertVectors` has the correct structure, including `metadata.isSummary: true`.
    - [ ] **Assert Delete Payload:** Assert that `deleteVectors` is called with the IDs of the original messages.
    - [ ] **Test Failure Case:** Write a test where the mocked `deleteVectors` throws an error. Assert that the service catches this error and logs it.
- [ ] **Implement `_embedAndStoreSummary` Method:**
    - [ ] Open `src/main/services/ContextCompressionService.ts`.
    - [ ] Create a `private async` method `_embedAndStoreSummary(threadId, summary, originalMessages)`.
    - [ ] **Step 1:** `await` the embedding for the `summary` text from the Ollama service.
    - [ ] **Step 2:** Prepare the `summaryVector` object. Give it a unique ID (e.g., `summary-${uuidv4()}`) and create the detailed `metadata` object (`isSummary`, `text`, `timestamp`, etc.).
    - [ ] **Step 3:** Get the `vectorIdsToDelete` by mapping the `originalMessages` to their IDs.
    - [ ] **Step 4:** In a `try...catch` block to handle the transaction:
        - [ ] `await this.pineconeService.upsertVectors(threadId, [summaryVector]);`
        - [ ] `await this.pineconeService.deleteVectors(threadId, vectorIdsToDelete);`
    - [ ] If the block fails, log the error and re-throw it.

#### **Part 3: Integrating the Transaction**

- [ ] **Open Service File:** Open `src/main/services/ContextCompressionService.ts`.
- [ ] **Update `runSummarization`:**
    - [ ] In the main `runSummarization` method, wrap the call to `_embedAndStoreSummary` in its own `try...catch` block.
    - [ ] If `_embedAndStoreSummary` is successful, return the summary.
    - [ ] If it fails, log that the transaction failed and that the process will be retried later (because the `lastSummaryIndex` won't be updated).
