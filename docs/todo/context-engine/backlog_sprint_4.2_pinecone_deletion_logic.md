### User Story: Delete Namespace from Pinecone

**As a** user, **I want** all vector data associated with my deleted chat thread to be completely removed from the Pinecone index, **so that** my data is permanently and securely erased.

**Workflow:**
1.  The `PineconeService` receives a request to delete a namespace (which is the `threadId`).
2.  The service checks if it has been initialized and connects to the Pinecone index if necessary.
3.  It calls the `delete` method on the index, specifying the namespace to be cleared and setting `deleteAll` to `true`.
4.  The operation is wrapped in error handling to manage potential API issues from Pinecone.
5.  Success or failure of the operation is logged for monitoring and debugging purposes.
6.  The function handles the case where a namespace does not exist in Pinecone gracefully (Pinecone's API does not error in this case), ensuring no crashes.

**File Changes:**
-   **Modify**: `src/main/services/PineconeService.ts`

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/PineconeService.ts`
    -   **Action**: Implement a new public method `deleteNamespace`.
    -   **Implementation**:
        ```typescript
        import { Pinecone, Index } from '@pinecone-database/pinecone';
        import { logger } from '@/shared/logger';

        export class PineconeService {
          // ... existing properties and methods (initialize, upsertVectors)

          async deleteNamespace(namespace: string) {
            await this.initialize();
            if (!this.index) {
              logger.warn('Pinecone index not available, cannot delete namespace.');
              return;
            }

            try {
              logger.info({ namespace }, 'Initiating deletion of all vectors in namespace.');
              await this.index.namespace(namespace).deleteAll();
              logger.info({ namespace }, 'Successfully deleted namespace from Pinecone.');
            } catch (error) {
              logger.error({ error, namespace }, 'Failed to delete namespace from Pinecone.');
              // Do not re-throw here as this is a background cleanup task
            }
          }
        }
        ```

**Acceptance Criteria:**
-   Calling the `deleteNamespace` function with a valid namespace removes all vectors from that namespace in Pinecone.
-   The application does not crash or enter an error state if the Pinecone API is unavailable during the deletion attempt.
-   Success and failure of the deletion operation are clearly logged.
-   Attempting to delete a namespace that doesn't exist is handled gracefully by the Pinecone client and does not cause an application error.
-   The function returns a clear status or logs the outcome of the deletion attempt.

**Testing Plan:**
-   **Test Case 1 (Successful Deletion)**: 
    1.  Create a thread and add some messages to populate a Pinecone namespace.
    2.  Verify the vectors exist in the Pinecone console.
    3.  Delete the thread in the UI, triggering the `deleteNamespace` call.
    4.  Verify in the Pinecone console that the namespace and all its vectors have been removed.
-   **Test Case 2 (Deleting Non-Existent Namespace)**: 
    1.  Call `deleteNamespace` directly with a random, non-existent namespace string.
    2.  Verify that the application logs the attempt but does not throw any errors and continues to run normally.
-   **Test Case 3 (API Error Handling)**: 
    1.  Modify the service to use an invalid API key temporarily.
    2.  Attempt to delete a namespace.
    3.  Verify that the Pinecone API error is caught, logged, and does not crash the application.
