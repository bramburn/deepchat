### User Story: Chunk and Embed Chat Messages

**As a** Local Model Enthusiast, **I want** my chat history to be automatically chunked and embedded when I send a message, **so that** it can be prepared for storage in a vector database.

**Workflow:**
1.  The `ContextCompressionService` receives a new message (or a pair of user/assistant messages).
2.  The service uses a text splitting utility to break the message content into smaller, semantically coherent chunks.
3.  For each chunk, the service constructs a request to the local Ollama server's `/api/embed` endpoint.
4.  The request specifies the user-configured model (e.g., `nomic-embed-text`) and includes the `search_document:` prefix for optimal performance.
5.  The service sends the request and awaits the embedding vector from Ollama.
6.  Error conditions (e.g., Ollama server offline, model not found) are handled gracefully.
7.  The service collects the text chunks and their corresponding embedding vectors for the next stage (storage).

**File Changes:**
-   **Modify**: `src/main/services/ContextCompressionService.ts`
-   **Create**: `src/main/utils/textSplitter.ts` (A new utility for chunking text).
-   **Create**: `src/main/services/OllamaService.ts` (A dedicated service to interact with the Ollama API).

**Actions to Undertake:**
1.  **Filepath**: `src/main/utils/textSplitter.ts` (New File)
    -   **Action**: Implement a text chunking function. A simple implementation could be based on character length with overlap.
    -   **Implementation**:
        ```typescript
        export function chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
          const chunks: string[] = [];
          let i = 0;
          while (i < text.length) {
            const end = Math.min(i + chunkSize, text.length);
            chunks.push(text.slice(i, end));
            i += chunkSize - overlap;
            if (i >= text.length) break;
          }
          return chunks;
        }
        ```
2.  **Filepath**: `src/main/services/OllamaService.ts` (New File)
    -   **Action**: Create a service to handle all communication with Ollama. Implement an `embed` method.
    -   **Implementation**:
        ```typescript
        import fetch from 'node-fetch';
        import { logger } from '@/shared/logger';

        export class OllamaService {
          private baseUrl = 'http://127.0.0.1:11434';

          async generateEmbedding(text: string, model: string): Promise<number[]> {
            try {
              const response = await fetch(`${this.baseUrl}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: `search_document: ${text}` }),
              });
              if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
              const data = await response.json();
              return data.embedding;
            } catch (error) {
              logger.error({ error, model, text }, 'Failed to generate embedding from Ollama.');
              throw error; // Re-throw to be handled by the caller
            }
          }
        }
        ```
    -   **Imports**: `import fetch from 'node-fetch';`, `import { logger } from '@/shared/logger';`
3.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Integrate the chunking and embedding logic into the service.
    -   **Implementation**:
        ```typescript
        import { chunkText } from '../utils/textSplitter';
        import { OllamaService } from './OllamaService';
        import { getModelConfig } from '../config'; // Hypothetical config service

        export class ContextCompressionService {
          private ollamaService = new OllamaService();

          async processAndEmbed(message: any): Promise<{ chunk: string, embedding: number[] }[]> {
            const chunks = chunkText(message.content);
            const model = getModelConfig(message.modelId).ollamaModel; // Get the right model
            
            const embeddedChunks = [];
            for (const chunk of chunks) {
              const embedding = await this.ollamaService.generateEmbedding(chunk, model);
              embeddedChunks.push({ chunk, embedding });
            }
            return embeddedChunks;
          }
        }
        ```

**Acceptance Criteria:**
-   Text from a message is correctly chunked into segments of a configurable size.
-   The application can successfully generate embeddings for text chunks using the user-specified Ollama model.
-   The `search_document:` prefix is correctly used for the embedding request.
-   The system gracefully handles errors from the Ollama API (e.g., server down) and provides informative logs.
-   The generated embeddings are in the expected format and dimensionality (e.g., 768 for `nomic-embed-text`).

**Testing Plan:**
-   **Test Case 1 (Chunking)**: Provide a long text to `chunkText` and verify it produces the expected number of chunks with the correct content and overlap.
-   **Test Case 2 (Embedding Success)**: With a running Ollama instance, call `processAndEmbed` with a sample message. Verify it returns an array of objects, each with a `chunk` and an `embedding` array of numbers.
-   **Test Case 3 (Embedding Failure)**: Stop the Ollama server. Call `processAndEmbed`. Verify that an error is thrown and logged correctly.
-   **Test Case 4 (Model Not Found)**: Call `processAndEmbed` with a model name that doesn't exist. Verify the Ollama API error is caught and handled.
