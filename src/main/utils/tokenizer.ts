import { get_encoding } from 'tiktoken'
import { SimpleMessage } from '../services/ContextCompressionService'

let encoding: any = null

try {
  // cl100k_base is the encoding used by gpt-4, gpt-3.5-turbo, and text-embedding-ada-002
  encoding = get_encoding('cl100k_base')
} catch (e) {
  console.error('Failed to load tiktoken encoding:', e)
}

/**
 * Counts the number of tokens in a text string using tiktoken
 * 
 * @param text - The text to count tokens for
 * @returns The number of tokens, or 0 if encoding failed
 */
export function countTokens(text: string): number {
  if (!encoding || !text) {
    return 0
  }
  
  try {
    return encoding.encode(text).length
  } catch (e) {
    console.error('Failed to encode text for token counting:', e)
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4)
  }
}

/**
 * Calculates the total token count for an array of messages
 * This is a simplified version; a more accurate one would account for extra tokens per message/role
 * 
 * @param messages - Array of SimpleMessage objects
 * @returns Total token count for all messages
 */
export function countMessageTokens(messages: SimpleMessage[]): number {
  if (!encoding) {
    // Fallback: rough estimate of 1 token per 4 characters
    return messages.reduce((acc, msg) => acc + Math.ceil((msg.content?.length || 0) / 4), 0)
  }
  
  let total = 0
  for (const message of messages) {
    if (message.content) {
      total += countTokens(message.content)
      // Add a small overhead for role and formatting (approximately 3-4 tokens per message)
      total += 4
    }
  }
  return total
}

/**
 * Estimates token count for a single message including role overhead
 * 
 * @param message - A SimpleMessage object
 * @returns Estimated token count for the message
 */
export function countSingleMessageTokens(message: SimpleMessage): number {
  const contentTokens = countTokens(message.content || '')
  // Add overhead for role and message formatting
  return contentTokens + 4
}

/**
 * Checks if tiktoken encoding is available
 * 
 * @returns true if tiktoken is properly initialized
 */
export function isTokenizerAvailable(): boolean {
  return encoding !== null
}
