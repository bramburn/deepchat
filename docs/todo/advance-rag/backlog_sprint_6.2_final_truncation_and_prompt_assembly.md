### User Story: Truncate and Assemble Final Prompt

**As a** Researcher/Analyst, **I want** the combined context to be intelligently truncated to fit the model's limits and assembled into a final prompt, **so that** I get the most relevant information without exceeding the context window.

**Workflow:**
1.  The `ContextCompressionService` has the combined list of messages (retrieved + recent).
2.  It uses a token counting utility to calculate the total token count of the combined list.
3.  If the count exceeds the model's configured maximum, it removes messages from the *beginning* of the list (the oldest, least relevant retrieved context) until the total token count is within the limit.
4.  Once the context is finalized, it is assembled into the final prompt structure, including any system message.
5.  This final prompt object is then passed to the `llmProviderPresenter` to be sent to the LLM.
6.  The final token count and message count are logged.

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`
-   **Create**: `src/main/utils/tokenizer.ts` (if a project-specific one doesn't exist).

**Actions to Undertake:**
1.  **Filepath**: `src/main/utils/tokenizer.ts` (New File)
    -   **Action**: Implement or wrap a token counting library.
    -   **Implementation**:
        ```typescript
        import { get_encoding } from 'tiktoken'; // Recommended library

        const encoding = get_encoding('cl100k_base');

        export function countTokens(text: string): number {
          return encoding.encode(text).length;
        }

        export function countMessageTokens(messages: any[]): number {
          let total = 0;
          for (const message of messages) {
            total += countTokens(message.content);
          }
          return total;
        }
        ```
    -   **Imports**: `import { get_encoding } from 'tiktoken';`
2.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Add a truncation method to the service.
    -   **Implementation**:
        ```typescript
        import { countMessageTokens } from '../utils/tokenizer';

        // ... inside ContextCompressionService class

        public truncateContext(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
          let currentTokens = countMessageTokens(messages);
          while (currentTokens > maxTokens && messages.length > 0) {
            const removedMessage = messages.shift(); // Remove from the beginning (oldest)
            if (removedMessage) {
              currentTokens -= countTokens(removedMessage.content);
            }
          }
          return messages;
        }
        ```
3.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Integrate the final truncation step.
    -   **Implementation**:
        ```typescript
        // In the main message handling function, after combining the context

        // 4. Truncate the final context
        const modelMaxTokens = modelConfig.maxTokens || 8192;
        const finalMessages = this.compressionService.truncateContext(combinedMessages, modelMaxTokens);

        // 5. Assemble and send to LLM
        const finalPrompt = {
          ...thread,
          messages: finalMessages,
        };

        logger.info({ 
          finalTokenCount: countMessageTokens(finalMessages),
          finalMessageCount: finalMessages.length
        }, 'Final prompt assembled.');

        // Pass finalPrompt to the LLM provider
        llmProvider.sendMessage(finalPrompt, newMessage);
        ```

**Acceptance Criteria:**
-   The final context sent to the LLM never exceeds the model's specified maximum context window.
-   The truncation process correctly removes the oldest messages (from the start of the combined list) first.
-   The final prompt is correctly formatted and includes all necessary components (system message, messages list).
-   The `llmProviderPresenter` receives the final, correctly formatted prompt object.
-   Logs provide clear data on the final prompt's token count, message count, and how many messages were truncated.

**Testing Plan:**
-   **Test Case 1 (Tokenizer)**: Write tests for the `tokenizer` utility to ensure it accurately counts tokens for various strings.
-   **Test Case 2 (No Truncation)**: In the `ContextCompressionService` test, call `truncateContext` with a list of messages that is under the token limit. Verify the returned list is identical to the input.
-   **Test Case 3 (Truncation)**: Call `truncateContext` with a list that is over the token limit. Verify that messages are removed from the beginning of the array until the total token count is under the limit.
-   **Test Case 4 (Edge Case)**: Call `truncateContext` with a single message that is itself over the token limit. Verify that it returns an empty array.
