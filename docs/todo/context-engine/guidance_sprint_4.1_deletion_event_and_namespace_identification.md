### Implementation Guidance: Sub-Sprint 4.1 - Deletion Event and Namespace Identification

This guide provides technical direction for creating the event-driven mechanism to trigger the deletion of a thread's context from Pinecone.

**Objective:** To create the event handling mechanism that triggers the context deletion process and correctly identifies the Pinecone namespace associated with a deleted chat thread.

**1. Frontend Event Trigger (Pinia Store):**
The process starts when the user initiates a deletion from the UI. The action in the Pinia store that handles this deletion is the perfect place to trigger a notification to the main process.

-   **File:** `src/renderer/src/store/chat.ts` (or the store that manages the list of chat threads).
-   **Action:** In the `deleteThread` action, after removing the thread from the local state, make an IPC call.

```typescript
// src/renderer/src/store/chat.ts
import { defineStore } from 'pinia';
import { logger } from '@/shared/logger';

export const useChatStore = defineStore('chat', {
  state: () => ({
    threads: [],
    activeThreadId: null,
  }),
  actions: {
    deleteThread(threadId: string) {
      logger.info({ threadId }, 'Requesting to delete thread.');
      const index = this.threads.findIndex(t => t.id === threadId);
      if (index !== -1) {
        this.threads.splice(index, 1);
        logger.info({ threadId }, 'Thread removed from local state.');

        // Fire-and-forget notification to the main process for cleanup.
        // It's crucial this happens *after* the state update is confirmed.
        window.api.notifyThreadDeleted(threadId);

        // Logic to switch to another thread if the active one was deleted
        if (this.activeThreadId === threadId) {
          this.activeThreadId = this.threads.length > 0 ? this.threads[0].id : null;
        }
      }
    },
  },
});
```

**2. Exposing the IPC Channel (`preload.ts`):**
The renderer needs a secure way to talk to the main process. This is the job of the preload script.

-   **File:** `src/preload/index.ts`
-   **Action:** Add the `notifyThreadDeleted` function to the `contextBridge`.

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // ... other exposed functions
  notifyThreadDeleted: (threadId: string) => ipcRenderer.send('thread-deleted', threadId),
});
```

**3. Main Process Listener:**
A presenter in the main process must listen for the `thread-deleted` event. The `ContextCompressionPresenter` is the ideal location for this logic.

-   **File:** `src/main/presenter/contextCompressionPresenter.ts`
-   **Action:** Add an `ipcMain.on` listener.

```typescript
// src/main/presenter/contextCompressionPresenter.ts
import { ipcMain } from 'electron';
import { logger } from '@/shared/logger';
import { PineconeService } from '@/main/services/PineconeService';

export class ContextCompressionPresenter {
  // ... existing methods like register(), saveSettings(), etc.

  register() {
    // ... other handlers
    ipcMain.on('thread-deleted', this.handleThreadDeleted);
  }

  private handleThreadDeleted = async (_event, threadId: string) => {
    if (!threadId) {
      logger.warn('Received thread-deleted event with no threadId.');
      return;
    }

    logger.info({ threadId }, 'Received notification to delete context for thread.');

    try {
      // The threadId is the namespace. The Pinecone service will handle the deletion.
      const pineconeService = PineconeService.getInstance();
      // The actual deletion logic is in the next sub-sprint.
      await pineconeService.deleteNamespace(threadId);
      logger.info({ threadId }, 'Successfully passed deletion request to Pinecone service.');
    } catch (error) {
      logger.error({ error, threadId }, 'An error occurred while trying to delete Pinecone namespace.');
    }
  };
}
```

**4. Key Considerations:**
-   **Namespace Identification:** The design choice to use the `threadId` directly as the Pinecone namespace simplifies this entire process immensely. There is no need for a separate lookup table or mapping mechanism. The `threadId` *is* the namespace.
-   **Asynchronous Cleanup:** The cleanup process is asynchronous and fire-and-forget from the renderer's perspective. The UI should not wait for the Pinecone deletion to complete. This ensures the user experience is fast and snappy.
-   **Error Handling:** The main process listener must be wrapped in a `try...catch` block. If the Pinecone service throws an error, it should be logged, but it should not crash the application. The user has already deleted the thread in the UI; this is a background cleanup task.
-   **Idempotency:** The deletion logic in the `PineconeService` (covered in the next sub-sprint) should be idempotent, meaning calling it multiple times for the same namespace should not cause an error.
