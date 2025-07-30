### User Story: Store Summaries and Replace Originals

**As a** Power User, **I want** the application to store the generated summary in Pinecone and remove the original messages it covers, **so that** my long-term memory becomes more efficient and compact.

**Workflow:**
1.  The `ContextCompressionService` receives the newly generated summary text.
2.  It calls the `OllamaService` to generate an embedding for the entire summary.
3.  It then calls the `PineconeService` to `upsert` this new vector into the correct namespace.
4.  The metadata for this vector is critically important. It must include the summary text, a flag `isSummary: true`, and the range of message IDs or indices it covers.
5.  After the summary is successfully upserted, the service calls the `PineconeService` again to delete the original vectors that are now represented by the summary.
6.  This entire process (upsert summary -> delete originals) must be atomic to prevent data loss.

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`
-   **Modify**: `src/main/services/PineconeService.ts`

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/PineconeService.ts`
    -   **Action**: Add a method to delete specific vectors by their IDs.
    -   **Implementation**:
        ```typescript
        public async deleteVectors(namespace: string, ids: string[]): Promise<void> {
          await this.initialize();
          try {
            await this.index!.namespace(namespace).deleteMany(ids);
            logger.info({ namespace, count: ids.length }, 'Successfully deleted vectors by ID.');
          } catch (error) {
            logger.error({ error, namespace }, 'Failed to delete vectors from Pinecone.');
            throw error;
          }
        }
        ```
2.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Create the `embedAndStoreSummary` method.
    -   **Implementation**:
        ```typescript
        import { v4 as uuidv4 } from 'uuid';

        // ... inside ContextCompressionService class

        public async embedAndStoreSummary(threadId: string, summary: string, originalMessages: ChatMessage[]) {
          // 1. Embed the summary
          const summaryEmbedding = await this.ollamaService.generateEmbedding(summary, 'document');
          if (!summaryEmbedding) {
            throw new Error('Failed to embed summary.');
          }

          // 2. Prepare the summary vector
          const summaryVector = {
            id: `summary-${uuidv4()}`,
            values: summaryEmbedding,
            metadata: {
              text: summary,
              isSummary: true,
              originalMessageIds: originalMessages.map(m => m.id),
              timestamp: new Date().toISOString(),
            },
          };

          // 3. Get IDs of original vectors to delete
          // This assumes that the vector ID is the same as the message ID.
          // If not, a lookup would be needed.
          const idsToDelete = originalMessages.map(m => m.id);

          // 4. Upsert and Delete (should be atomic)
          try {
            await this.pineconeService.upsertVectors(threadId, [summaryVector]);
            await this.pineconeService.deleteVectors(threadId, idsToDelete);
            logger.info({ threadId }, 'Successfully stored summary and deleted original vectors.');
          } catch (error) {
            logger.error({ error, threadId }, 'Failed during summary storage/deletion transaction.');
            // NOTE: This is where a rollback mechanism would be needed for true atomicity.
            // For now, we log the error. The risk is storing a summary without deleting originals.
          }
        }
        ```
3.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Integrate this method into the main `runSummarization` flow.
    -   **Implementation**:
        ```typescript
        // In the `runSummarization` method...
        try {
          const summary = await llmProviderPresenter.generateText(prompt, modelConfig);
          if (summary) {
            await this.embedAndStoreSummary(threadId, summary, messagesToSummarize);
          }
          return summary;
        } catch (error) {
          // ...
        }
        ```

**Acceptance Criteria:**
-   Generated summaries are correctly embedded and stored in the correct Pinecone namespace.
-   The metadata for summary vectors is accurate and includes `isSummary: true` and the IDs of the messages it replaced.
-   The original message vectors are successfully deleted from Pinecone after the summary is stored.
-   The application can distinguish between summary vectors and regular message vectors via the metadata flag.
-   The process is reasonably atomic, minimizing the risk of deleting original messages if the summary storage fails.

**Testing Plan:**
-   **Test Case 1 (DeleteVectors)**: In the `PineconeService` test, write a test for the `deleteVectors` method, mocking the `deleteMany` API call to ensure it's called with the correct IDs.
-   **Test Case 2 (Store Summary Flow)**: Write an integration test for `embedAndStoreSummary`. Mock the Ollama and Pinecone services. Verify that `upsertVectors` is called with the correctly formatted summary vector, and `deleteVectors` is called with the correct original message IDs.
-   **Test Case 3 (Atomicity Failure)**: In the integration test, simulate an error on the `deleteVectors` call. Verify that the error is caught and logged correctly.
-   **Test Case 4 (Manual E2E Test)**: Trigger the summarization for a long conversation. In the Pinecone console, verify that the original message vectors are gone and have been replaced by a single new vector with `isSummary: true` in its metadata.
