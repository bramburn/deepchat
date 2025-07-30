### User Story: Combine Retrieved and Recent Context

**As a** Researcher/Analyst, **I want** the semantically retrieved context to be intelligently combined with the most recent messages, **so that** the final prompt has both long-term memory and short-term conversational flow.

**Workflow:**
1.  The `ContextCompressionService` has the list of relevant text chunks from the semantic search (from Sprint 5).
2.  The service also receives the current conversation history (the last M messages).
3.  It creates a new, combined list of context items.
4.  It iterates through both lists and adds items to the new list, ensuring no duplicates are added (based on message ID or text content).
5.  The combined list is then sorted, typically with recent messages appearing after the retrieved historical context, to maintain a logical flow.
6.  The final, de-duplicated, and ordered list of context items is returned.

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Create a new method to handle the combination logic.
    -   **Implementation**:
        ```typescript
        import { ChatMessage } from '@/shared/chat.d'; // Assuming type definition
        import { ChatVectorMetadata } from './PineconeService'; // Assuming type definition

        // ... inside ContextCompressionService class

        public combineContexts(
          retrievedContext: ChatVectorMetadata[],
          recentHistory: ChatMessage[],
        ): ChatMessage[] {
          const combined: ChatMessage[] = [];
          const includedIds = new Set<string>();

          // Add retrieved context first, as it's the oldest
          for (const item of retrievedContext) {
            if (!includedIds.has(item.sourceMessageId)) {
              combined.push({
                id: item.sourceMessageId,
                role: item.role,
                content: item.text,
                // ... other necessary fields
              });
              includedIds.add(item.sourceMessageId);
            }
          }

          // Add recent history, checking for duplicates
          for (const message of recentHistory) {
            if (!includedIds.has(message.id)) {
              combined.push(message);
              includedIds.add(message.id);
            }
          }

          // The combined list is naturally ordered with retrieved first, then recent.
          return combined;
        }
        ```
2.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Update the main message handler to use the new combination logic.
    -   **Implementation**:
        ```typescript
        // In the main message handling function, inside the `if (modelConfig?.contextCompressionEnabled)` block

        // 1. Retrieve context (from Sprint 5)
        const retrievedContext = await this.compressionService.retrieveRelevantContext(thread.id, newMessage.content);

        // 2. Get recent messages (sliding window)
        const recentHistory = getRecentMessages(thread.messages, 10); // Hypothetical function

        // 3. Combine them
        const combinedContextMessages = this.compressionService.combineContexts(retrievedContext, recentHistory);

        // This combined list is now ready for final truncation and assembly in Sprint 6.2
        ```

**Acceptance Criteria:**
-   The function correctly retrieves the last M messages from the conversation history.
-   Duplicate messages (present in both retrieved and recent lists) are effectively removed, with only one instance remaining in the final list.
-   The final context is ordered logically, for example, with retrieved historical messages first, followed by the recent conversation messages.
-   The combined context is a clean array of message objects, ready for the next processing step.
-   The de-duplication logic is efficient and handles edge cases (e.g., all messages are duplicates).

**Testing Plan:**
-   **Test Case 1 (No Overlap)**: Create a test for `combineContexts` where the retrieved context and recent history have no common messages. Verify the final list contains all messages from both lists.
-   **Test Case 2 (Full Overlap)**: Create a test where the retrieved context is identical to the recent history. Verify the final list contains no duplicates and has the correct length.
-   **Test Case 3 (Partial Overlap)**: Create a test with partial overlap between the two lists. Verify the final list has the correct content and no duplicates.
-   **Test Case 4 (Ordering)**: Verify that the final combined list maintains a logical order (e.g., historical context followed by recent messages).
