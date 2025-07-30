### Implementation Guidance: Sub-Sprint 7.2 - Embedding and Storing Summaries

This guide provides technical direction for embedding the generated summaries and replacing the original messages in Pinecone.

**Objective:** To embed the generated summaries and store them in Pinecone, replacing the original, longer messages.

**1. Pinecone Service: Deleting Vectors by ID**

To replace messages, we first need the ability to delete specific vectors by their unique IDs. This is different from deleting an entire namespace.

-   **File:** `src/main/services/PineconeService.ts`
-   **Action:** Add a `deleteVectors` method.

```typescript
// src/main/services/PineconeService.ts

export class PineconeService {
  // ... existing methods

  /**
   * Deletes a list of vectors from a namespace by their IDs.
   * @param namespace The namespace to operate in.
   * @param ids An array of vector IDs to delete.
   */
  public async deleteVectors(namespace: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    try {
      await this.initialize();
      if (!this.index) {
        throw new Error('Pinecone service not initialized.');
      }
      logger.info({ namespace, count: ids.length }, 'Deleting vectors by ID from Pinecone.');
      await this.index.namespace(namespace).deleteMany(ids);
      logger.info({ namespace, count: ids.length }, 'Successfully deleted vectors.');
    } catch (error) {
      logger.error({ error, namespace }, 'Failed to delete vectors by ID.');
      // Re-throw so the calling transaction can handle the failure
      throw error;
    }
  }
}
```

**2. `ContextCompressionService` - The Upsert-and-Delete Transaction**

This is the most critical part of the sprint. The process of storing the new summary and deleting the old messages must be as atomic as possible.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Implement the `embedAndStoreSummary` method and integrate it.

```typescript
// src/main/services/ContextCompressionService.ts
import { v4 as uuidv4 } from 'uuid';

export class ContextCompressionService {
  // ... existing methods

  // This method is called by the background summarization trigger
  public async runSummarizationAndStore(...) {
    // ... (logic from 7.1 to generate the summary text)
    const summary = await llmProviderPresenter.generateText(...);

    if (summary) {
      try {
        await this.embedAndStoreSummary(threadId, summary, originalMessages);
        // If successful, update the thread metadata
        this.threadService.updateThreadMetadata(threadId, { 
          lastSummaryIndex: newIndex 
        });
      } catch (e) {
        logger.error({ error: e, threadId }, 'Failed to complete the summary storage transaction. The lastSummaryIndex will not be updated, and this batch will be retried later.');
      }
    }
  }

  private async embedAndStoreSummary(threadId: string, summary: string, originalMessages: ChatMessage[]) {
    // 1. Embed the summary text as a 'document'
    const summaryEmbedding = await this.ollamaService.generateEmbedding(summary, 'document');
    if (!summaryEmbedding) {
      throw new Error('Failed to generate embedding for the summary text.');
    }

    // 2. Prepare the new summary vector with rich metadata
    const summaryVector = {
      id: `summary-${uuidv4()}`,
      values: summaryEmbedding,
      metadata: {
        text: summary,
        isSummary: true,
        originalMessageCount: originalMessages.length,
        // Storing the IDs is useful for debugging but can be omitted
        // originalMessageIds: originalMessages.map(m => m.id),
        timestamp: new Date().toISOString(),
      },
    };

    // 3. Get the IDs of the original vectors to be deleted.
    // This assumes the vector ID stored in Pinecone is the message.id.
    // If you used UUIDs for vector IDs, you need a way to map message IDs to vector IDs.
    const vectorIdsToDelete = originalMessages.map(m => m.id);

    // 4. Perform the transaction: upsert first, then delete.
    logger.info({ threadId }, 'Upserting summary vector.');
    await this.pineconeService.upsertVectors(threadId, [summaryVector]);

    logger.info({ threadId }, 'Deleting original message vectors.');
    await this.pineconeService.deleteVectors(threadId, vectorIdsToDelete);

    logger.info({ threadId }, 'Summary transaction completed successfully.');
  }
}
```

**3. Key Considerations:**

-   **Atomicity:** True atomicity is not possible without a complex two-phase commit system, which is overkill here. The implemented pattern is `upsert -> delete`. The biggest risk is that the `delete` call fails after the `upsert` succeeds. This would result in duplicated context (the summary and the original messages both exist). The system can recover from this by having the summarization trigger logic be smart enough to re-process the batch later, but for now, robust logging is key.
-   **Vector IDs:** The logic assumes the ID of the vector stored in Pinecone is the same as the `message.id`. If you are generating random UUIDs for your vectors, you **must** store the `message.id` in the metadata so you can look up the vector ID to delete it later. The current implementation simplifies this by using the message ID as the vector ID.
-   **Metadata:** The `isSummary: true` flag is critical. When you later query Pinecone (Sprint 5), your `retrieveRelevantContext` function should be able to see this flag. You might treat summaries differently, perhaps by always including them if they are retrieved, as they represent a larger chunk of history.
-   **Error Handling:** The `embedAndStoreSummary` method should throw an error on failure. The calling method (`runSummarizationAndStore`) should catch this error and, crucially, **not** update the `lastSummaryIndex`. This ensures that if the storage process fails, the system will automatically try to summarize that same batch of messages again on the next user interaction.
