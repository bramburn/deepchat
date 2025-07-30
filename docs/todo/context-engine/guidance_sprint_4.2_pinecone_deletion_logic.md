### Implementation Guidance: Sub-Sprint 4.2 - Pinecone Deletion Logic

This guide provides technical direction for implementing the logic to delete all vectors within a specific Pinecone namespace.

**Objective:** To implement the logic that deletes all vectors associated with a specific namespace in Pinecone.

**1. Modifying the `PineconeService`:**
The `PineconeService` is the single source of truth for all Pinecone interactions. We will add a new public method to it for handling the deletion.

-   **File:** `src/main/services/PineconeService.ts`
-   **Action:** Add the `deleteNamespace` method.

```typescript
// src/main/services/PineconeService.ts
import { Pinecone, Index, Vector } from '@pinecone-database/pinecone';
import { logger } from '@/shared/logger';
import { ContextCompressionPresenter } from '@/main/presenter/contextCompressionPresenter';

// ... existing interface and class definition

export class PineconeService {
  // ... existing properties and methods: instance, pinecone, index, getInstance, initialize, upsertVectors

  /**
   * Deletes all vectors within a given namespace from the Pinecone index.
   * This is a fire-and-forget operation from the perspective of the UI.
   * @param namespace The namespace to delete, which corresponds to a chat thread ID.
   */
  public async deleteNamespace(namespace: string): Promise<void> {
    try {
      // Ensure the client is ready before attempting an operation.
      await this.initialize();

      // If initialization failed (e.g., no credentials), index will be null.
      if (!this.index) {
        logger.warn({ namespace }, 'Skipping deletion: Pinecone service is not initialized.');
        return;
      }

      logger.info({ namespace }, 'Sending request to Pinecone to delete all vectors in namespace.');

      // The core Pinecone SDK call.
      await this.index.namespace(namespace).deleteAll();

      logger.info({ namespace }, 'Pinecone deletion request for namespace completed successfully.');

    } catch (error) {
      // Catch any errors from the API call, log them, but do not crash the app.
      // This is a background task, and its failure should not impact the user directly.
      logger.error({ error, namespace }, 'An error occurred during Pinecone namespace deletion.');
    }
  }
}
```

**2. How it Fits Together (Recap):**

1.  **`chat.ts` (Renderer):** User deletes a thread -> `window.api.notifyThreadDeleted(threadId)` is called.
2.  **`preload.ts`:** The call is securely passed to the main process: `ipcRenderer.send('thread-deleted', threadId)`.
3.  **`contextCompressionPresenter.ts` (Main):** The `ipcMain.on('thread-deleted', ...)` listener fires.
4.  **`contextCompressionPresenter.ts` (Main):** The listener calls `PineconeService.getInstance().deleteNamespace(threadId)`.
5.  **`PineconeService.ts` (Main):** The `deleteNamespace` method shown above is executed, clearing the data from Pinecone.

**3. Key Considerations:**

-   **Graceful Failure:** This is the most important principle for this task. Deletion is a background cleanup process. If it fails (e.g., Pinecone API is down, credentials have become invalid), it must not crash the application or show an error to the user. The error should be logged for debugging by the developer, but the application must continue to function normally.
-   **Idempotency of Pinecone API:** The `deleteAll` operation in the Pinecone SDK is idempotent. If you try to delete a namespace that doesn't exist, the API call will still succeed without throwing an error. This is very helpful as it means we don't need to check if a namespace exists before trying to delete it.
-   **No Return Value:** The `deleteNamespace` function should have a `void` or `Promise<void>` return type. The calling code (`ContextCompressionPresenter`) does not need to know the outcome. It simply triggers the action.
-   **Initialization Check:** The method should always call `this.initialize()` first. This ensures that if the application has been running for a while, the Pinecone client is still valid and ready to be used.
