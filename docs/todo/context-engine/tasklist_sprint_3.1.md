### Task List: Sub-Sprint 3.1 - Message Chunking and Embedding

**Objective:** Implement the logic to split chat messages into chunks and generate vector embeddings for them using Ollama.

---

#### **Part 1: Text Chunking Utility (TDD)**

- [ ] **Create Utility File:** Create a new file `src/main/utils/textSplitter.ts`.
- [ ] **Create Test File:** Create a corresponding test file `src/test/main/utils/textSplitter.test.ts`.
- [ ] **Write Chunking Tests:**
    - [ ] Write a test for a short text that should not be chunked.
    - [ ] Write a test for a long text that should be split into multiple chunks.
    - [ ] Write a test to verify the `chunkOverlap` logic is working correctly.
- [ ] **Implement Chunking Function:**
    - [ ] In `textSplitter.ts`, install and import `langchain/text_splitter`.
    - [ ] Create and export an `async` function `createSemanticChunks(text: string)`.
    - [ ] Inside the function, use `RecursiveCharacterTextSplitter` to perform the chunking.
    - [ ] Return the array of text chunks.

#### **Part 2: Ollama Service (TDD)**

- [ ] **Create Service File:** Create `src/main/services/OllamaService.ts`.
- [ ] **Create Test File:** Create `src/test/main/services/OllamaService.test.ts`.
- [ ] **Write Embedding Tests:**
    - [ ] Write a test that mocks `node-fetch` to simulate a successful API call to `/api/embed`. Assert that the function returns the mock embedding array.
    - [ ] Write a test that simulates a `404 Not Found` error from the API (e.g., model not found). Assert that the function throws or returns a `null`/error state.
    - [ ] Write a test that simulates a network error (e.g., Ollama server is offline). Assert that the function handles the exception gracefully.
- [ ] **Implement Ollama Service:**
    - [ ] In `OllamaService.ts`, define a class `OllamaService`.
    - [ ] Create a public `async` method `generateEmbedding(text: string)`.
    - [ ] Inside the method, retrieve the configured Ollama model name from the settings (via the `ContextCompressionPresenter` or a config service).
    - [ ] Construct the prompt with the `search_document:` prefix.
    - [ ] Use `node-fetch` inside a `try...catch` block to make a `POST` request to the Ollama `/api/embed` endpoint.
    - [ ] On success, parse the JSON and return `data.embedding`.
    - [ ] On failure, log the error and return `null` or throw.

#### **Part 3: Integrating into `ContextCompressionService`**

- [ ] **Open Service File:** Open `src/main/services/ContextCompressionService.ts`.
- [ ] **Import Dependencies:** Import the `createSemanticChunks` utility and the `OllamaService`.
- [ ] **Instantiate Service:** Create an instance of `OllamaService` in the constructor.
- [ ] **Implement `embedAndPrepareMessage` Method:**
    - [ ] Create a new public `async` method `embedAndPrepareMessage(message: ChatMessage)`.
    - [ ] **Step 1:** Call `await createSemanticChunks(message.content)` to get the text chunks.
    - [ ] **Step 2:** Create an empty array `preparedData`.
    - [ ] **Step 3:** Loop through the chunks. For each `chunk`:
        - [ ] Call `await this.ollamaService.generateEmbedding(chunk)`.
        - [ ] If an embedding is successfully returned, push an object `{ text: chunk, embedding, sourceMessageId: message.id }` to the `preparedData` array.
    - [ ] **Step 4 (Performance):** Refactor the loop to use `Promise.all` to run embedding requests concurrently.
    - [ ] **Step 5:** Return the `preparedData` array.
- [ ] **Update `processContext`:** Modify the main `processContext` method to call this new `embedAndPrepareMessage` method.

