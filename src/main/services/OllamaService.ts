import { ContextCompressionPresenter } from '../presenter/contextCompressionPresenter'

/**
 * Interface for Ollama embedding API response
 */
interface OllamaEmbeddingResponse {
  embedding: number[]
  model?: string
  prompt_eval_count?: number
  prompt_eval_duration?: number
}

/**
 * Interface for Ollama API error response
 */
interface OllamaErrorResponse {
  error: string
}

/**
 * Service for interacting with the Ollama API
 * Handles embedding generation and other Ollama-related operations
 */
export class OllamaService {
  private readonly defaultUrl = 'http://127.0.0.1:11434'
  private readonly timeout = 30000 // 30 seconds timeout

  /**
   * Gets the Ollama server URL
   * In the future, this could be configurable through settings
   * 
   * @returns string - The Ollama server URL
   */
  private getOllamaUrl(): string {
    // TODO: Make this configurable through settings
    return this.defaultUrl
  }

  /**
   * Generates an embedding vector for the given text using the configured Ollama model
   *
   * @param text - The text to generate an embedding for
   * @param type - Whether this is a 'query' or 'document' for embedding
   * @returns Promise<number[] | null> - The embedding vector or null if failed
   */
  public async generateEmbedding(text: string, type: 'document' | 'query' = 'document'): Promise<number[] | null> {
    try {
      // Get the configured Ollama model
      const model = ContextCompressionPresenter.getOllamaModel()
      if (!model) {
        console.warn('Cannot generate embedding: Ollama model not configured')
        return null
      }

      // Validate input
      if (!text || text.trim().length === 0) {
        console.warn('Cannot generate embedding: Empty text provided')
        return null
      }

      // Use appropriate prefix for nomic-embed-text model
      // search_document: for storing documents (chat history)
      // search_query: for queries when retrieving relevant context
      const prefix = type === 'query' ? 'search_query:' : 'search_document:'
      const prompt = `${prefix} ${text.trim()}`

      console.log(`Generating embedding for text (${text.length} chars) using model: ${model}`)
      console.log(`Using prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`)

      // Make the API request to Ollama
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.getOllamaUrl()}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Check if the response is successful
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Ollama API request failed with status ${response.status}`
        
        try {
          const errorData = JSON.parse(errorText) as OllamaErrorResponse
          errorMessage += `: ${errorData.error}`
        } catch {
          errorMessage += `: ${errorText}`
        }
        
        throw new Error(errorMessage)
      }

      // Parse the response
      const data = await response.json() as OllamaEmbeddingResponse

      // Debug: Log the actual response structure
      console.log('Ollama embedding response structure:', {
        hasEmbedding: !!data.embedding,
        embeddingType: typeof data.embedding,
        isArray: Array.isArray(data.embedding),
        embeddingLength: data.embedding ? data.embedding.length : 0,
        responseKeys: Object.keys(data),
        model: data.model
      })

      // Validate the response structure
      if (!data.embedding || !Array.isArray(data.embedding)) {
        console.error('Invalid Ollama response:', JSON.stringify(data, null, 2))
        throw new Error('Invalid response format: missing or invalid embedding array')
      }

      // Validate embedding dimensions
      if (data.embedding.length === 0) {
        throw new Error('Invalid response: empty embedding array')
      }

      console.log(`Successfully generated embedding with ${data.embedding.length} dimensions`)
      
      return data.embedding
    } catch (error) {
      console.error('Failed to generate embedding from Ollama:', {
        error: error instanceof Error ? error.message : String(error),
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        type
      })
      
      return null
    }
  }

  /**
   * Generates embeddings for multiple text chunks in parallel
   * This is more efficient than generating embeddings sequentially
   *
   * @param texts - Array of text chunks to generate embeddings for
   * @param type - Whether these are 'query' or 'document' embeddings
   * @returns Promise<(number[] | null)[]> - Array of embedding vectors (null for failed chunks)
   */
  public async generateEmbeddingsBatch(
    texts: string[],
    type: 'document' | 'query' = 'document'
  ): Promise<(number[] | null)[]> {
    if (!texts || texts.length === 0) {
      return []
    }

    console.log(`Generating embeddings for ${texts.length} text chunks in parallel`)

    try {
      // Generate embeddings in parallel for better performance
      const embeddingPromises = texts.map(text => this.generateEmbedding(text, type))
      const embeddings = await Promise.all(embeddingPromises)
      
      const successCount = embeddings.filter(embedding => embedding !== null).length
      console.log(`Successfully generated ${successCount}/${texts.length} embeddings`)
      
      return embeddings
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error)
      
      // Return array of nulls if batch processing fails
      return new Array(texts.length).fill(null)
    }
  }

  /**
   * Tests the connection to the Ollama server and validates the configured model
   * 
   * @returns Promise<boolean> - Whether the connection and model are valid
   */
  public async testConnection(): Promise<boolean> {
    try {
      const model = ContextCompressionPresenter.getOllamaModel()
      if (!model) {
        console.warn('Cannot test connection: Ollama model not configured')
        return false
      }

      console.log(`Testing Ollama connection and model: ${model}`)

      // Test with a simple embedding request
      const testEmbedding = await this.generateEmbedding('test', 'document')
      
      if (testEmbedding && testEmbedding.length > 0) {
        console.log(`Ollama connection test successful. Model ${model} is working.`)
        return true
      } else {
        console.warn(`Ollama connection test failed. Model ${model} may not be available.`)
        return false
      }
    } catch (error) {
      console.error('Ollama connection test failed:', error)
      return false
    }
  }

  /**
   * Gets information about the configured Ollama model
   * 
   * @returns Promise<any | null> - Model information or null if failed
   */
  public async getModelInfo(): Promise<any | null> {
    try {
      const model = ContextCompressionPresenter.getOllamaModel()
      if (!model) {
        return null
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.getOllamaUrl()}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: model }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get Ollama model info:', error)
      return null
    }
  }
}
