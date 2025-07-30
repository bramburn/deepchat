### Implementation Guidance: Sub-Sprint 3.1 - Message Chunking and Embedding

This guide provides technical direction for implementing the logic to chunk messages and generate vector embeddings using a local Ollama model.

**Objective:** To implement the core logic for chunking chat messages and generating embeddings using the user-configured Ollama model.

**1. Text Chunking Strategy:**
For context retrieval, it's crucial to split documents into meaningful, self-contained chunks. While a simple character-based split is a good start, a more advanced approach using a proper text splitter library is recommended for better semantic meaning.

-   **Recommended Library:** `langchain/text_splitter` (even if you don't use the rest of LangChain, its text splitters are robust and battle-tested).

**Installation:**
```bash
npm install langchain
```

**Implementation (`src/main/utils/textSplitter.ts`):**

```typescript
// src/main/utils/textSplitter.ts
import { RecursiveCharacterTextSplitter } from "langchain/text_splitters";
import { logger } from "@/shared/logger";

export async function createSemanticChunks(text: string, chunkSize: number = 512, chunkOverlap: number = 50): Promise<string[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
    const chunks = await splitter.splitText(text);
    return chunks;
  } catch (error) {
    logger.error({ error, text }, "Failed to create semantic chunks from text.");
    // Fallback to a simple split if the library fails
    return [text];
  }
}
```

**2. Dedicated Ollama Service:**
All interactions with the Ollama API should be centralized in a dedicated service. This makes the code cleaner, easier to test, and simplifies future updates (like adding support for different Ollama endpoints).

-   **File:** `src/main/services/OllamaService.ts` (Create this new file)
-   **Action:** Implement a class to handle embedding generation.

```typescript
// src/main/services/OllamaService.ts
import fetch from 'node-fetch';
import { logger } from '@/shared/logger';
import { ContextCompressionPresenter } from '@/main/presenter/contextCompressionPresenter'; // To get settings

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaService {
  private getOllamaUrl(): string {
    // In the future, this could be configurable
    return 'http://127.0.0.1:11434';
  }

  public async generateEmbedding(text: string): Promise<number[] | null> {
    const model = ContextCompressionPresenter.getOllamaModel(); // Get model from settings
    if (!model) {
      logger.warn('Cannot generate embedding, Ollama model not configured.');
      return null;
    }

    // Nomic recommends specific prefixes for query vs. document embeddings.
    const prompt = `search_document: ${text}`;

    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as OllamaEmbeddingResponse;
      return data.embedding;
    } catch (error) {
      logger.error({ error, model, prompt }, 'Failed to generate embedding from Ollama.');
      return null;
    }
  }
}
```

**3. Integrating into `ContextCompressionService`:**
The main service will coordinate the process of receiving a message, chunking it, and then passing each chunk to the `OllamaService` to get an embedding.

-   **File:** `src/main/services/ContextCompressionService.ts`
-   **Action:** Update the service to use the new chunker and Ollama service.

```typescript
// src/main/services/ContextCompressionService.ts
import { createSemanticChunks } from '@/main/utils/textSplitter';
import { OllamaService } from './OllamaService';
import { ChatMessage } from '@/shared/chat.d';

interface EmbeddedChunk {
  text: string;
  embedding: number[];
  sourceMessageId: string;
}

export class ContextCompressionService {
  private ollamaService: OllamaService;

  constructor() {
    this.ollamaService = new OllamaService();
    // ...
  }

  public async embedAndPrepareMessage(message: ChatMessage): Promise<EmbeddedChunk[]> {
    const chunks = await createSemanticChunks(message.content);
    const preparedData: EmbeddedChunk[] = [];

    for (const chunk of chunks) {
      const embedding = await this.ollamaService.generateEmbedding(chunk);
      if (embedding) {
        preparedData.push({
          text: chunk,
          embedding,
          sourceMessageId: message.id,
        });
      }
    }

    return preparedData;
  }
  // ... other methods
}
```

**4. Key Considerations:**
-   **Embedding Prefixes:** The `nomic-embed-text` model, a strong open-source choice, performs best when you add a prefix to the text. For storing documents (chat history), use `search_document: `. When you later create a query to find relevant history, you will use `search_query: `.
-   **Error Handling:** If the Ollama API call fails for one chunk, should the whole process stop? A robust implementation might retry once or twice, or log the error and continue with the successful chunks.
-   **Concurrency:** For long messages that produce many chunks, generating embeddings sequentially can be slow. Use `Promise.all` to run the embedding requests in parallel to improve performance.
    ```javascript
    // Example of parallel processing
    const embeddingPromises = chunks.map(chunk => this.ollamaService.generateEmbedding(chunk));
    const embeddings = await Promise.all(embeddingPromises);
    ```
