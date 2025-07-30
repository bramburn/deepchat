### Implementation Guidance: Sub-Sprint 6.1 - Context Combination Logic

This guide provides technical direction for combining semantically retrieved context with recent conversation history.

**Objective:** To develop the logic for combining the semantically retrieved context from Pinecone with the most recent messages from the current conversation.

**1. The `ContextCompressionService` - The Combination Hub**

The logic for this sprint belongs in the `ContextCompressionService`, as it's a core part of the advanced RAG (Retrieval-Augmented Generation) pipeline.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Implement a new public method, `constructPromptContext`.

```typescript
// src/main/services/ContextCompressionService.ts
import { ChatMessage } from '@/shared/chat.d';
import { ChatVectorMetadata } from './PineconeService'; // Assuming this type is exported
import { logger } from '@/shared/logger';

export class ContextCompressionService {
  // ... existing methods: retrieveRelevantContext, etc.

  /**
   * Combines semantically retrieved historical messages with recent messages.
   * @param retrievedMatches Metadata of vectors retrieved from Pinecone.
   * @param recentHistory The last M messages from the current conversation.
   * @returns A de-duplicated and ordered list of messages for the prompt.
   */
  public constructPromptContext(
    retrievedMatches: ChatVectorMetadata[],
    recentHistory: ChatMessage[],
  ): ChatMessage[] {
    const finalContext: ChatMessage[] = [];
    const includedMessageIds = new Set<string>();

    // 1. Add the retrieved historical context first.
    // Sorting by timestamp ensures they are in chronological order.
    const sortedRetrieved = retrievedMatches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const match of sortedRetrieved) {
      // Avoid adding duplicates if a message is both in recent history and retrieved results
      if (!includedMessageIds.has(match.sourceMessageId)) {
        finalContext.push({
          id: match.sourceMessageId,
          role: match.role,
          content: match.text,
          // Reconstruct the message object as needed
        });
        includedMessageIds.add(match.sourceMessageId);
      }
    }

    // 2. Add the recent messages, skipping any that were already included from retrieval.
    for (const message of recentHistory) {
      if (!includedMessageIds.has(message.id)) {
        finalContext.push(message);
        includedMessageIds.add(message.id);
      }
    }

    logger.info({ 
      retrievedCount: sortedRetrieved.length, 
      recentCount: recentHistory.length, 
      finalCount: finalContext.length 
    }, 'Combined retrieved and recent contexts.');

    return finalContext;
  }
}
```

**2. `threadPresenter` - Orchestrating the Flow**

The presenter is responsible for getting the data from different sources and passing it to the `ContextCompressionService`.

-   **File:** `src/main/presenter/threadPresenter.ts`
-   **Action:** Update the main message handling logic.

```typescript
// src/main/presenter/threadPresenter.ts

// In the main message handling function, inside the `if (modelConfig?.contextCompressionEnabled)` block

// 1. Retrieve context (from Sprint 5)
const retrievedMatches = await this.compressionService.retrieveRelevantContext(thread.id, newMessage.content);

// 2. Get recent messages (e.g., last 10 messages)
const RECENT_MESSAGES_COUNT = 10;
const recentHistory = thread.messages.slice(-RECENT_MESSAGES_COUNT);

// 3. Combine them using the new service method
const combinedMessages = this.compressionService.constructPromptContext(retrievedMatches, recentHistory);

// 4. This `combinedMessages` array is now ready for the next step (truncation in Sprint 6.2)
// ...
```

**3. Key Considerations:**

-   **De-duplication is Key:** The most important part of this sprint is the de-duplication logic. A message could easily be in the last 10 messages *and* be retrieved by the semantic search. Using a `Set` of message IDs is the most efficient way to track what has already been included in the final context.
-   **Ordering:** The order of context matters. A good default strategy is `[retrieved historical context] -> [recent conversational context] -> [current user query]`. This gives the LLM the relevant background information first, followed by the immediate conversational flow. Sorting the retrieved results by timestamp before adding them is crucial for coherence.
-   **Sliding Window Size:** The number of recent messages to include (the `M` in the user story) is a configurable parameter. A value between 4 and 10 is a reasonable starting point. This could be exposed as a user setting in the future.
-   **Data Structure:** Ensure the final output (`ChatMessage[]`) matches the data structure expected by the next step in the pipeline (the tokenizer and the LLM provider).
