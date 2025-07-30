### User Story: Semantic Search for Relevant Context

**As a** Power User, **I want** the application to perform a semantic search on my conversation history before sending a prompt, **so that** the LLM receives the most relevant past context to better inform its response.

**Workflow:**
1.  The user sends a new message.
2.  The `ContextCompressionService` takes the new message text.
3.  It calls the `OllamaService` to generate an embedding for the message, making sure to use the `search_query:` prefix.
4.  It then calls the `PineconeService` with this new embedding.
5.  The `PineconeService` queries the correct namespace for the current thread, asking for the top N most similar vectors.
6.  The service extracts the original text from the metadata of the results.
7.  This list of relevant historical text chunks is returned to the `ContextCompressionService`.

**File Changes:**
-   **Modify**: `src/main/services/OllamaService.ts`
-   **Modify**: `src/main/services/PineconeService.ts`
-   **Modify**: `src/main/services/ContextCompressionService.ts`

**Actions to Undertake:**
1.  **Filepath**: `src/main/services/OllamaService.ts`
    -   **Action**: Modify the `generateEmbedding` method to accept an optional `type` parameter.
    -   **Implementation**:
        ```typescript
        public async generateEmbedding(text: string, type: 'document' | 'query'): Promise<number[] | null> {
          const prefix = type === 'query' ? 'search_query:' : 'search_document:';
          const prompt = `${prefix} ${text}`;
          // ... rest of the existing implementation
        }
        ```
2.  **Filepath**: `src/main/services/PineconeService.ts`
    -   **Action**: Add a new `query` method to the service.
    -   **Implementation**:
        ```typescript
        public async queryNamespace(namespace: string, vector: number[], topK: number): Promise<string[]> {
          await this.initialize();
          try {
            const queryResponse = await this.index!.namespace(namespace).query({
              vector,
              topK,
              includeMetadata: true,
            });
            // Extract the original text from metadata
            return queryResponse.matches.map(match => match.metadata?.text || '');
          } catch (error) {
            logger.error({ error, namespace }, 'Failed to query Pinecone.');
            return []; // Return empty array on error
          }
        }
        ```
3.  **Filepath**: `src/main/services/ContextCompressionService.ts`
    -   **Action**: Create a new method to orchestrate the search.
    -   **Implementation**:
        ```typescript
        public async retrieveRelevantContext(threadId: string, currentMessage: string): Promise<string[]> {
          // 1. Embed the user's query
          const queryEmbedding = await this.ollamaService.generateEmbedding(currentMessage, 'query');
          if (!queryEmbedding) return [];

          // 2. Query Pinecone
          const topK = 5; // This should be configurable
          const retrievedChunks = await this.pineconeService.queryNamespace(threadId, queryEmbedding, topK);
          
          logger.info({ threadId, count: retrievedChunks.length }, 'Retrieved context from Pinecone.');
          return retrievedChunks;
        }
        ```
4.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Integrate the new retrieval step into the main conversation flow.
    -   **Implementation**:
        ```typescript
        // In the main message handling function
        if (modelConfig?.contextCompressionEnabled) {
          // This now happens *before* calling the LLM
          const retrievedContext = await this.compressionService.retrieveRelevantContext(thread.id, newMessage.content);
          // ... logic to combine this with recent messages (Sprint 6)
        } else {
          // ... existing truncation logic
        }
        ```

**Acceptance Criteria:**
-   The user's message is correctly embedded with the `search_query:` prefix.
-   The Pinecone query returns the expected number of results (`topK`).
-   The retrieved results are semantically similar to the user's query.
-   The function returns a clean list of text chunks from the conversation history.
-   The process is completed within an acceptable latency for a chat application (e.g., <500ms).

**Testing Plan:**
-   **Test Case 1 (Prefix Check)**: In the `OllamaService` test, verify that calling `generateEmbedding` with `type: 'query'` adds the correct prefix to the prompt.
-   **Test Case 2 (Pinecone Query)**: In the `PineconeService` test, mock the `query` API call and verify your `queryNamespace` method returns the `text` from the mocked metadata.
-   **Test Case 3 (End-to-End Retrieval)**: Write an integration test for `ContextCompressionService.retrieveRelevantContext` that mocks both the Ollama and Pinecone services and verifies the correct flow of data.
-   **Test Case 4 (Manual Verification)**: Manually create a conversation, then send a new message that is clearly related to an older message. Check the logs to see if the older message's text is retrieved.
