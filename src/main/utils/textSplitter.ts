/**
 * Creates semantic chunks from text using a custom recursive text splitter
 *
 * This function splits text into meaningful chunks that preserve semantic meaning
 * while respecting token limits for embedding generation.
 *
 * @param text - The text to be chunked
 * @param chunkSize - Maximum size of each chunk in characters (default: 512)
 * @param chunkOverlap - Number of characters to overlap between chunks (default: 50)
 * @returns Promise<string[]> - Array of text chunks
 */
export async function createSemanticChunks(
  text: string,
  chunkSize: number = 512,
  chunkOverlap: number = 50
): Promise<string[]> {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      console.log('Empty text provided to createSemanticChunks, returning empty array')
      return []
    }

    // If text is shorter than chunk size, return as single chunk
    if (text.length <= chunkSize) {
      console.log(`Text length (${text.length}) is within chunk size (${chunkSize}), returning as single chunk`)
      return [text.trim()]
    }

    console.log(`Chunking text of length ${text.length} with chunk size ${chunkSize} and overlap ${chunkOverlap}`)

    // Use our custom recursive text splitter
    const chunks = recursiveTextSplit(text, chunkSize, chunkOverlap)

    // Filter out empty chunks and trim whitespace
    const cleanedChunks = chunks
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 0)

    console.log(`Successfully created ${cleanedChunks.length} chunks from text`)

    return cleanedChunks
  } catch (error) {
    console.error('Failed to create semantic chunks from text:', error)

    // Fallback to simple splitting
    console.log('Falling back to simple text splitting')
    return fallbackTextSplit(text, chunkSize, chunkOverlap)
  }
}

/**
 * Custom recursive text splitter that tries to split on semantic boundaries
 *
 * @param text - The text to be chunked
 * @param chunkSize - Maximum size of each chunk in characters
 * @param chunkOverlap - Number of characters to overlap between chunks
 * @returns string[] - Array of text chunks
 */
function recursiveTextSplit(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', '']

  function splitTextRecursive(text: string, separators: string[]): string[] {
    const finalChunks: string[] = []

    // If text is small enough, return as is
    if (text.length <= chunkSize) {
      return [text]
    }

    // Try each separator in order
    for (const separator of separators) {
      if (separator === '') {
        // Last resort: character-based splitting
        return fallbackTextSplit(text, chunkSize, chunkOverlap)
      }

      if (text.includes(separator)) {
        const splits = text.split(separator)
        let currentChunk = ''

        for (const split of splits) {
          const testChunk = currentChunk + (currentChunk ? separator : '') + split

          if (testChunk.length <= chunkSize) {
            currentChunk = testChunk
          } else {
            if (currentChunk) {
              finalChunks.push(currentChunk)
              // Add overlap from the end of current chunk
              const overlapText = currentChunk.slice(-chunkOverlap)
              currentChunk = overlapText + separator + split
            } else {
              // Single split is too large, recursively split it
              const subChunks = splitTextRecursive(split, separators.slice(1))
              finalChunks.push(...subChunks)
            }
          }
        }

        if (currentChunk) {
          finalChunks.push(currentChunk)
        }

        return finalChunks
      }
    }

    return [text]
  }

  return splitTextRecursive(text, separators)
}

/**
 * Fallback text splitting function that uses simple character-based chunking
 * Used when recursive splitting fails
 *
 * @param text - The text to be chunked
 * @param chunkSize - Maximum size of each chunk in characters
 * @param chunkOverlap - Number of characters to overlap between chunks
 * @returns string[] - Array of text chunks
 */
function fallbackTextSplit(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const chunks: string[] = []
  let i = 0

  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length)
    const chunk = text.slice(i, end).trim()
    
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    
    // Move forward by chunk size minus overlap
    i += chunkSize - chunkOverlap
    
    // Prevent infinite loop
    if (i >= text.length) break
  }

  console.log(`Fallback splitting created ${chunks.length} chunks`)
  return chunks
}

/**
 * Extracts text content from a chat message for chunking
 * Handles different message types (user, assistant) and content formats
 * 
 * @param message - The chat message object
 * @returns string - Extracted text content
 */
export function extractTextFromMessage(message: any): string {
  try {
    if (!message || !message.content) {
      return ''
    }

    // Handle user messages
    if (message.role === 'user') {
      const content = message.content
      
      // If content has a text property, use it
      if (content.text) {
        return content.text
      }
      
      // If content is an array, extract text from content blocks
      if (Array.isArray(content.content)) {
        return content.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join(' ')
      }
      
      // If content is a string, use it directly
      if (typeof content === 'string') {
        return content
      }
    }

    // Handle assistant messages
    if (message.role === 'assistant') {
      const content = message.content
      
      // If content is an array of blocks, extract text content
      if (Array.isArray(content)) {
        return content
          .filter((block: any) => block.type === 'content')
          .map((block: any) => block.content)
          .join(' ')
      }
      
      // If content is a string, use it directly
      if (typeof content === 'string') {
        return content
      }
    }

    // Fallback: try to stringify the content
    return JSON.stringify(message.content)
  } catch (error) {
    console.error('Failed to extract text from message:', error)
    return ''
  }
}

/**
 * Estimates the token count for a text chunk
 * This is a rough estimation used for planning and logging
 * 
 * @param text - The text to estimate tokens for
 * @returns number - Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a simplified approach; in production, use a proper tokenizer
  return Math.ceil(text.length / 4)
}
