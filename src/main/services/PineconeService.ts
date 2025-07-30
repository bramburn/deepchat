import { Pinecone, Index } from '@pinecone-database/pinecone'
import { ContextCompressionPresenter } from '../presenter/contextCompressionPresenter'

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
 * Service for interacting with the Pinecone vector database
 * Handles storage and retrieval of conversation embeddings
 */
export class PineconeService {
  private static instance: PineconeService
  private pinecone: Pinecone | null = null
  private index: Index<ChatVectorMetadata> | null = null
  private readonly indexName = 'deepchat-context-history'

  /**
   * Singleton pattern to ensure only one Pinecone client is active
   * This prevents multiple connections and potential rate limiting issues
   */
  public static getInstance(): PineconeService {
    if (!PineconeService.instance) {
      PineconeService.instance = new PineconeService()
    }
    return PineconeService.instance
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    console.log('PineconeService instance created')
  }

  /**
   * Initializes the Pinecone client and index connection
   * This method is called automatically before any operations
   * 
   * @private
   */
  private async initialize(): Promise<void> {
    // If already initialized, do nothing
    if (this.index) {
      return
    }

    try {
      console.log('Initializing Pinecone client...')

      // Get credentials from the ContextCompressionPresenter
      const apiKey = ContextCompressionPresenter.getDecryptedApiKey()

      if (!apiKey) {
        throw new Error('Cannot initialize Pinecone: API key not configured')
      }

      // Create Pinecone client
      this.pinecone = new Pinecone({
        apiKey
      })

      // Get index reference
      this.index = this.pinecone.index<ChatVectorMetadata>(this.indexName)
      
      console.log(`Pinecone client initialized successfully for index: ${this.indexName}`)
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error)
      throw error
    }
  }

  /**
   * Upserts vectors into a specific namespace in the Pinecone index
   * Each conversation thread gets its own namespace for data isolation
   *
   * @param namespace - The namespace (typically thread ID) to store vectors in
   * @param vectors - Array of vectors with embeddings and metadata
   * @returns Promise<void>
   */
  public async upsertVectors(
    namespace: string,
    vectors: PineconeVector[]
  ): Promise<void> {
    try {
      // Ensure Pinecone is initialized
      await this.initialize()

      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      if (!vectors || vectors.length === 0) {
        console.log('No vectors to upsert, skipping operation')
        return
      }

      console.log(`Upserting ${vectors.length} vectors into namespace: ${namespace}`)

      // Validate vectors before upserting
      this.validateVectors(vectors)

      // Upsert vectors to the specified namespace
      await this.index.namespace(namespace).upsert(vectors)

      console.log(`Successfully upserted ${vectors.length} vectors to namespace: ${namespace}`)
    } catch (error) {
      console.error('Failed to upsert vectors to Pinecone:', {
        error: error instanceof Error ? error.message : String(error),
        namespace,
        vectorCount: vectors?.length || 0
      })
      
      // Re-throw to allow caller to handle the failure
      throw error
    }
  }

  /**
   * Queries the Pinecone index for similar vectors
   * This will be used to retrieve relevant context for conversations
   * 
   * @param namespace - The namespace to query (typically thread ID)
   * @param queryVector - The embedding vector to find similar vectors for
   * @param topK - Number of similar vectors to return (default: 10)
   * @param includeMetadata - Whether to include metadata in results (default: true)
   * @returns Promise with query results
   */
  public async queryVectors(
    namespace: string,
    queryVector: number[],
    topK: number = 10,
    includeMetadata: boolean = true
  ): Promise<any> {
    try {
      await this.initialize()

      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      console.log(`Querying ${topK} similar vectors in namespace: ${namespace}`)

      const queryResponse = await this.index.namespace(namespace).query({
        vector: queryVector,
        topK,
        includeMetadata
      })

      console.log(`Found ${queryResponse.matches?.length || 0} similar vectors`)
      
      return queryResponse
    } catch (error) {
      console.error('Failed to query vectors from Pinecone:', {
        error: error instanceof Error ? error.message : String(error),
        namespace,
        topK
      })
      
      throw error
    }
  }

  /**
   * Deletes all vectors in a specific namespace
   * This will be used when a conversation thread is deleted
   * This is a fire-and-forget operation that handles errors gracefully
   *
   * @param namespace - The namespace to delete (typically thread ID)
   * @returns Promise<void>
   */
  public async deleteNamespace(namespace: string): Promise<void> {
    try {
      // Ensure the client is ready before attempting an operation
      await this.initialize()

      // If initialization failed (e.g., no credentials), index will be null
      if (!this.index) {
        console.warn(`Skipping deletion: Pinecone service is not initialized for namespace: ${namespace}`)
        return
      }

      console.log(`Sending request to Pinecone to delete all vectors in namespace: ${namespace}`)

      // The core Pinecone SDK call - this is idempotent and won't error for non-existent namespaces
      await this.index.namespace(namespace).deleteAll()

      console.log(`Pinecone deletion request for namespace completed successfully: ${namespace}`)
    } catch (error) {
      // Catch any errors from the API call, log them, but do not crash the app
      // This is a background task, and its failure should not impact the user directly
      console.error('An error occurred during Pinecone namespace deletion:', {
        error: error instanceof Error ? error.message : String(error),
        namespace
      })

      // Do NOT re-throw the error - this is a fire-and-forget background cleanup task
    }
  }

  /**
   * Tests the connection to Pinecone and validates the index exists
   * 
   * @returns Promise<boolean> - Whether the connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Pinecone connection...')
      
      await this.initialize()

      if (!this.pinecone || !this.index) {
        return false
      }

      // Try to get index stats to verify connection
      const stats = await this.index.describeIndexStats()
      
      console.log('Pinecone connection test successful:', {
        indexName: this.indexName,
        dimension: stats.dimension,
        totalRecordCount: stats.totalRecordCount
      })
      
      return true
    } catch (error) {
      console.error('Pinecone connection test failed:', error)
      return false
    }
  }

  /**
   * Gets statistics about the Pinecone index
   * 
   * @returns Promise with index statistics
   */
  public async getIndexStats(): Promise<any> {
    try {
      await this.initialize()

      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      const stats = await this.index.describeIndexStats()
      return stats
    } catch (error) {
      console.error('Failed to get Pinecone index stats:', error)
      throw error
    }
  }

  /**
   * Validates vector format before upserting
   *
   * @private
   * @param vectors - Vectors to validate
   */
  private validateVectors(vectors: PineconeVector[]): void {
    for (const vector of vectors) {
      if (!vector.id || typeof vector.id !== 'string') {
        throw new Error('Vector must have a valid string ID')
      }
      
      if (!vector.values || !Array.isArray(vector.values) || vector.values.length === 0) {
        throw new Error('Vector must have valid embedding values')
      }
      
      if (!vector.metadata || !vector.metadata.text || !vector.metadata.sourceMessageId) {
        throw new Error('Vector must have valid metadata with text and sourceMessageId')
      }
    }
  }
}
