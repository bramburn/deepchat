### User Story: Trigger Context Deletion on Thread Deletion

**As a** user, **I want** the compressed context for a chat thread to be deleted from Pinecone when I delete the thread, **so that** my data is fully removed and I am not storing orphaned data.

**Workflow:**
1.  The user deletes a chat thread from the UI.
2.  The Pinia store responsible for chat state (e.g., `chat.ts`) processes the deletion.
3.  After successfully removing the thread from its state, the store emits a global event or calls an IPC function, passing the `threadId` of the deleted thread.
4.  A listener in the main process catches this event.
5.  The main process receives the `threadId`.
6.  The `threadId` is used as the namespace identifier to be passed to the Pinecone deletion service.

**File Changes:**
-   **Modify**: The Pinia store for chat, likely `src/renderer/src/store/chat.ts`.
-   **Modify**: `src/main/presenter/threadPresenter.ts` or a new `contextCompressionPresenter.ts` to listen for the deletion event.
-   **Modify**: `src/preload/index.ts` to expose the IPC channel for deletion.

**Actions to Undertake:**
1.  **Filepath**: `src/preload/index.ts`
    -   **Action**: Expose a new IPC function for the renderer to call when a thread is deleted.
    -   **Implementation**:
        ```typescript
        // In contextBridge.exposeInMainWorld('api', ...);
        notifyThreadDeleted: (threadId: string) => ipcRenderer.send('thread-deleted', threadId),
        ```
2.  **Filepath**: `src/renderer/src/store/chat.ts` (or equivalent chat store)
    -   **Action**: Modify the action that deletes a thread to call the new IPC function.
    -   **Implementation**:
        ```typescript
        // In the chat Pinia store
        actions: {
          deleteThread(threadId: string) {
            // ... existing logic to remove the thread from the state array
            this.threads = this.threads.filter(t => t.id !== threadId);

            // Notify the main process to clean up vector storage
            window.api.notifyThreadDeleted(threadId);
          }
        }
        ```
3.  **Filepath**: `src/main/presenter/contextCompressionPresenter.ts` (or another main process presenter)
    -   **Action**: Create an IPC listener to receive the deletion notification.
    -   **Implementation**:
        ```typescript
        import { ipcMain } from 'electron';
        import { PineconeService } from '../services/PineconeService';

        // In the presenter's registration method
        ipcMain.on('thread-deleted', (event, threadId) => {
          console.log(`Received request to delete context for thread: ${threadId}`);
          // The threadId is the namespace
          const pineconeService = PineconeService.getInstance();
          pineconeService.deleteNamespace(threadId);
        });
        ```
    -   **Imports**: `import { ipcMain } from 'electron';`, `import { PineconeService } from '../services/PineconeService';`

**Acceptance Criteria:**
-   Deleting a thread in the UI correctly triggers the `notifyThreadDeleted` IPC call with the correct `threadId`.
-   The main process receives the event and logs the request.
-   The system can accurately look up or use the `threadId` as the Pinecone namespace.
-   The correct namespace is passed to the deletion logic.
-   The system handles cases where a `threadId` might not have an associated namespace (e.g., if context compression was never enabled for that thread) without errors.

**Testing Plan:**
-   **Test Case 1 (Event Firing)**: Enable context compression for a model and have a conversation. Delete the thread. Check the main process logs to confirm the `thread-deleted` event was received with the correct `threadId`.
-   **Test Case 2 (No Errors on Uncompressed Thread)**: Have a conversation with a model where compression is disabled. Delete the thread. Verify that the event is still fired but that no errors occur in the main process (the deletion logic in Pinecone should handle non-existent namespaces gracefully).
-   **Test Case 3 (Multiple Deletions)**: Create and delete several threads in succession and verify the main process receives a distinct event for each one.
