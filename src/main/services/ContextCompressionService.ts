import { Message } from '@shared/chat'
import { CONVERSATION } from '@shared/presenter'
import { createSemanticChunks, extractTextFromMessage, estimateTokenCount } from '../utils/textSplitter'
import { OllamaService } from './OllamaService'
import { PineconeService } from './PineconeService'
// Remove the Vector import as it's not exported in the current version
import { v4 as uuidv4 } from 'uuid'

/**
 * Interface for embedded text chunks
 */
interface EmbeddedChunk {
  text: string
  embedding: number[]
  sourceMessageId: string
  chunkIndex: number
  tokenCount: number
}

/**
 * Interface for chat vector metadata stored in Pinecone
 */
interface ChatVectorMetadata extends Record<string, any> {
  text: string
  sourceMessageId: string
  role: 'user' | 'assistant'
  timestamp: string
  chunkIndex: number
  tokenCount: number
}

/**
 * Interface for Pinecone vector
 */
interface PineconeVector {
  id: string
  values: number[]
  metadata?: ChatVectorMetadata
}

/**
 * Context Compression Service
 * 
 * This service handles the compression of conversation context using vector embeddings
 * and Pinecone storage for long-term memory capabilities.
 * 
 * In this initial implementation, it serves as a placeholder that logs its activity.
 * Future sprints will implement the full embedding and vector storage functionality.
 */
export class ContextCompressionService {
  private ollamaService: OllamaService
  private pineconeService: PineconeService

  constructor() {
    console.log('Context Compression Service has been initialized.')
    this.ollamaService = new OllamaService()
    this.pineconeService = PineconeService.getInstance()
  }

  /**
   * Processes conversation context using the context compression strategy.
   * 
   * In this initial sprint, it acts as a placeholder that returns the original context.
   * In future sprints (3.1 and 3.2), this will:
   * 1. Generate embeddings for the conversation history
   * 2. Query Pinecone for relevant historical context
   * 3. Construct a compressed context with relevant memories
   * 4. Return optimized message list within token limits
   * 
   * @param conversation - The conversation object containing settings and metadata
   * @param contextMessages - Array of messages from conversation history
   * @param userMessage - The current user message being processed
   * @param remainingContextLength - Available token budget for context
   * @returns Promise<Message[]> - Processed context messages
   */
  public async processContext(
    conversation: CONVERSATION,
    contextMessages: Message[],
    userMessage: Message,
    remainingContextLength: number
  ): Promise<Message[]> {
    console.log(`Processing context for conversation ${conversation.id} with compression strategy.`)
    console.log(`Available context length: ${remainingContextLength} tokens`)
    console.log(`Input context messages: ${contextMessages.length}`)

    // Sprint 3.2: Full context compression with Pinecone vector storage and retrieval

    try {
      // Step 1: Process and store recent messages for future retrieval
      const recentMessages = contextMessages.slice(-3) // Process last 3 messages for embedding

      for (const message of recentMessages) {
        const embeddedChunks = await this.embedAndPrepareMessage(message)
        if (embeddedChunks.length > 0) {
          // Store embedded chunks in Pinecone for future retrieval
          await this.storeEmbeddedChunks(conversation.id, embeddedChunks, message)
        }
      }

      // Step 2: Generate query embedding for the current user message
      const userMessageText = extractTextFromMessage(userMessage)
      if (userMessageText) {
        const queryEmbedding = await this.ollamaService.generateEmbedding(userMessageText, true)

        if (queryEmbedding) {
          // Step 3: Retrieve relevant historical context from Pinecone
          const relevantContext = await this.retrieveRelevantContext(
            conversation.id,
            queryEmbedding,
            3 // Get top 3 most relevant chunks
          )

          if (relevantContext.length > 0) {
            console.log(`Retrieved ${relevantContext.length} relevant context chunks from vector storage`)

            // Step 4: Create synthetic messages from relevant context
            const contextMessage: Message = {
              id: `context-${Date.now()}`,
              role: 'assistant',
              content: [{
                type: 'content',
                content: `Relevant context from conversation history:\n\n${relevantContext.join('\n\n')}`
              }],
              timestamp: Date.now(),
              conversationId: conversation.id,
              status: 'sent'
            } as Message

            // Add the context message to the beginning of selected messages
            const contextMessages = [contextMessage]

            // Add some recent messages for immediate context
            const recentContextMessages = this.selectRecentMessages(
              contextMessages,
              userMessage,
              remainingContextLength - this.estimateMessageTokens(contextMessage)
            )

            const finalMessages = [...contextMessages, ...recentContextMessages]
            console.log(`Context compression: Using ${finalMessages.length} messages (${contextMessages.length} from vector storage + ${recentContextMessages.length} recent)`)

            return finalMessages
          }
        }
      }

      console.log('No relevant context found in vector storage, falling back to recent message selection')

    } catch (error) {
      console.error('Failed to process context compression with vector storage:', error)
      console.log('Falling back to truncation strategy')
    }
    
    if (remainingContextLength <= 0) {
      console.log('No remaining context length, returning empty context')
      return []
    }

    // Filter out the current user message from context (it will be added separately)
    const messages = contextMessages.filter((msg) => msg.id !== userMessage?.id).reverse()

    let currentLength = 0
    const selectedMessages: Message[] = []

    // Simple token-based selection (will be replaced with vector similarity in Sprint 3)
    for (const message of messages) {
      const messageTokens = this.estimateMessageTokens(message)
      
      if (currentLength + messageTokens <= remainingContextLength) {
        selectedMessages.unshift(message)
        currentLength += messageTokens
      } else {
        break
      }
    }

    console.log(`Context compression selected ${selectedMessages.length} messages using ${currentLength} tokens`)
    
    // TODO: In Sprint 3.1 and 3.2, replace this with:
    // 1. Generate embedding for the user message query
    // 2. Query Pinecone for semantically similar historical messages
    // 3. Combine recent messages with relevant historical context
    // 4. Optimize for both recency and semantic relevance
    
    return selectedMessages
  }

  /**
   * Selects recent messages that fit within the token limit
   * This is used as fallback or to supplement vector-retrieved context
   *
   * @param contextMessages - Available context messages
   * @param userMessage - Current user message
   * @param remainingTokens - Available token budget
   * @returns Message[] - Selected recent messages
   */
  private selectRecentMessages(
    contextMessages: Message[],
    userMessage: Message,
    remainingTokens: number
  ): Message[] {
    if (remainingTokens <= 0) {
      return []
    }

    // Filter out the current user message and reverse for recency
    const messages = contextMessages.filter((msg) => msg.id !== userMessage?.id).reverse()

    let currentLength = 0
    const selectedMessages: Message[] = []

    for (const message of messages) {
      const messageTokens = this.estimateMessageTokens(message)

      if (currentLength + messageTokens <= remainingTokens) {
        selectedMessages.unshift(message)
        currentLength += messageTokens
      } else {
        break
      }
    }

    return selectedMessages
  }

  /**
   * Estimates the token count for a message
   * This is a simplified estimation that will be improved in future sprints
   *
   * @param message - The message to estimate tokens for
   * @returns number - Estimated token count
   */
  private estimateMessageTokens(message: Message): number {
    // Simple estimation based on character count
    // In production, this should use a proper tokenizer
    let content = ''

    if (message.role === 'user') {
      const userContent = message.content as any
      content = userContent.text || ''
    } else if (message.role === 'assistant') {
      const assistantContent = message.content as any[]
      content = assistantContent
        .filter(block => block.type === 'content')
        .map(block => block.content)
        .join(' ')
    }

    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(content.length / 4)
  }

  /**
   * Processes a message by chunking its content and generating embeddings
   * This is the main method for preparing messages for vector storage
   *
   * @param message - The message to process
   * @returns Promise<EmbeddedChunk[]> - Array of embedded text chunks
   */
  public async embedAndPrepareMessage(message: Message): Promise<EmbeddedChunk[]> {
    console.log(`Processing message ${message.id} for embedding`)

    try {
      // Extract text content from the message
      const textContent = extractTextFromMessage(message)

      if (!textContent || textContent.trim().length === 0) {
        console.log(`Message ${message.id} has no text content, skipping embedding`)
        return []
      }

      console.log(`Extracted ${textContent.length} characters from message ${message.id}`)

      // Create semantic chunks from the text
      const chunks = await createSemanticChunks(textContent)

      if (chunks.length === 0) {
        console.log(`No chunks created from message ${message.id}`)
        return []
      }

      console.log(`Created ${chunks.length} chunks from message ${message.id}`)

      // Generate embeddings for all chunks in parallel
      const embeddings = await this.ollamaService.generateEmbeddingsBatch(chunks, false)

      // Combine chunks with their embeddings
      const embeddedChunks: EmbeddedChunk[] = []

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]

        if (embedding && embedding.length > 0) {
          embeddedChunks.push({
            text: chunk,
            embedding,
            sourceMessageId: message.id,
            chunkIndex: i,
            tokenCount: estimateTokenCount(chunk)
          })
        } else {
          console.warn(`Failed to generate embedding for chunk ${i} of message ${message.id}`)
        }
      }

      console.log(`Successfully embedded ${embeddedChunks.length}/${chunks.length} chunks from message ${message.id}`)

      return embeddedChunks
    } catch (error) {
      console.error(`Failed to embed and prepare message ${message.id}:`, error)
      return []
    }
  }

  /**
   * Stores embedded chunks in Pinecone vector database
   * Each conversation gets its own namespace for data isolation
   *
   * @param conversationId - The conversation ID to use as namespace
   * @param embeddedChunks - Array of embedded chunks to store
   * @param message - The original message for metadata
   * @returns Promise<boolean> - Whether storage was successful
   */
  public async storeEmbeddedChunks(
    conversationId: string,
    embeddedChunks: EmbeddedChunk[],
    message: Message
  ): Promise<boolean> {
    try {
      if (!embeddedChunks || embeddedChunks.length === 0) {
        console.log('No embedded chunks to store')
        return true
      }

      console.log(`Storing ${embeddedChunks.length} embedded chunks for conversation ${conversationId}`)

      // Convert embedded chunks to Pinecone vectors
      const vectors: PineconeVector[] = embeddedChunks.map(chunk => ({
        id: uuidv4(), // Generate unique ID for each vector
        values: chunk.embedding,
        metadata: {
          text: chunk.text,
          sourceMessageId: chunk.sourceMessageId,
          role: message.role,
          timestamp: new Date(message.timestamp).toISOString(),
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount
        }
      }))

      // Store vectors in Pinecone using conversation ID as namespace
      await this.pineconeService.upsertVectors(conversationId, vectors)

      console.log(`Successfully stored ${vectors.length} vectors for conversation ${conversationId}`)
      return true
    } catch (error) {
      console.error('Failed to store embedded chunks in Pinecone:', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        chunkCount: embeddedChunks?.length || 0
      })
      return false
    }
  }

  /**
   * Retrieves relevant context from Pinecone based on query embedding
   * This is used to find semantically similar historical messages
   *
   * @param conversationId - The conversation ID namespace to search in
   * @param queryEmbedding - The embedding vector to find similar content for
   * @param topK - Number of similar chunks to retrieve (default: 5)
   * @returns Promise<string[]> - Array of relevant text chunks
   */
  public async retrieveRelevantContext(
    conversationId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<string[]> {
    try {
      console.log(`Retrieving top ${topK} relevant context chunks for conversation ${conversationId}`)

      // Query Pinecone for similar vectors
      const queryResponse = await this.pineconeService.queryVectors(
        conversationId,
        queryEmbedding,
        topK,
        true // Include metadata
      )

      // Extract text from the results
      const relevantTexts: string[] = []

      if (queryResponse.matches) {
        for (const match of queryResponse.matches) {
          if (match.metadata && match.metadata.text && match.score && match.score > 0.7) {
            // Only include high-confidence matches (score > 0.7)
            relevantTexts.push(match.metadata.text)
          }
        }
      }

      console.log(`Retrieved ${relevantTexts.length} relevant context chunks with high confidence`)
      return relevantTexts
    } catch (error) {
      console.error('Failed to retrieve relevant context from Pinecone:', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        topK
      })
      return []
    }
  }

  /**
   * Checks if context compression is properly configured
   * This validates that both Ollama and Pinecone are available and working
   *
   * @returns Promise<boolean> - Whether compression is ready to use
   */
  public async isConfigured(): Promise<boolean> {
    try {
      console.log('Checking context compression configuration')

      // Test Ollama connection and model availability
      const ollamaReady = await this.ollamaService.testConnection()

      if (!ollamaReady) {
        console.warn('Context compression not configured: Ollama connection failed')
        return false
      }

      // Test Pinecone connection
      const pineconeReady = await this.pineconeService.testConnection()

      if (!pineconeReady) {
        console.warn('Context compression not configured: Pinecone connection failed')
        return false
      }

      console.log('Context compression is properly configured (Ollama + Pinecone)')
      return true
    } catch (error) {
      console.error('Failed to check context compression configuration:', error)
      return false
    }
  }

  /**
   * Deletes all vectors associated with a conversation from Pinecone
   * This should be called when a conversation thread is deleted
   *
   * @param conversationId - The conversation ID to delete vectors for
   * @returns Promise<boolean> - Whether deletion was initiated (always true since PineconeService handles errors gracefully)
   */
  public async deleteConversationVectors(conversationId: string): Promise<boolean> {
    console.log(`Initiating deletion of all vectors for conversation ${conversationId}`)

    // PineconeService.deleteNamespace is now fire-and-forget and handles all errors internally
    // It will not throw errors, so we can safely call it without try-catch
    await this.pineconeService.deleteNamespace(conversationId)

    console.log(`Vector deletion request initiated for conversation ${conversationId}`)
    return true // Always return true since the service handles errors gracefully
  }

  /**
   * Logs compression strategy usage for monitoring and debugging
   *
   * @param conversationId - ID of the conversation
   * @param strategy - The strategy used ('compression' or 'truncation')
   * @param messageCount - Number of messages processed
   * @param tokenCount - Number of tokens used
   */
  public logStrategyUsage(
    conversationId: string,
    strategy: 'compression' | 'truncation',
    messageCount: number,
    tokenCount: number
  ): void {
    console.log(`Context Strategy: ${strategy} | Conversation: ${conversationId} | Messages: ${messageCount} | Tokens: ${tokenCount}`)
  }
}
