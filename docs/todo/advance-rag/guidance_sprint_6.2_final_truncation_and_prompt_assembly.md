### Implementation Guidance: Sub-Sprint 6.2 - Final Truncation and Prompt Assembly

This guide provides technical direction for the final step of the RAG pipeline: ensuring the generated context fits the model's limits and assembling the final prompt.

**Objective:** To truncate the combined context to fit within the model's context window and assemble the final prompt to be sent to the LLM.

**1. Token Counting Utility**

Accurate token counting is non-negotiable. Simply counting words or characters is not sufficient. The industry-standard library for this is OpenAI's `tiktoken`.

-   **Installation:** `npm install tiktoken`
-   **File:** `src/main/utils/tokenizer.ts` (Create this new file)
-   **Action:** Implement a wrapper around `tiktoken`.

```typescript
// src/main/utils/tokenizer.ts
import { get_encoding, TiktokenEncoding } from 'tiktoken';
import { logger } from '@/shared/logger';
import { ChatMessage } from '@/shared/chat.d';

let encoding: TiktokenEncoding;

try {
  // cl100k_base is the encoding used by gpt-4, gpt-3.5-turbo, and text-embedding-ada-002
  encoding = get_encoding('cl100k_base');
} catch (e) {
  logger.error('Failed to load tiktoken encoding.', e);
}

export function countTokens(text: string): number {
  if (!encoding || !text) {
    return 0;
  }
  return encoding.encode(text).length;
}

/**
 * Calculates the total token count for an array of messages.
 * This is a simplified version; a more accurate one would account for extra tokens per message/role.
 */
export function countMessageTokens(messages: ChatMessage[]): number {
  if (!encoding) {
    return messages.reduce((acc, msg) => acc + (msg.content?.length || 0) / 4, 0); // Fallback
  }
  let total = 0;
  for (const message of messages) {
    total += countTokens(message.content);
  }
  return total;
}
```

**2. `ContextCompressionService` - Truncation Logic**

The service needs a method to intelligently shorten the context if it's too long.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Add the `truncatePromptContext` method.

```typescript
// src/main/services/ContextCompressionService.ts
import { countMessageTokens, countTokens } from '@/main/utils/tokenizer';
// ... other imports

export class ContextCompressionService {
  // ... existing methods

  /**
   * Truncates a list of messages to fit within a specified token limit.
   * It removes messages from the beginning of the array (oldest first).
   */
  public truncatePromptContext(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let currentTokenCount = countMessageTokens(messages);
    if (currentTokenCount <= maxTokens) {
      return messages;
    }

    logger.info({ currentTokenCount, maxTokens }, 'Context exceeds token limit, truncating...');

    const truncatedMessages = [...messages];
    while (currentTokenCount > maxTokens && truncatedMessages.length > 0) {
      // Remove the oldest message (from the start of the combined context)
      const removedMessage = truncatedMessages.shift();
      if (removedMessage) {
        currentTokenCount -= countTokens(removedMessage.content);
      }
    }

    logger.info({ finalTokenCount: currentTokenCount }, 'Truncation complete.');
    return truncatedMessages;
  }
}
```

**3. `threadPresenter` - Final Assembly**

The presenter ties everything together for the final hand-off to the LLM provider.

-   **File:** `src/main/presenter/threadPresenter.ts`
-   **Action:** Update the main message handling logic to include truncation and final assembly.

```typescript
// src/main/presenter/threadPresenter.ts

// In the main message handling function, after combining contexts (from Sprint 6.1)

// 4. Get the model's context window size
const modelMaxTokens = modelConfig.maxTokens || 8192; // Default to 8k if not specified
// Reserve tokens for the answer
const ANSWER_RESERVATION = 1024;
const effectiveMaxTokens = modelMaxTokens - ANSWER_RESERVATION;

// 5. Truncate the combined context to fit
const finalMessages = this.compressionService.truncatePromptContext(combinedMessages, effectiveMaxTokens);

// 6. Add the current user message to the very end
finalMessages.push(newMessage);

// 7. Assemble the final prompt object
const finalPromptPayload = {
  ...thread,
  messages: finalMessages, // Replace original messages with the new compressed list
};

logger.info({
  finalTokenCount: countMessageTokens(finalMessages),
  finalMessageCount: finalMessages.length,
}, 'Final prompt assembled and ready for LLM.');

// 8. Send to the LLM Provider
llmProvider.sendMessage(finalPromptPayload);
```

**4. Key Considerations:**

-   **Truncation Strategy:** The strategy here is to remove the *oldest* messages from the *combined* context first. Since the combined context is ordered `[retrieved, recent]`, this means we first sacrifice the least relevant of the retrieved historical messages, which is the correct approach.
-   **Token Reservation:** Always reserve a portion of the context window for the model's answer. If you fill the prompt to the absolute limit, the model may have no room to generate a response. Reserving 1k-2k tokens is a safe practice.
-   **Final Assembly:** The current user's message should always be the very last message in the final list. The logic should be: combine context -> truncate -> add current message.
-   **System Prompt:** Don't forget to account for the tokens used by the system prompt when calculating the total token count.
