### Task List: Sub-Sprint 6.2 - Final Truncation and Prompt Assembly

**Objective:** Truncate the combined context to fit the model's token limit and assemble the final prompt.

---

#### **Part 1: Tokenizer Utility (TDD)**

- [ ] **Install Dependency:** Run `npm install tiktoken`.
- [ ] **Create Utility File:** Create `src/main/utils/tokenizer.ts`.
- [ ] **Create Test File:** Create `src/test/main/utils/tokenizer.test.ts`.
- [ ] **Write Tokenizer Tests:**
    - [ ] Write a test for `countTokens` with a simple string ("Hello world") and assert the known token count.
    - [ ] Write a test for `countMessageTokens` with an array of `ChatMessage` objects and assert the sum is correct.
- [ ] **Implement Tokenizer:**
    - [ ] In `tokenizer.ts`, import `get_encoding` from `tiktoken`.
    - [ ] Initialize the `cl100k_base` encoding.
    - [ ] Implement the `countTokens` and `countMessageTokens` functions.

#### **Part 2: Truncation Logic (TDD)**

- [ ] **Open Test File:** Open `src/test/main/services/ContextCompressionService.test.ts`.
- [ ] **Write Truncation Tests:**
    - [ ] **Test Case 1 (Under Limit):** Write a test for a new `truncatePromptContext` method. Provide a message list that is under the token limit and assert the returned list is unchanged.
    - [ ] **Test Case 2 (Over Limit):** Provide a message list that is over the token limit. Assert that messages are removed from the *beginning* of the array until the total token count is under the limit.
    - [ ] **Test Case 3 (Edge Case):** Provide a list with one single message that is over the limit. Assert the method returns an empty array.
- [ ] **Implement `truncatePromptContext` Method:**
    - [ ] Open `src/main/services/ContextCompressionService.ts`.
    - [ ] Create a new public method `truncatePromptContext(messages: ChatMessage[], maxTokens: number): ChatMessage[]`.
    - [ ] **Step 1:** Calculate the `currentTokenCount` of the incoming `messages` using the tokenizer utility.
    - [ ] **Step 2:** If `currentTokenCount <= maxTokens`, return the original array.
    - [ ] **Step 3:** Create a `while` loop: `while (currentTokenCount > maxTokens && messages.length > 0)`.
    - [ ] **Step 4:** Inside the loop, remove the first message using `messages.shift()`.
    - [ ] **Step 5:** Recalculate `currentTokenCount` or subtract the token count of the removed message.
    - [ ] **Step 6:** Return the mutated `messages` array.

#### **Part 3: Final Assembly in `threadPresenter`**

- [ ] **Open Presenter:** Navigate to `src/main/presenter/threadPresenter.ts`.
- [ ] **Update Message Handling Logic:**
    - [ ] Locate the `combinedMessages` variable from the previous sprint.
    - [ ] **Step 1:** Define constants for token limits, e.g., `const ANSWER_RESERVATION = 1024;`.
    - [ ] **Step 2:** Get the `modelMaxTokens` from the model's configuration.
    - [ ] **Step 3:** Calculate the `effectiveMaxTokens = modelMaxTokens - ANSWER_RESERVATION;`.
    - [ ] **Step 4:** Call the truncation method: `const finalMessages = this.compressionService.truncatePromptContext(combinedMessages, effectiveMaxTokens);`.
    - [ ] **Step 5:** Add the user's current message to the end of the final list: `finalMessages.push(newMessage);`.
    - [ ] **Step 6:** Create the final payload for the LLM provider, replacing the original message list with `finalMessages`.
    - [ ] **Step 7:** Pass this final payload to the `llmProvider.sendMessage` method.
