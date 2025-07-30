### Task List: Sub-Sprint 6.1 - Context Combination Logic

**Objective:** Develop the logic to combine semantically retrieved context with recent conversation messages into a single, de-duplicated list.

---

#### **Part 1: Implementing the Combination Logic (TDD)**

- [ ] **Open Test File:** Navigate to the test file for `ContextCompressionService` (`src/test/main/services/ContextCompressionService.test.ts`).
- [ ] **Write Combination Tests:**
    - [ ] **Test Case 1 (No Overlap):** Write a test for a new `constructPromptContext` method. Provide two arrays (one of `ChatVectorMetadata`, one of `ChatMessage`) with no overlapping messages. Assert that the combined output contains all items.
    - [ ] **Test Case 2 (Full Overlap):** Write a test where the `sourceMessageId` of every retrieved item is also present in the recent history. Assert that the final list has no duplicates and is the same length as the recent history.
    - [ ] **Test Case 3 (Partial Overlap):** Write a test with a few overlapping messages. Assert that the final list has the correct length and contains no duplicates.
    - [ ] **Test Case 4 (Ordering):** Assert that the items from the retrieved context appear before the items from the recent history in the final array.
- [ ] **Implement `constructPromptContext` Method:**
    - [ ] Open `src/main/services/ContextCompressionService.ts`.
    - [ ] Create a new public method `constructPromptContext(retrievedMatches: ChatVectorMetadata[], recentHistory: ChatMessage[]): ChatMessage[]`.
    - [ ] **Step 1:** Initialize an empty array `finalContext` and a `new Set<string>()` called `includedMessageIds`.
    - [ ] **Step 2:** Sort the `retrievedMatches` by `timestamp` to ensure they are in chronological order.
    - [ ] **Step 3:** Loop through the sorted `retrievedMatches`. For each `match`:
        - [ ] If `!includedMessageIds.has(match.sourceMessageId)`, add a reconstructed `ChatMessage` object to `finalContext` and add the ID to the set.
    - [ ] **Step 4:** Loop through the `recentHistory`. For each `message`:
        - [ ] If `!includedMessageIds.has(message.id)`, add the `message` to `finalContext` and add the ID to the set.
    - [ ] **Step 5:** Return `finalContext`.

#### **Part 2: Integrating into the `threadPresenter`**

- [ ] **Open Presenter:** Navigate to `src/main/presenter/threadPresenter.ts`.
- [ ] **Update Message Handling Logic:**
    - [ ] Inside the `if (modelConfig?.contextCompressionEnabled)` block, locate the call to `retrieveRelevantContext` from the previous sprint.
    - [ ] **Step 1:** Define a constant for the sliding window size, e.g., `const RECENT_MESSAGES_COUNT = 10;`.
    - [ ] **Step 2:** Get the recent messages: `const recentHistory = thread.messages.slice(-RECENT_MESSAGES_COUNT);`.
    - [ ] **Step 3:** Call the new combination method: `const combinedMessages = this.compressionService.constructPromptContext(retrievedMatches, recentHistory);`.
    - [ ] **Step 4:** Log the count of the `combinedMessages` array for now. This will be used in the next sprint.
