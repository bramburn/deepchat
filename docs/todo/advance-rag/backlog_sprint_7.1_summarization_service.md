### User Story: Summarize Old Conversation History

**As a** Power User, **I want** the application to automatically summarize very old parts of my conversation, **so that** the key information is preserved in a compressed form without consuming excessive vector storage.

**Workflow:**
1.  A background job or a trigger within the message handling flow checks if a conversation thread has exceeded a certain length (e.g., > 50 messages).
2.  If the threshold is met, the service identifies the oldest N messages that have not yet been summarized.
3.  These messages are formatted into a single block of text and sent to an LLM with a carefully crafted summarization prompt.
4.  The prompt instructs the model to act as an archivist, extracting key facts, decisions, entities, and user preferences.
5.  The LLM returns a concise summary.
6.  This process runs asynchronously to prevent any impact on chat responsiveness.
7.  The resulting summary text is passed to the next stage for embedding and storage.

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`
-   **Modify**: `src/main/presenter/threadPresenter.ts` (to trigger the process).
-   **Modify**: `src/main/llmProviderPresenter` (or similar, to provide a generic way to call an LLM for tasks other than chat).

**Actions to Undertake:**
1.  **Filepath**: `src/main/llmProviderPresenter.ts`
    -   **Action**: Create a generic, non-streaming method for internal LLM calls like summarization.
    -   **Implementation**:
        ```typescript
        public async generateText(prompt: string, modelConfig: ModelConfig): Promise<string> {
          // This method would use a non-streaming API call to the LLM
          // It should handle the logic of selecting the provider (OpenAI, Anthropic, etc.)
          // and returning the complete text response.
          const response = await getLlmProvider(modelConfig.provider).generate(prompt, modelConfig);
          return response.text;
        }
        ```
2.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Add a `summarizeMessages` method.
    -   **Implementation**:
        ```typescript
        import { llmProviderPresenter } from '../presenter'; // Assuming singleton or global access

        // ... inside ContextCompressionService class

        private async summarizeMessages(messagesToSummarize: ChatMessage[], modelConfig: ModelConfig): Promise<string> {
          const transcript = messagesToSummarize.map(m => `${m.role}: ${m.content}`).join('\n---\n');
          const prompt = `You are an expert archivist. Summarize the following conversation transcript, extracting all key facts, figures, decisions, and important details. The summary will be used as long-term memory for an AI. Output only the summary. Transcript:\n\n${transcript}`;

          try {
            const summary = await llmProviderPresenter.generateText(prompt, modelConfig);
            logger.info('Successfully generated conversation summary.');
            return summary;
          } catch (error) {
            logger.error({ error }, 'Failed to generate summary.');
            return ''; // Return empty on error
          }
        }
        ```
3.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Add logic to trigger the summarization process.
    -   **Implementation**:
        ```typescript
        // In the main message handling function, after a message and response have been processed

        const SUMMARY_THRESHOLD = 50; // messages
        const BATCH_SIZE = 20; // messages to summarize at a time

        if (thread.messages.length > (thread.lastSummaryIndex || 0) + SUMMARY_THRESHOLD) {
          const messagesToSummarize = thread.messages.slice(thread.lastSummaryIndex, thread.lastSummaryIndex + BATCH_SIZE);
          
          // Run in the background - DO NOT await this call
          this.compressionService.runSummarization(thread.id, messagesToSummarize, modelConfig).then(() => {
              // Update the thread metadata to mark that these have been summarized
              updateThreadMetadata(thread.id, { lastSummaryIndex: thread.lastSummaryIndex + BATCH_SIZE });
          });
        }
        ```

**Acceptance Criteria:**
-   The service correctly identifies when a conversation has grown long enough to require summarization.
-   The summarization prompt is effective at creating a concise and factually accurate summary of the provided messages.
-   The summarization process runs in the background and does not add any noticeable latency to the user's chat experience.
-   The service gracefully handles potential errors from the summarization LLM (e.g., API errors, empty responses).
-   The generated summary is a single, coherent piece of text, ready to be embedded.

**Testing Plan:**
-   **Test Case 1 (Prompt Crafting)**: Manually test the summarization prompt with different conversation snippets using an LLM playground to refine its effectiveness.
-   **Test Case 2 (Service Logic)**: Write a unit test for the `summarizeMessages` method in `ContextCompressionService`, mocking the `llmProviderPresenter` to ensure the correct prompt is constructed and the method handles success and error cases.
-   **Test Case 3 (Trigger Logic)**: In the `threadPresenter` test, simulate a long conversation history and verify that the summarization process is triggered at the correct threshold.
-   **Test Case 4 (Asynchronous Execution)**: Verify that the call to the summarization service is non-blocking and the main thread of execution continues without waiting for the summary to be complete.
