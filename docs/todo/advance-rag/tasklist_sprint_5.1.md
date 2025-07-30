### Task List: Sub-Sprint 5.1 - Semantic Search Implementation

**Objective:** Implement the core semantic search functionality to retrieve relevant conversation history from Pinecone.

---

#### **Part 1: Enhancing the Ollama Service (TDD)**

- [ ] **Open Test File:** Navigate to `src/test/main/services/OllamaService.test.ts`.
- [ ] **Write New Test Case:** Write a test for the `generateEmbedding` method. It should check that when called with `type: 'query'`, the `prompt` sent to the `fetch` mock correctly includes the `search_query:` prefix.
- [ ] **Update Method Signature:** Open `src/main/services/OllamaService.ts`. Change the signature of `generateEmbedding` to `public async generateEmbedding(text: string, type: 'document' | 'query')`.
- [ ] **Implement Prefix Logic:** Add a line to dynamically set the prefix: `const prefix = type === 'query' ? 'search_query:' : 'search_document:';`.
- [ ] **Update Prompt:** Modify the `prompt` variable to use this new `prefix`.
- [ ] **Run Tests:** Ensure all tests for `OllamaService` still pass.

#### **Part 2: Implementing Pinecone Query Logic (TDD)**

- [ ] **Open Test File:** Navigate to `src/test/main/services/PineconeService.test.ts`.
- [ ] **Write Query Test:**
    - [ ] Write a new test for a `queryNamespace` method.
    - [ ] Mock the Pinecone client's `index.namespace(namespace).query` method.
    - [ ] Make the mock return a sample `QueryResponse` containing a `matches` array with at least one match object that has a `metadata` property.
    - [ ] Call `pineconeService.queryNamespace(...)` and assert that the return value is an array containing the `metadata` from the mock response.
- [ ] **Implement `queryNamespace` Method:**
    - [ ] Open `src/main/services/PineconeService.ts`.
    - [ ] Create a new public `async` method `queryNamespace(namespace: string, vector: number[], topK: number): Promise<ChatVectorMetadata[]>`.
    - [ ] Inside the method, call `await this.initialize()`.
    - [ ] In a `try...catch` block, call `await this.index!.namespace(namespace).query(...)`, ensuring you pass `includeMetadata: true`.
    - [ ] Map the `queryResponse.matches` array to return only the `metadata` for each match.
    - [ ] In the `catch` block, log the error and return an empty array `[]`.

#### **Part 3: Orchestrating the Search**

- [ ] **Open Service File:** Navigate to `src/main/services/ContextCompressionService.ts`.
- [ ] **Implement `retrieveRelevantContext` Method:**
    - [ ] Create a new public `async` method `retrieveRelevantContext(threadId: string, currentMessageContent: string): Promise<ChatVectorMetadata[]>`.
    - [ ] **Step 1:** Call `await this.ollamaService.generateEmbedding(currentMessageContent, 'query')` to get the query vector.
    - [ ] **Step 2:** Add a guard clause to return `[]` if the embedding fails.
    - [ ] **Step 3:** Call `await this.pineconeService.queryNamespace(threadId, queryEmbedding, 5)` where `5` is the initial `topK` value.
    - [ ] **Step 4:** Log the number of results retrieved.
    - [ ] **Step 5:** Return the results from the Pinecone query.
- [ ] **Integrate into `threadPresenter`:**
    - [ ] Open `src/main/presenter/threadPresenter.ts`.
    - [ ] In the main message handling function, inside the `if (modelConfig?.contextCompressionEnabled)` block, add the call: `const retrievedMatches = await this.compressionService.retrieveRelevantContext(thread.id, newMessage.content);`.
    - [ ] For now, simply log the retrieved matches. The combination logic will be handled in the next sprint.
