### User Story: Store Embeddings in Pinecone

**As a** Local Model Enthusiast, **I want** the embedded chunks of my conversation to be stored in my Pinecone index, **so that** they can be retrieved later to provide context.

**Workflow:**
1.  The `ContextCompressionService` has a collection of text chunks and their corresponding embeddings.
2.  For each new chat thread, the service generates a unique namespace. A good candidate for a namespace is the `threadId` itself.
3.  The service connects to the user's configured Pinecone index.
4.  It constructs a payload for the `upsert` operation, mapping each chunk and its embedding to a Pinecone vector.
5.  Each vector includes the embedding, a unique ID (e.g., using a UUID), and important metadata (the original text chunk, the source message ID, timestamp, role).
6.  The `upsert` operation is called on the Pinecone index, specifying the correct namespace for the current chat thread.
7.  Error handling is in place for potential Pinecone API failures (e.g., invalid credentials, rate limits, network issues).

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`
-   **Create**: `src/main/services/PineconeService.ts` (A dedicated service for all Pinecone interactions).

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/PineconeService.ts` (New File)
    -   **Action**: Create a service to handle Pinecone connections and operations.
    -   **Implementation**:
        ```typescript
        import { Pinecone, Index } from '@pinecone-database/pinecone';
        import { logger } from '@/shared/logger';
        import { getDecryptedPineconeKey, getPineconeEnv } from '../config'; // Hypothetical

        export class PineconeService {
          private pinecone: Pinecone | null = null;
          private index: Index | null = null;

          private async initialize() {
            if (this.index) return;
            const apiKey = getDecryptedPineconeKey();
            const environment = getPineconeEnv();
            if (!apiKey || !environment) throw new Error('Pinecone config not set');

            this.pinecone = new Pinecone({ apiKey, environment });
            // The index name could be configurable in the future
            this.index = this.pinecone.index('deepchat-context');
          }

          async upsertVectors(namespace: string, vectors: any[]) {
            await this.initialize();
            try {
              await this.index!.namespace(namespace).upsert(vectors);
            } catch (error) {
              logger.error({ error, namespace }, 'Failed to upsert vectors to Pinecone.');
              throw error;
            }
          }
        }
        ```
2.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Integrate the Pinecone storage step after embedding.
    -   **Implementation**:
        ```typescript
        import { PineconeService } from './PineconeService';
        import { v4 as uuidv4 } from 'uuid';

        export class ContextCompressionService {
          private pineconeService = new PineconeService();
          // ... other parts

          async embedAndStoreMessage(message: any, threadId: string) {
            const embeddedChunks = await this.processAndEmbed(message);

            const vectors = embeddedChunks.map(chunk => ({
              id: uuidv4(),
              values: chunk.embedding,
              metadata: {
                text: chunk.chunk,
                sourceMessageId: message.id,
                role: message.role,
                timestamp: new Date().toISOString(),
              },
            }));

            if (vectors.length > 0) {
              await this.pineconeService.upsertVectors(threadId, vectors);
            }
          }
        }
        ```
    -   **Imports**: `import { v4 as uuidv4 } from 'uuid';`

**Acceptance Criteria:**
-   The application can successfully `upsert` embeddings and metadata into a Pinecone index.
-   Each chat thread is assigned a unique and correctly formatted Pinecone namespace (using the `threadId` is recommended).
-   The metadata stored with each vector is accurate and includes the original text, message ID, role, and timestamp.
-   The system can handle and log errors from the Pinecone API without crashing.
-   Data for different chat threads is correctly isolated in different namespaces.

**Testing Plan:**
-   **Test Case 1 (Successful Upsert)**: Run the full `embedAndStoreMessage` flow. After it completes, use the Pinecone web console or API to verify that the vectors exist in the correct namespace with the correct metadata.
-   **Test Case 2 (Namespace Isolation)**: Run the process for two different chat threads. Verify in Pinecone that the vectors for each thread are in separate, correctly named namespaces.
-   **Test Case 3 (API Error Handling)**: Intentionally configure with an invalid Pinecone API key. Run the process and verify that a specific Pinecone error is caught and logged.
-   **Test Case 4 (Metadata Check)**: Inspect an upserted vector in Pinecone and confirm that the `metadata` field contains the full original text chunk and other relevant data.
