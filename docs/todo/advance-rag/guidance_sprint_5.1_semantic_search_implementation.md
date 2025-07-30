### Implementation Guidance: Sub-Sprint 5.1 - Semantic Search Implementation

This guide provides technical direction for implementing the core semantic search functionality to retrieve relevant context from Pinecone.

**Objective:** To implement the core semantic search functionality that retrieves relevant conversation history from Pinecone based on the user's latest message.

**1. Ollama Service: Differentiating Query vs. Document Embeddings**

The `nomic-embed-text` model, a leading open-source choice, has different optimal prefixes for embedding documents for storage versus embedding a query for search. This is a critical detail for retrieval accuracy.

-   **File:** `src/main/services/OllamaService.ts`
-   **Action:** Update the `generateEmbedding` method to accept a parameter that specifies the type of embedding to generate.

```typescript
// src/main/services/OllamaService.ts

export class OllamaService {
  // ... existing methods

  public async generateEmbedding(text: string, type: 'document' | 'query'): Promise<number[] | null> {
    const model = ContextCompressionPresenter.getOllamaModel();
    if (!model) {
      logger.warn('Cannot generate embedding, Ollama model not configured.');
      return null;
    }

    // Critical: Use the correct prefix based on the embedding type
    const prefix = type === 'query' ? 'search_query:' : 'search_document:';
    const prompt = `${prefix} ${text}`;

    try {
      // ... existing fetch logic ...
      const data = (await response.json()) as OllamaEmbeddingResponse;
      return data.embedding;
    } catch (error) {
      logger.error({ error, model, prompt }, 'Failed to generate embedding from Ollama.');
      return null;
    }
  }
}
```

**2. Pinecone Service: Implementing the Query Method**

The `PineconeService` needs a method to perform the actual search against the vector index.

-   **File:** `src/main/services/PineconeService.ts`
-   **Action:** Add a `queryNamespace` method.

```typescript
// src/main/services/PineconeService.ts
import { Pinecone, Index, Vector, QueryResponse } from '@pinecone-database/pinecone';
// ... other imports

// Recall the metadata type definition
interface ChatVectorMetadata {
  text: string;
  // ... other metadata fields
}

export class PineconeService {
  // ... existing methods: getInstance, initialize, upsertVectors, deleteNamespace

  public async queryNamespace(namespace: string, vector: number[], topK: number): Promise<ChatVectorMetadata[]> {
    try {
      await this.initialize();
      if (!this.index) {
        throw new Error('Pinecone service not initialized.');
      }

      logger.info({ namespace, topK }, 'Querying Pinecone namespace.');

      const queryResponse: QueryResponse<ChatVectorMetadata> = await this.index.namespace(namespace).query({
        vector,
        topK,
        includeMetadata: true, // Essential to get the text back
      });

      // Return the metadata from all matching vectors
      return queryResponse.matches.map(match => match.metadata).filter(Boolean) as ChatVectorMetadata[];

    } catch (error) {
      logger.error({ error, namespace }, 'Failed to query Pinecone.');
      return []; // Return an empty array on failure to prevent crashes
    }
  }
}
```

**3. `ContextCompressionService`: Orchestrating the Search**

This service will connect the embedding generation and the Pinecone query.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Create the `retrieveRelevantContext` method.

```typescript
// src/main/services/ContextCompressionService.ts
// ... imports

export class ContextCompressionService {
  // ... existing properties and methods

  public async retrieveRelevantContext(threadId: string, currentMessageContent: string): Promise<ChatVectorMetadata[]> {
    logger.info({ threadId }, 'Starting relevant context retrieval.');

    // 1. Generate an embedding for the new user message (as a 'query')
    const queryEmbedding = await this.ollamaService.generateEmbedding(currentMessageContent, 'query');

    if (!queryEmbedding) {
      logger.warn({ threadId }, 'Could not generate query embedding. Aborting retrieval.');
      return [];
    }

    // 2. Use the embedding to query Pinecone for the top N results
    const topK = 5; // This should be made configurable in the future
    const retrievedMatches = await this.pineconeService.queryNamespace(threadId, queryEmbedding, topK);

    logger.info({ threadId, count: retrievedMatches.length }, 'Retrieved context from Pinecone.');
    return retrievedMatches;
  }
}
```

**4. Key Considerations:**

-   **Latency:** The entire process (embedding + query) must be fast. `nomic-embed-text` is very fast on a local machine, and Pinecone p99 latency is typically under 100ms. The target for this entire flow should be well under 500ms to avoid a noticeable delay for the user.
-   **`topK` Parameter:** The number of results to retrieve (`topK`) is a critical parameter. Too low, and you might miss important context. Too high, and you risk adding noise and using too many tokens. Starting with a value of 3-5 is reasonable. This should be exposed as a user setting in the future.
-   **Query Prefix:** Emphasize the importance of the `search_query:` prefix. Forgetting this will lead to significantly worse retrieval results.
-   **Error Handling:** The `queryNamespace` method should return an empty array `[]` on failure. This allows the calling code in the `threadPresenter` to proceed without crashing, simply using the recent conversation history as a fallback.
