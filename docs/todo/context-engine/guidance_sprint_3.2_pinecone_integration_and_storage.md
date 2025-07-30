### Implementation Guidance: Sub-Sprint 3.2 - Pinecone Integration and Storage

This guide provides technical direction for integrating with the Pinecone API to store generated embeddings.

**Objective:** To integrate with the Pinecone API to store the generated embeddings in a way that isolates each chat thread.

**1. Pinecone Service (`PineconeService.ts`):**
It is critical to abstract all Pinecone-related logic into a dedicated service. This service will manage the client, index connection, and all API operations (upsert, query, delete).

**Installation:**
```bash
npm install @pinecone-database/pinecone uuid
npm install -D @types/uuid
```

**Implementation (`src/main/services/PineconeService.ts`):**

```typescript
// src/main/services/PineconeService.ts
import { Pinecone, Index, Vector } from '@pinecone-database/pinecone';
import { logger } from '@/shared/logger';
import { ContextCompressionPresenter } from '@/main/presenter/contextCompressionPresenter';

// Define a type for our specific metadata
interface ChatVectorMetadata {
  text: string;
  sourceMessageId: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export class PineconeService {
  private static instance: PineconeService;
  private pinecone: Pinecone | null = null;
  private index: Index<ChatVectorMetadata> | null = null;

  // Singleton pattern to ensure only one client is active
  public static getInstance(): PineconeService {
    if (!PineconeService.instance) {
      PineconeService.instance = new PineconeService();
    }
    return PineconeService.instance;
  }

  private async initialize() {
    // If already initialized, do nothing.
    if (this.index) return;

    const apiKey = ContextCompressionPresenter.getDecryptedApiKey();
    const environment = ContextCompressionPresenter.getPineconeEnv();

    if (!apiKey || !environment) {
      throw new Error('Cannot initialize Pinecone: credentials are not configured.');
    }

    logger.info('Initializing Pinecone client...');
    this.pinecone = new Pinecone({ apiKey, environment });

    // The index name should be constant or user-configurable in the future.
    const indexName = 'deepchat-context-history';
    this.index = this.pinecone.index<ChatVectorMetadata>(indexName);
    logger.info(`Pinecone client initialized for index: ${indexName}`);
  }

  public async upsertVectors(namespace: string, vectors: Vector<ChatVectorMetadata>[]) {
    try {
      await this.initialize();
      logger.info(`Upserting ${vectors.length} vectors into namespace: ${namespace}`);
      // Pinecone recommends upserting in batches for large numbers of vectors
      await this.index!.namespace(namespace).upsert(vectors);
      logger.info('Upsert operation successful.');
    } catch (error) {
      logger.error({ error, namespace }, 'Failed to upsert vectors to Pinecone.');
      // Re-throw to allow the caller to handle the failure
      throw error;
    }
  }
}
```

**2. Integrating into `ContextCompressionService`:**
This service will use the `PineconeService` to store the chunks it created in the previous sub-sprint.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Call the `PineconeService` after generating embeddings.

```typescript
// src/main/services/ContextCompressionService.ts
import { v4 as uuidv4 } from 'uuid';
import { PineconeService } from './PineconeService';
import { ChatMessage, ChatThread } from '@/shared/chat.d';
// ... other imports

export class ContextCompressionService {
  private pineconeService: PineconeService;
  // ...

  constructor() {
    this.pineconeService = PineconeService.getInstance();
    // ...
  }

  // This is the main method called by the ThreadPresenter
  public async processAndStore(thread: ChatThread, newMessage: ChatMessage) {
    // 1. Embed the new message
    const embeddedChunks = await this.embedAndPrepareMessage(newMessage);

    // 2. Format for Pinecone
    const vectors = embeddedChunks.map(chunk => ({
      id: uuidv4(),
      values: chunk.embedding,
      metadata: {
        text: chunk.text,
        sourceMessageId: chunk.sourceMessageId,
        role: newMessage.role,
        timestamp: new Date().toISOString(),
      },
    }));

    // 3. Upsert to Pinecone
    if (vectors.length > 0) {
      // The thread ID is the perfect unique namespace
      const namespace = thread.id;
      await this.pineconeService.upsertVectors(namespace, vectors);
    }
  }
  // ... other methods from previous sprint
}
```

**3. Key Considerations:**
-   **Namespaces:** Using the unique `threadId` as the Pinecone namespace is a robust and simple way to ensure perfect data isolation between different conversations.
-   **Metadata:** The metadata is as important as the vector itself. Storing the original text is crucial for constructing the context later. Including the `role`, `timestamp`, and original `messageId` allows for more advanced filtering and context reconstruction strategies in the future.
-   **Index Name:** The Pinecone index (`deepchat-context-history`) must be created by the user manually in their Pinecone account beforehand. The application code assumes it exists. Future enhancements could include a feature to create the index programmatically if it doesn't exist.
-   **Singleton Pattern:** Using a singleton for the `PineconeService` prevents creating multiple, unnecessary connections to the Pinecone API, which is more efficient and avoids potential rate-limiting issues.
-   **Error Handling:** If the `upsert` operation fails, the application should log the error clearly. For a more advanced implementation, it could implement a retry mechanism with exponential backoff.
