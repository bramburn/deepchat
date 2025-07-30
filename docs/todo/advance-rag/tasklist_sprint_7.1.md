### Task List: Sub-Sprint 7.1 - Summarization Service

**Objective:** Create a background service that can summarize old conversation history using an LLM.

---

#### **Part 1: Generic LLM Invocation Method**

- [ ] **Open LLM Presenter:** Navigate to `src/main/llmProviderPresenter.ts` (or equivalent).
- [ ] **Write Test for Generic Call:** In the corresponding test file, write a test for a new `generateText` method. Mock the underlying LLM provider to ensure it's called with `stream: false` and returns a complete text string.
- [ ] **Implement `generateText` Method:**
    - [ ] Create a new public `async` method `generateText(prompt: string, modelConfig: ModelConfig): Promise<string>`.
    - [ ] This method should call the appropriate LLM provider's `generate` function with the `stream` option explicitly set to `false`.
    - [ ] It should handle the response and return the complete `response.text`.

#### **Part 2: Summarization Logic (TDD)**

- [ ] **Open Service Test File:** Open `src/test/main/services/ContextCompressionService.test.ts`.
- [ ] **Write Summarization Test:**
    - [ ] Write a test for a new private method `_summarizeMessages`.
    - [ ] Mock the `llmProviderPresenter.generateText` method.
    - [ ] Call `_summarizeMessages` with a sample list of messages.
    - [ ] Assert that the `generateText` mock was called with a prompt that includes the formatted transcript of the messages.
    - [ ] Assert that the method returns the mock summary text.
- [ ] **Implement `_summarizeMessages` Method:**
    - [ ] Open `src/main/services/ContextCompressionService.ts`.
    - [ ] Create a new `private async` method `_summarizeMessages(messages: ChatMessage[], modelConfig: ModelConfig): Promise<string>`.
    - [ ] **Step 1:** Create the `transcript` by mapping the messages to `"role: content"` strings and joining them.
    - [ ] **Step 2:** Construct the detailed summarization prompt, inserting the `transcript`.
    - [ ] **Step 3:** In a `try...catch` block, call `await llmProviderPresenter.generateText(prompt, modelConfig)`.
    - [ ] **Step 4:** Return the result on success, or an empty string on failure.

#### **Part 3: Triggering the Background Task**

- [ ] **Add State to Thread:** In `src/shared/chat.d.ts`, add `metadata?: { lastSummaryIndex?: number }` to the `ChatThread` interface.
- [ ] **Open `threadPresenter`:** Navigate to `src/main/presenter/threadPresenter.ts`.
- [ ] **Implement Trigger Logic:**
    - [ ] At the end of the main message handling function (after a response is received), create a new method call, e.g., `this._triggerSummarization(thread, modelConfig)`.
    - [ ] **Implement `_triggerSummarization`:**
        - [ ] Define constants: `SUMMARY_TRIGGER_COUNT = 50`, `BATCH_SIZE = 20`.
        - [ ] Get `lastSummaryIndex` from the thread's metadata (defaulting to 0).
        - [ ] Check if `thread.messages.length >= lastSummaryIndex + BATCH_SIZE + 10` (or a similar condition to ensure a full batch is ready).
        - [ ] If true, slice the `messagesToSummarize` from the messages array.
        - [ ] **Crucially:** Call the summarization service in a non-blocking way: `this.compressionService.runSummarization(...).then(...)`.
        - [ ] In the `.then()` block, update the thread metadata with the new `lastSummaryIndex`.
- [ ] **Implement `runSummarization` in Service:**
    - [ ] In `ContextCompressionService`, create the public `async runSummarization(...)` method.
    - [ ] This method will call `_summarizeMessages` and then (in the next sprint) call the embedding and storage methods.
