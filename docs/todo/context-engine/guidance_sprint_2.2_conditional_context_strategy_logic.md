### Implementation Guidance: Sub-Sprint 2.2 - Conditional Context Strategy Logic

This guide provides technical direction for implementing the core routing logic that switches between the standard context truncation and the new context compression service.

**Objective:** To implement the backend logic that conditionally applies the new context compression workflow based on the model-specific toggle setting.

**1. Creating the `ContextCompressionService`:**
This service will eventually contain the complex logic for chunking, embedding, and querying. For now, it can be a placeholder that simply logs its activity.

-   **File:** `src/main/services/ContextCompressionService.ts` (Create this new file)
-   **Action:** Define the class structure.

```typescript
// src/main/services/ContextCompressionService.ts
import { logger } from '@/shared/logger';
import { ChatThread } from '@/shared/chat.d'; // Assuming a shared type definition for a thread

export class ContextCompressionService {
  constructor() {
    logger.info('Context Compression Service has been initialized.');
  }

  /**
   * Processes a chat thread using the context compression strategy.
   * In this initial sprint, it acts as a placeholder.
   * In future sprints, it will query Pinecone and construct a new context.
   */
  public async processContext(thread: ChatThread): Promise<ChatThread> {
    logger.info({ threadId: thread.id }, 'Processing thread with Context Compression Service.');

    // Placeholder logic for now. It simply returns the thread as-is.
    // In Sprint 3, this will be replaced with:
    // 1. Generate a query embedding from the latest user message.
    // 2. Query Pinecone for relevant historical messages.
    // 3. Construct a new, compressed message list.
    // 4. Return a new thread object with the compressed context.

    return thread;
  }
}
```

**2. Modifying the `threadPresenter`:**
This is the core of the task. The presenter that prepares the conversation history for the LLM needs to be intercepted.

-   **File to find:** `src/main/presenter/threadPresenter.ts` is the most likely candidate. Look for the code that handles user messages, retrieves conversation history, and calls the LLM provider.
-   **Action:** Inject the `ContextCompressionService` and add the conditional logic.

```typescript
// src/main/presenter/threadPresenter.ts
import { logger } from '@/shared/logger';
import { ChatThread } from '@/shared/chat.d';
import { ModelConfig } from '@/shared/model.d';
import { ContextCompressionService } from '@/main/services/ContextCompressionService';
import { ConfigService } from '@/main/services/ConfigService'; // Hypothetical service to get configs
import { LlmProvider } from '@/main/llmProvider'; // The service that calls the actual LLM

export class ThreadPresenter {
  private compressionService: ContextCompressionService;
  private configService: ConfigService;

  constructor() {
    this.compressionService = new ContextCompressionService();
    this.configService = new ConfigService();
    // ... other initializations
  }

  public register() {
    // Register IPC handlers, e.g., for handling incoming messages
    ipcMain.on('send-message', this.handleSendMessage);
  }

  private handleSendMessage = async (event, { thread, message }) => {
    const modelConfig = this.configService.getModelConfigById(thread.modelId);

    let contextForLlm: ChatThread;

    if (modelConfig?.contextCompressionEnabled) {
      logger.info({ threadId: thread.id, strategy: 'compression' }, 'Applying context compression strategy.');
      contextForLlm = await this.compressionService.processContext(thread);
    } else {
      logger.info({ threadId: thread.id, strategy: 'truncation' }, 'Applying default truncation strategy.');
      // This function should contain the pre-existing logic for cutting down context
      contextForLlm = this.applyStandardTruncation(thread);
    }

    // The rest of the function continues as before
    LlmProvider.sendMessage(contextForLlm, message);
  };

  private applyStandardTruncation(thread: ChatThread): ChatThread {
    // ... This is your existing logic for managing context length.
    // For example, slicing the messages array:
    const maxTokens = 8192;
    let currentTokens = 0;
    const truncatedMessages = [];
    for (const msg of [...thread.messages].reverse()) {
        currentTokens += msg.tokenCount; // or calculate tokens here
        if (currentTokens > maxTokens) break;
        truncatedMessages.unshift(msg);
    }
    return { ...thread, messages: truncatedMessages };
  }
}
```

**3. Key Considerations:**
-   **Dependency Injection:** Instead of instantiating the `ContextCompressionService` directly within `ThreadPresenter`, consider using a dependency injection pattern if the project has one. This makes testing easier.
-   **Logging:** Logging is critical for debugging this conditional flow. Ensure logs include a unique identifier for the request or thread, the chosen strategy (`compression` or `truncation`), and the model ID.
-   **Service Responsibility:** The `threadPresenter` should only be responsible for *routing* the request. The actual implementation of compression and truncation should be in their own dedicated services or functions to keep the presenter clean.
-   **Configuration Access:** The `threadPresenter` needs a reliable way to get the configuration for the model being used. This might involve calling a `ConfigService` or accessing a store that holds all model configurations.
