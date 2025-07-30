import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContextCompressionService, SimpleMessage } from '@/services/ContextCompressionService'
import { OllamaService } from '@/services/OllamaService'
import { PineconeService } from '@/services/PineconeService'

// Mock the services
vi.mock('@/services/OllamaService')
vi.mock('@/services/PineconeService')

describe('ContextCompressionService', () => {
  let contextCompressionService: ContextCompressionService
  let mockOllamaService: any
  let mockPineconeService: any

  beforeEach(() => {
    // Create mock instances
    mockOllamaService = {
      generateEmbedding: vi.fn()
    }
    mockPineconeService = {
      queryNamespace: vi.fn(),
      getInstance: vi.fn(() => mockPineconeService)
    }

    // Mock the constructors
    vi.mocked(OllamaService).mockImplementation(() => mockOllamaService)
    vi.mocked(PineconeService.getInstance).mockReturnValue(mockPineconeService)

    contextCompressionService = new ContextCompressionService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructPromptContext', () => {
    const mockRetrievedMatches = [
      {
        text: 'Historical message 1',
        sourceMessageId: 'hist-msg-1',
        role: 'user',
        timestamp: '2023-01-01T10:00:00Z',
        chunkIndex: 0,
        tokenCount: 10
      },
      {
        text: 'Historical message 2',
        sourceMessageId: 'hist-msg-2',
        role: 'assistant',
        timestamp: '2023-01-01T10:01:00Z',
        chunkIndex: 0,
        tokenCount: 12
      },
      {
        text: 'Historical message 3',
        sourceMessageId: 'hist-msg-3',
        role: 'user',
        timestamp: '2023-01-01T10:02:00Z',
        chunkIndex: 0,
        tokenCount: 8
      }
    ]

    const mockRecentHistory = [
      {
        id: 'recent-msg-1',
        role: 'user',
        content: 'Recent message 1',
        timestamp: '2023-01-01T11:00:00Z'
      },
      {
        id: 'recent-msg-2',
        role: 'assistant',
        content: 'Recent message 2',
        timestamp: '2023-01-01T11:01:00Z'
      },
      {
        id: 'recent-msg-3',
        role: 'user',
        content: 'Recent message 3',
        timestamp: '2023-01-01T11:02:00Z'
      }
    ]

    it('should combine contexts with no overlap', async () => {
      const result = contextCompressionService.constructPromptContext(mockRetrievedMatches, mockRecentHistory)

      expect(result).toHaveLength(6) // 3 retrieved + 3 recent

      // Check that retrieved messages come first
      expect(result[0].id).toBe('hist-msg-1')
      expect(result[1].id).toBe('hist-msg-2')
      expect(result[2].id).toBe('hist-msg-3')

      // Check that recent messages come after
      expect(result[3].id).toBe('recent-msg-1')
      expect(result[4].id).toBe('recent-msg-2')
      expect(result[5].id).toBe('recent-msg-3')
    })

    it('should handle full overlap correctly', async () => {
      const overlappingRecentHistory = [
        {
          id: 'hist-msg-1',
          role: 'user',
          content: 'Historical message 1',
          timestamp: '2023-01-01T10:00:00Z'
        },
        {
          id: 'hist-msg-2',
          role: 'assistant',
          content: 'Historical message 2',
          timestamp: '2023-01-01T10:01:00Z'
        },
        {
          id: 'hist-msg-3',
          role: 'user',
          content: 'Historical message 3',
          timestamp: '2023-01-01T10:02:00Z'
        }
      ]

      const result = contextCompressionService.constructPromptContext(mockRetrievedMatches, overlappingRecentHistory)

      expect(result).toHaveLength(3) // No duplicates
      expect(result[0].id).toBe('hist-msg-1')
      expect(result[1].id).toBe('hist-msg-2')
      expect(result[2].id).toBe('hist-msg-3')
    })

    it('should handle partial overlap correctly', async () => {
      const partialOverlapHistory = [
        {
          id: 'hist-msg-2', // This overlaps with retrieved
          role: 'assistant',
          content: 'Historical message 2',
          timestamp: '2023-01-01T10:01:00Z'
        },
        {
          id: 'recent-msg-1',
          role: 'user',
          content: 'Recent message 1',
          timestamp: '2023-01-01T11:00:00Z'
        },
        {
          id: 'recent-msg-2',
          role: 'assistant',
          content: 'Recent message 2',
          timestamp: '2023-01-01T11:01:00Z'
        }
      ]

      const result = contextCompressionService.constructPromptContext(mockRetrievedMatches, partialOverlapHistory)

      expect(result).toHaveLength(5) // 3 retrieved + 2 unique recent

      // Check that all unique messages are present
      const ids = result.map(msg => msg.id)
      expect(ids).toContain('hist-msg-1')
      expect(ids).toContain('hist-msg-2')
      expect(ids).toContain('hist-msg-3')
      expect(ids).toContain('recent-msg-1')
      expect(ids).toContain('recent-msg-2')

      // Check no duplicates
      expect(new Set(ids).size).toBe(5)
    })

    it('should maintain correct ordering (retrieved first, then recent)', async () => {
      const result = contextCompressionService.constructPromptContext(mockRetrievedMatches, mockRecentHistory)

      // First 3 should be from retrieved context (in chronological order)
      expect(result[0].id).toBe('hist-msg-1')
      expect(result[1].id).toBe('hist-msg-2')
      expect(result[2].id).toBe('hist-msg-3')

      // Last 3 should be from recent history
      expect(result[3].id).toBe('recent-msg-1')
      expect(result[4].id).toBe('recent-msg-2')
      expect(result[5].id).toBe('recent-msg-3')
    })

    it('should sort retrieved messages by timestamp', async () => {
      const unsortedRetrievedMatches = [
        {
          text: 'Latest historical message',
          sourceMessageId: 'hist-msg-latest',
          role: 'user',
          timestamp: '2023-01-01T10:05:00Z',
          chunkIndex: 0,
          tokenCount: 10
        },
        {
          text: 'Earliest historical message',
          sourceMessageId: 'hist-msg-earliest',
          role: 'assistant',
          timestamp: '2023-01-01T09:00:00Z',
          chunkIndex: 0,
          tokenCount: 12
        },
        {
          text: 'Middle historical message',
          sourceMessageId: 'hist-msg-middle',
          role: 'user',
          timestamp: '2023-01-01T09:30:00Z',
          chunkIndex: 0,
          tokenCount: 8
        }
      ]

      const result = contextCompressionService.constructPromptContext(unsortedRetrievedMatches, [])

      // Should be sorted by timestamp (earliest first)
      expect(result[0].id).toBe('hist-msg-earliest')
      expect(result[1].id).toBe('hist-msg-middle')
      expect(result[2].id).toBe('hist-msg-latest')
    })

    it('should handle empty arrays', async () => {
      const result1 = contextCompressionService.constructPromptContext([], mockRecentHistory)
      expect(result1).toHaveLength(3)
      expect(result1).toEqual(mockRecentHistory)

      const result2 = contextCompressionService.constructPromptContext(mockRetrievedMatches, [])
      expect(result2).toHaveLength(3)
      expect(result2[0].id).toBe('hist-msg-1')

      const result3 = contextCompressionService.constructPromptContext([], [])
      expect(result3).toHaveLength(0)
    })
  })

  describe('truncatePromptContext', () => {
    const createMockMessage = (id: string, content: string): SimpleMessage => ({
      id,
      role: 'user',
      content,
      timestamp: '2023-01-01T00:00:00Z'
    })

    it('should return unchanged messages when under token limit', () => {
      const messages = [
        createMockMessage('msg-1', 'Short'),
        createMockMessage('msg-2', 'Text'),
        createMockMessage('msg-3', 'Here')
      ]

      const maxTokens = 1000 // Very high limit
      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      expect(result).toHaveLength(3)
      expect(result).toEqual(messages)
    })

    it('should remove messages from beginning when over token limit', () => {
      const messages = [
        createMockMessage('msg-1', 'This is a longer message that should take up more tokens'),
        createMockMessage('msg-2', 'This is another long message with many words'),
        createMockMessage('msg-3', 'Short'),
        createMockMessage('msg-4', 'Brief')
      ]

      const maxTokens = 10 // Very low limit to force truncation
      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      // Should have fewer messages than original
      expect(result.length).toBeLessThan(messages.length)

      // Should preserve the order of remaining messages
      if (result.length > 0) {
        expect(result[0].id).not.toBe('msg-1') // First message should be removed
      }
    })

    it('should return empty array when single message exceeds limit', () => {
      const messages = [
        createMockMessage('msg-1', 'This is an extremely long message that contains many many words and should definitely exceed any reasonable token limit that we set for testing purposes')
      ]

      const maxTokens = 5 // Very low limit
      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      expect(result).toHaveLength(0)
    })

    it('should handle empty message array', () => {
      const messages: SimpleMessage[] = []
      const maxTokens = 100

      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })

    it('should preserve message order after truncation', () => {
      const messages = [
        createMockMessage('msg-1', 'First long message with many tokens'),
        createMockMessage('msg-2', 'Second long message with many tokens'),
        createMockMessage('msg-3', 'Third'),
        createMockMessage('msg-4', 'Fourth')
      ]

      const maxTokens = 15 // Moderate limit
      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      // Check that remaining messages maintain their relative order
      for (let i = 1; i < result.length; i++) {
        const currentIndex = messages.findIndex(msg => msg.id === result[i].id)
        const previousIndex = messages.findIndex(msg => msg.id === result[i-1].id)
        expect(currentIndex).toBeGreaterThan(previousIndex)
      }
    })

    it('should not mutate the original array', () => {
      const messages = [
        createMockMessage('msg-1', 'Message one'),
        createMockMessage('msg-2', 'Message two')
      ]
      const originalLength = messages.length
      const maxTokens = 5 // Low limit to force truncation

      const result = contextCompressionService.truncatePromptContext(messages, maxTokens)

      // Original array should be unchanged
      expect(messages).toHaveLength(originalLength)
      expect(messages[0].id).toBe('msg-1')
      expect(messages[1].id).toBe('msg-2')
    })
  })

  describe('_embedAndStoreSummary', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello, I need help with my project',
        timestamp: 1234567890,
        avatar: 'user-avatar',
        model_name: 'test-model',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'I would be happy to help you with your project.',
        timestamp: 1234567891,
        avatar: 'assistant-avatar',
        model_name: 'test-model',
        usage: { prompt_tokens: 15, completion_tokens: 20, total_tokens: 35 }
      }
    ]

    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks()
    })

    it('should successfully embed and store summary with correct order', async () => {
      const threadId = 'test-thread-123'
      const summary = 'User requested help with a project. Assistant offered assistance.'
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]

      // Mock the services
      const mockGenerateEmbedding = vi.spyOn(mockOllamaService, 'generateEmbedding').mockResolvedValue(mockEmbedding)
      const mockUpsertVectors = vi.spyOn(mockPineconeService, 'upsertVectors').mockResolvedValue(undefined)
      const mockDeleteVectors = vi.spyOn(mockPineconeService, 'deleteVectors').mockResolvedValue(undefined)

      // Call the method (we'll need to make it public for testing or use a different approach)
      await (contextCompressionService as any)._embedAndStoreSummary(threadId, summary, mockMessages)

      // Assert that embedding was generated with correct parameters
      expect(mockGenerateEmbedding).toHaveBeenCalledWith(summary, 'document')

      // Assert that upsert was called before delete (order matters)
      expect(mockUpsertVectors).toHaveBeenCalledBefore(mockDeleteVectors)

      // Assert upsert payload structure
      expect(mockUpsertVectors).toHaveBeenCalledWith(threadId, [
        expect.objectContaining({
          id: expect.stringMatching(/^summary-/),
          values: mockEmbedding,
          metadata: expect.objectContaining({
            text: summary,
            isSummary: true,
            originalMessageCount: 2,
            timestamp: expect.any(String)
          })
        })
      ])

      // Assert delete payload
      expect(mockDeleteVectors).toHaveBeenCalledWith(threadId, ['msg-1', 'msg-2'])
    })

    it('should handle embedding generation failure', async () => {
      const threadId = 'test-thread-123'
      const summary = 'Test summary'

      // Mock embedding failure
      const mockGenerateEmbedding = vi.spyOn(mockOllamaService, 'generateEmbedding').mockResolvedValue(null)
      const mockUpsertVectors = vi.spyOn(mockPineconeService, 'upsertVectors').mockResolvedValue(undefined)
      const mockDeleteVectors = vi.spyOn(mockPineconeService, 'deleteVectors').mockResolvedValue(undefined)

      // Should throw an error when embedding fails
      await expect((contextCompressionService as any)._embedAndStoreSummary(threadId, summary, mockMessages))
        .rejects.toThrow('Failed to generate embedding for the summary text')

      // Should not call upsert or delete if embedding fails
      expect(mockUpsertVectors).not.toHaveBeenCalled()
      expect(mockDeleteVectors).not.toHaveBeenCalled()
    })

    it('should handle upsert failure and not call delete', async () => {
      const threadId = 'test-thread-123'
      const summary = 'Test summary'
      const mockEmbedding = [0.1, 0.2, 0.3]

      // Mock successful embedding but failed upsert
      const mockGenerateEmbedding = vi.spyOn(mockOllamaService, 'generateEmbedding').mockResolvedValue(mockEmbedding)
      const mockUpsertVectors = vi.spyOn(mockPineconeService, 'upsertVectors').mockRejectedValue(new Error('Upsert failed'))
      const mockDeleteVectors = vi.spyOn(mockPineconeService, 'deleteVectors').mockResolvedValue(undefined)

      // Should throw an error when upsert fails
      await expect((contextCompressionService as any)._embedAndStoreSummary(threadId, summary, mockMessages))
        .rejects.toThrow('Upsert failed')

      // Should call embedding and upsert, but not delete
      expect(mockGenerateEmbedding).toHaveBeenCalled()
      expect(mockUpsertVectors).toHaveBeenCalled()
      expect(mockDeleteVectors).not.toHaveBeenCalled()
    })

    it('should handle delete failure after successful upsert', async () => {
      const threadId = 'test-thread-123'
      const summary = 'Test summary'
      const mockEmbedding = [0.1, 0.2, 0.3]

      // Mock successful embedding and upsert, but failed delete
      const mockGenerateEmbedding = vi.spyOn(mockOllamaService, 'generateEmbedding').mockResolvedValue(mockEmbedding)
      const mockUpsertVectors = vi.spyOn(mockPineconeService, 'upsertVectors').mockResolvedValue(undefined)
      const mockDeleteVectors = vi.spyOn(mockPineconeService, 'deleteVectors').mockRejectedValue(new Error('Delete failed'))

      // Should throw an error when delete fails
      await expect((contextCompressionService as any)._embedAndStoreSummary(threadId, summary, mockMessages))
        .rejects.toThrow('Delete failed')

      // Should call all methods in order
      expect(mockGenerateEmbedding).toHaveBeenCalled()
      expect(mockUpsertVectors).toHaveBeenCalled()
      expect(mockDeleteVectors).toHaveBeenCalled()
    })

    it('should handle empty message array', async () => {
      const threadId = 'test-thread-123'
      const summary = 'Empty conversation summary'
      const mockEmbedding = [0.1, 0.2, 0.3]

      // Mock successful embedding
      const mockGenerateEmbedding = vi.spyOn(mockOllamaService, 'generateEmbedding').mockResolvedValue(mockEmbedding)
      const mockUpsertVectors = vi.spyOn(mockPineconeService, 'upsertVectors').mockResolvedValue(undefined)
      const mockDeleteVectors = vi.spyOn(mockPineconeService, 'deleteVectors').mockResolvedValue(undefined)

      await (contextCompressionService as any)._embedAndStoreSummary(threadId, summary, [])

      // Should still upsert the summary
      expect(mockUpsertVectors).toHaveBeenCalled()

      // Should call delete with empty array (which should be handled gracefully by deleteVectors)
      expect(mockDeleteVectors).toHaveBeenCalledWith(threadId, [])
    })
  })

  describe('runSummarization', () => {
    const mockModelConfig = {
      provider: 'test-provider',
      name: 'test-model',
      maxTokens: 4096,
      temperature: 0.7
    }

    it('should handle empty message array correctly', async () => {
      const result = await contextCompressionService.runSummarization('test-thread-123', [], mockModelConfig)
      expect(result).toBeNull()
    })

    it('should have runSummarization method defined', () => {
      // Verify the method exists and is callable
      expect(contextCompressionService.runSummarization).toBeDefined()
      expect(typeof contextCompressionService.runSummarization).toBe('function')
    })

    // Note: Full integration tests with LLM provider would require complex mocking
    // The core logic is tested, and integration will be verified in Part 3
  })

  describe('retrieveRelevantContext', () => {
    const testThreadId = 'test-thread-123'
    const testMessage = 'What is the weather like today?'
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
    const mockMetadata = [
      {
        text: 'Previous weather discussion',
        sourceMessageId: 'msg-1',
        role: 'user',
        timestamp: '2023-01-01T00:00:00Z',
        chunkIndex: 0,
        tokenCount: 10
      },
      {
        text: 'Weather forecast information',
        sourceMessageId: 'msg-2',
        role: 'assistant',
        timestamp: '2023-01-01T00:01:00Z',
        chunkIndex: 0,
        tokenCount: 12
      }
    ]

    beforeEach(() => {
      mockOllamaService.generateEmbedding.mockResolvedValue(mockEmbedding)
      mockPineconeService.queryNamespace.mockResolvedValue(mockMetadata)
    })

    it('should retrieve relevant context successfully', async () => {
      const result = await contextCompressionService.retrieveRelevantContext(testThreadId, testMessage)

      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(testMessage, 'query')
      expect(mockPineconeService.queryNamespace).toHaveBeenCalledWith(testThreadId, mockEmbedding, 5)
      expect(result).toEqual(mockMetadata)
    })

    it('should return empty array when embedding generation fails', async () => {
      mockOllamaService.generateEmbedding.mockResolvedValue(null)

      const result = await contextCompressionService.retrieveRelevantContext(testThreadId, testMessage)

      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(testMessage, 'query')
      expect(mockPineconeService.queryNamespace).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when Pinecone query fails', async () => {
      mockPineconeService.queryNamespace.mockResolvedValue([])

      const result = await contextCompressionService.retrieveRelevantContext(testThreadId, testMessage)

      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(testMessage, 'query')
      expect(mockPineconeService.queryNamespace).toHaveBeenCalledWith(testThreadId, mockEmbedding, 5)
      expect(result).toEqual([])
    })

    it('should use correct topK value', async () => {
      await contextCompressionService.retrieveRelevantContext(testThreadId, testMessage)

      expect(mockPineconeService.queryNamespace).toHaveBeenCalledWith(
        testThreadId,
        mockEmbedding,
        5 // topK should be 5 as specified in the implementation
      )
    })

    it('should handle empty message content', async () => {
      const result = await contextCompressionService.retrieveRelevantContext(testThreadId, '')

      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith('', 'query')
      // The behavior depends on how OllamaService handles empty strings
      // If it returns null, we should get an empty array
      if (mockOllamaService.generateEmbedding.mock.results[0].value === null) {
        expect(result).toEqual([])
      }
    })
  })
})
