### User Story: Conditionally Apply Context Strategy

**As a** developer, **I want** the application to dynamically choose the correct context management strategy based on the model's configuration, **so that** conversations use either the standard truncation method or the new context compression service.

**Workflow:**
1.  A new message is about to be processed by the `threadPresenter`.
2.  The presenter retrieves the configuration for the currently active model.
3.  It checks the `contextCompressionEnabled` flag on the model's configuration.
4.  If the flag is `true`, the presenter calls the new `ContextCompressionService` to handle the conversation history.
5.  If the flag is `false` or undefined, the presenter proceeds with the existing, default truncation logic.
6.  The chosen strategy is logged for debugging and monitoring purposes.

**File Changes:**
-   **Modify**: `src/main/presenter/threadPresenter.ts` (Or the file responsible for managing conversation context before sending it to the LLM).
-   **Create**: `src/main/services/ContextCompressionService.ts` (A new service to encapsulate the compression logic).
-   **Modify**: `src/main/presenter/index.ts` (To instantiate and make the new service available).

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/ContextCompressionService.ts` (New File)
    -   **Action**: Create a placeholder for the new service.
    -   **Implementation**:
        ```typescript
        export class ContextCompressionService {
          constructor() {
            console.log('Context Compression Service Initialized');
          }

          async processContext(thread: any): Promise<any> {
            console.log(`Processing context for thread ${thread.id} with compression.`);
            // In future sprints, this will perform embedding, querying, and context assembly.
            // For now, it can just return the original thread or a truncated version.
            return thread;
          }
        }
        ```
2.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Modify the main message processing function to include the conditional logic.
    -   **Implementation**:
        ```typescript
        import { ContextCompressionService } from '../services/ContextCompressionService';
        import { getModelConfig } from '../config'; // A hypothetical function to get model config

        // Assume service is instantiated and available
        const compressionService = new ContextCompressionService();

        async function handleMessage(thread: any) {
          const modelConfig = getModelConfig(thread.modelId);

          let processedThread;
          if (modelConfig?.contextCompressionEnabled) {
            console.log('Using Context Compression strategy.');
            processedThread = await compressionService.processContext(thread);
          } else {
            console.log('Using default truncation strategy.');
            // Call the existing, old truncation logic here
            processedThread = applyTruncation(thread);
          }

          // ...continue with sending processedThread to the LLM
        }
        ```
    -   **Imports**: `import { ContextCompressionService } from '../services/ContextCompressionService';`
3.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Ensure there is a clear logging mechanism.
    -   **Implementation**:
        ```typescript
        // Using a shared logger is recommended
        import { logger } from '../../shared/logger';

        // Inside the handleMessage function...
        if (modelConfig?.contextCompressionEnabled) {
          logger.info({ threadId: thread.id, strategy: 'compression' }, 'Applying context strategy.');
          // ...
        } else {
          logger.info({ threadId: thread.id, strategy: 'truncation' }, 'Applying context strategy.');
          // ...
        }
        ```
    -   **Imports**: `import { logger } from '../../shared/logger';`

**Acceptance Criteria:**
-   The `threadPresenter` correctly identifies whether context compression is enabled for the active model.
-   If enabled, the conversation is passed to the new `ContextCompressionService`.
-   If disabled, the existing truncation logic is executed as normal.
-   The application can seamlessly switch between context management strategies based on the model's settings without errors.
-   Logs clearly indicate which context strategy was used for a given request, including the thread ID and the strategy name (`compression` or `truncation`).

**Testing Plan:**
-   **Test Case 1 (Compression Path)**: Enable compression for a model. Start a conversation. Check logs to confirm the `ContextCompressionService` was called and the log message shows `strategy: 'compression'`.
-   **Test Case 2 (Truncation Path)**: Disable compression for a model. Start a conversation. Check logs to confirm the old logic was called and the log message shows `strategy: 'truncation'`.
-   **Test Case 3 (Mixed Models)**: Use two different models in the application, one with compression enabled and one without. Switch between them and verify the correct context strategy is applied for each.
-   **Test Case 4 (Default Behavior)**: For a newly configured model where the toggle has never been touched, verify the application defaults to the truncation strategy.
