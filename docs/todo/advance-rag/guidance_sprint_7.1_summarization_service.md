### Implementation Guidance: Sub-Sprint 7.1 - Summarization Service

This guide provides technical direction for creating a background service that summarizes old conversation history.

**Objective:** To create a background service that can summarize old conversation history using an LLM.

**1. Generic LLM Invocation**

Up to this point, LLM calls have likely been for streaming chat responses. Summarization is a different task—it requires a non-streaming call that returns a single block of text. This requires a new, generic method in your LLM provider.

-   **File:** `src/main/llmProviderPresenter.ts` (or your equivalent LLM interface)
-   **Action:** Add a method for one-off text generation tasks.

```typescript
// src/main/llmProviderPresenter.ts

export class LlmProviderPresenter {
  // ... existing streaming methods

  /**
   * Performs a non-streaming text generation request to the configured LLM.
   * Ideal for internal tasks like summarization or classification.
   * @returns The complete generated text as a string.
   */
  public async generateText(prompt: string, modelConfig: ModelConfig): Promise<string> {
    logger.info({ model: modelConfig.name }, 'Performing internal text generation task.');
    try {
      // This logic will depend on your specific LLM provider implementation
      // (e.g., OpenAI, Anthropic, Ollama)
      const provider = this.getProviderForModel(modelConfig);
      const response = await provider.generate(prompt, { ...modelConfig, stream: false });
      
      if (!response || !response.text) {
        throw new Error('LLM returned an empty response for summarization.');
      }
      return response.text;
    } catch (error) {
      logger.error({ error, model: modelConfig.name }, 'Internal text generation task failed.');
      throw error; // Re-throw to be handled by the caller
    }
  }
}
```

**2. The Summarization Prompt**

Prompt engineering is critical here. The goal is not a creative summary, but a dense, factual extraction.

**Recommended Prompt:**

```
You are a helpful AI assistant acting as a conversation archivist. Your task is to create a concise, third-person summary of the following conversation transcript. Focus on extracting key information, such as facts, figures, names, dates, decisions made, and important user preferences or questions. The summary will be used as a memory for another AI, so it must be accurate and dense with information.

Do not add any commentary or introduction. Output only the summary.

Transcript:
---
[CONVERSATION_TEXT_HERE]
---
Summary:
```

**3. `ContextCompressionService` - Summarization Logic**

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Add the core summarization method.

```typescript
// src/main/services/ContextCompressionService.ts

export class ContextCompressionService {
  // ... existing methods

  public async runSummarization(threadId: string, messagesToSummarize: ChatMessage[], modelConfig: ModelConfig): Promise<string | null> {
    logger.info({ threadId, count: messagesToSummarize.length }, 'Starting background summarization.');

    const transcript = messagesToSummarize.map(m => `${m.role}: ${m.content}`).join('\n---\n');
    const prompt = this.getSummarizationPrompt(transcript);

    try {
      // Assume llmProviderPresenter is accessible, e.g., via a singleton or DI
      const summary = await llmProviderPresenter.generateText(prompt, modelConfig);
      logger.info({ threadId }, 'Successfully generated conversation summary.');
      
      // In Sprint 7.2, this summary will be passed to the embedding and storage methods
      await this.embedAndStoreSummary(threadId, summary, messagesToSummarize);

      return summary;
    } catch (error) {
      logger.error({ error, threadId }, 'Summarization process failed.');
      return null;
    }
  }

  private getSummarizationPrompt(transcript: string): string {
    return `You are a helpful AI assistant... [rest of prompt] ...\n\nTranscript:\n---\n${transcript}\n---\nSummary:`;
  }
}
```

**4. `threadPresenter` - Triggering the Background Task**

The key is to trigger this process without making the user wait.

-   **File:** `src/main/presenter/threadPresenter.ts`
-   **Action:** Add the trigger logic to the end of the message handling flow.

```typescript
// src/main/presenter/threadPresenter.ts

// At the end of the function that handles a new message + response
private async handlePostResponseTasks(thread: ChatThread, modelConfig: ModelConfig) {
  // ... other tasks like storing the new messages

  // Now, check if summarization is needed.
  const SUMMARY_TRIGGER_COUNT = 50; // Start summarizing after 50 messages
  const BATCH_SIZE = 20; // Summarize 20 messages at a time

  const lastSummaryIndex = thread.metadata?.lastSummaryIndex || 0;

  if (thread.messages.length >= lastSummaryIndex + BATCH_SIZE + 10) { // Check if there's a batch to summarize
    const messagesToSummarize = thread.messages.slice(lastSummaryIndex, lastSummaryIndex + BATCH_SIZE);

    // Fire-and-forget: DO NOT await this promise.
    this.compressionService.runSummarization(thread.id, messagesToSummarize, modelConfig)
      .then(() => {
        // Update thread metadata so we don't summarize these messages again
        this.threadService.updateThreadMetadata(thread.id, { 
          lastSummaryIndex: lastSummaryIndex + BATCH_SIZE 
        });
      });
  }
}
```

**5. Key Considerations:**

-   **Asynchronous Execution:** The `runSummarization` call is intentionally not awaited. It's a background task. This is critical for performance.
-   **State Management:** The application needs to track which messages have already been summarized to avoid processing them again. Adding a `lastSummaryIndex` to the thread's metadata is a simple and effective way to do this.
-   **Cost/Performance:** Summarization uses a significant number of tokens. The trigger threshold and batch size should be chosen carefully. It might be wise to use a smaller, faster model for the summarization task if available.
-   **Error Handling:** If the summarization LLM call fails, the process should fail gracefully without affecting the user. The `lastSummaryIndex` should not be updated, so the system will retry summarizing that batch on a future message.
