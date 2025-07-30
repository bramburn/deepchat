import { describe, it, expect, beforeAll } from 'vitest'
import { countTokens, countMessageTokens, countSingleMessageTokens, isTokenizerAvailable } from '@/utils/tokenizer'
import { SimpleMessage } from '@/services/ContextCompressionService'

describe('Tokenizer', () => {
  beforeAll(() => {
    // Ensure tokenizer is available for tests
    if (!isTokenizerAvailable()) {
      console.warn('Tiktoken encoding not available, tests will use fallback estimates')
    }
  })

  describe('countTokens', () => {
    it('should count tokens for a simple string', () => {
      const text = 'Hello world'
      const tokenCount = countTokens(text)
      
      // "Hello world" should be approximately 2 tokens with tiktoken
      expect(tokenCount).toBeGreaterThan(0)
      expect(tokenCount).toBeLessThan(10) // Reasonable upper bound
    })

    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0)
    })

    it('should handle longer text', () => {
      const text = 'This is a longer piece of text that should have more tokens than a simple hello world example.'
      const tokenCount = countTokens(text)
      
      expect(tokenCount).toBeGreaterThan(10)
      expect(tokenCount).toBeLessThan(50) // Reasonable bounds
    })

    it('should handle special characters and punctuation', () => {
      const text = 'Hello, world! How are you? I\'m fine, thanks.'
      const tokenCount = countTokens(text)
      
      expect(tokenCount).toBeGreaterThan(5)
      expect(tokenCount).toBeLessThan(20)
    })
  })

  describe('countMessageTokens', () => {
    const mockMessages: SimpleMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello world',
        timestamp: '2023-01-01T00:00:00Z'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there! How can I help you today?',
        timestamp: '2023-01-01T00:01:00Z'
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'I need help with my project',
        timestamp: '2023-01-01T00:02:00Z'
      }
    ]

    it('should count tokens for multiple messages', () => {
      const totalTokens = countMessageTokens(mockMessages)
      
      // Should be sum of individual message tokens plus overhead
      expect(totalTokens).toBeGreaterThan(10)
      expect(totalTokens).toBeLessThan(50)
    })

    it('should return 0 for empty message array', () => {
      expect(countMessageTokens([])).toBe(0)
    })

    it('should handle messages with empty content', () => {
      const messagesWithEmpty: SimpleMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: '',
          timestamp: '2023-01-01T00:01:00Z'
        }
      ]

      const totalTokens = countMessageTokens(messagesWithEmpty)
      expect(totalTokens).toBeGreaterThan(0) // Should still count overhead for empty message
    })

    it('should be approximately equal to sum of individual message counts', () => {
      const totalTokens = countMessageTokens(mockMessages)
      const sumOfIndividual = mockMessages.reduce((sum, msg) => sum + countSingleMessageTokens(msg), 0)
      
      // Should be very close (within a small margin for rounding differences)
      expect(Math.abs(totalTokens - sumOfIndividual)).toBeLessThan(5)
    })
  })

  describe('countSingleMessageTokens', () => {
    it('should count tokens for a single message including overhead', () => {
      const message: SimpleMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello world',
        timestamp: '2023-01-01T00:00:00Z'
      }

      const tokenCount = countSingleMessageTokens(message)
      const contentTokens = countTokens(message.content)
      
      // Should be content tokens plus overhead (approximately 4 tokens)
      expect(tokenCount).toBeGreaterThanOrEqual(contentTokens)
      expect(tokenCount).toBeLessThanOrEqual(contentTokens + 10) // Reasonable overhead bound
    })

    it('should handle message with empty content', () => {
      const message: SimpleMessage = {
        id: 'msg-1',
        role: 'user',
        content: '',
        timestamp: '2023-01-01T00:00:00Z'
      }

      const tokenCount = countSingleMessageTokens(message)
      
      // Should still have overhead tokens even with empty content
      expect(tokenCount).toBeGreaterThan(0)
      expect(tokenCount).toBeLessThan(10)
    })
  })

  describe('isTokenizerAvailable', () => {
    it('should return a boolean indicating tokenizer availability', () => {
      const available = isTokenizerAvailable()
      expect(typeof available).toBe('boolean')
    })
  })
})
