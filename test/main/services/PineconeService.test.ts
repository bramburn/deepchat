import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PineconeService } from '@/services/PineconeService'
import { ContextCompressionPresenter } from '@/presenter/contextCompressionPresenter'

// Mock the ContextCompressionPresenter
vi.mock('@/presenter/contextCompressionPresenter', () => ({
  ContextCompressionPresenter: {
    getPineconeApiKey: vi.fn(),
    getPineconeEnvironment: vi.fn(),
    getDecryptedApiKey: vi.fn()
  }
}))

// Mock the Pinecone client
const mockQuery = vi.fn()
const mockUpsert = vi.fn()
const mockDeleteAll = vi.fn()
const mockDescribeIndexStats = vi.fn()

const mockNamespace = vi.fn(() => ({
  query: mockQuery,
  upsert: mockUpsert,
  deleteAll: mockDeleteAll
}))

const mockIndex = {
  namespace: mockNamespace,
  describeIndexStats: mockDescribeIndexStats
}

const mockPinecone = {
  index: vi.fn(() => mockIndex)
}

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn(() => mockPinecone)
}))

describe('PineconeService', () => {
  let pineconeService: PineconeService
  const mockApiKey = 'test-api-key'
  const mockEnvironment = 'test-env'

  beforeEach(() => {
    pineconeService = PineconeService.getInstance()
    vi.mocked(ContextCompressionPresenter.getPineconeApiKey).mockReturnValue(mockApiKey)
    vi.mocked(ContextCompressionPresenter.getPineconeEnvironment).mockReturnValue(mockEnvironment)
    vi.mocked(ContextCompressionPresenter.getDecryptedApiKey).mockReturnValue(mockApiKey)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('deleteVectors', () => {
    it('should delete vectors by IDs successfully', async () => {
      const mockDeleteMany = vi.fn().mockResolvedValue(undefined)
      const mockNamespace = vi.fn().mockReturnValue({
        deleteMany: mockDeleteMany
      })
      const mockIndex = {
        namespace: mockNamespace
      }

      // Mock the initialize method to set up the index
      vi.spyOn(pineconeService, 'initialize').mockResolvedValue(undefined)
      // @ts-ignore - accessing private property for testing
      pineconeService.index = mockIndex

      const namespace = 'test-thread-id'
      const idsToDelete = ['msg-1', 'msg-2', 'msg-3']

      await pineconeService.deleteVectors(namespace, idsToDelete)

      expect(mockNamespace).toHaveBeenCalledWith(namespace)
      expect(mockDeleteMany).toHaveBeenCalledWith(idsToDelete)
    })

    it('should handle empty IDs array', async () => {
      const mockDeleteMany = vi.fn()
      const mockNamespace = vi.fn().mockReturnValue({
        deleteMany: mockDeleteMany
      })
      const mockIndex = {
        namespace: mockNamespace
      }

      // Mock the initialize method to set up the index
      vi.spyOn(pineconeService, 'initialize').mockResolvedValue(undefined)
      // @ts-ignore - accessing private property for testing
      pineconeService.index = mockIndex

      const namespace = 'test-thread-id'
      const idsToDelete: string[] = []

      await pineconeService.deleteVectors(namespace, idsToDelete)

      // Should not call deleteMany for empty array
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })

    it('should handle deletion errors gracefully', async () => {
      const mockDeleteMany = vi.fn().mockRejectedValue(new Error('Pinecone deletion failed'))
      const mockNamespace = vi.fn().mockReturnValue({
        deleteMany: mockDeleteMany
      })
      const mockIndex = {
        namespace: mockNamespace
      }

      // Mock the initialize method to set up the index
      vi.spyOn(pineconeService, 'initialize').mockResolvedValue(undefined)
      // @ts-ignore - accessing private property for testing
      pineconeService.index = mockIndex

      const namespace = 'test-thread-id'
      const idsToDelete = ['msg-1', 'msg-2']

      await expect(pineconeService.deleteVectors(namespace, idsToDelete)).rejects.toThrow('Pinecone deletion failed')

      expect(mockNamespace).toHaveBeenCalledWith(namespace)
      expect(mockDeleteMany).toHaveBeenCalledWith(idsToDelete)
    })

    it('should handle initialization failure', async () => {
      vi.spyOn(pineconeService, 'initialize').mockRejectedValue(new Error('Cannot initialize Pinecone: API key not configured'))

      const namespace = 'test-thread-id'
      const idsToDelete = ['msg-1']

      await expect(pineconeService.deleteVectors(namespace, idsToDelete)).rejects.toThrow('Cannot initialize Pinecone: API key not configured')
    })
  })

  describe('queryNamespace', () => {
    const testNamespace = 'test-thread-id'
    const testVector = [0.1, 0.2, 0.3, 0.4, 0.5]
    const topK = 5

    const mockQueryResponse = {
      matches: [
        {
          id: 'vector-1',
          score: 0.95,
          metadata: {
            text: 'This is the first relevant message',
            sourceMessageId: 'msg-1',
            role: 'user',
            timestamp: '2023-01-01T00:00:00Z',
            chunkIndex: 0,
            tokenCount: 10
          }
        },
        {
          id: 'vector-2',
          score: 0.87,
          metadata: {
            text: 'This is the second relevant message',
            sourceMessageId: 'msg-2',
            role: 'assistant',
            timestamp: '2023-01-01T00:01:00Z',
            chunkIndex: 0,
            tokenCount: 12
          }
        }
      ]
    }

    beforeEach(() => {
      mockQuery.mockResolvedValue(mockQueryResponse)
    })

    it('should query namespace and return metadata array', async () => {
      const result = await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(mockQuery).toHaveBeenCalledWith({
        vector: testVector,
        topK,
        includeMetadata: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(mockQueryResponse.matches[0].metadata)
      expect(result[1]).toEqual(mockQueryResponse.matches[1].metadata)
    })

    it('should handle empty query results', async () => {
      mockQuery.mockResolvedValue({ matches: [] })

      const result = await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(result).toEqual([])
    })

    it('should filter out matches without metadata', async () => {
      const responseWithNullMetadata = {
        matches: [
          {
            id: 'vector-1',
            score: 0.95,
            metadata: mockQueryResponse.matches[0].metadata
          },
          {
            id: 'vector-2',
            score: 0.87,
            metadata: null
          },
          {
            id: 'vector-3',
            score: 0.80,
            metadata: undefined
          }
        ]
      }

      mockQuery.mockResolvedValue(responseWithNullMetadata)

      const result = await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockQueryResponse.matches[0].metadata)
    })

    it('should handle query errors gracefully', async () => {
      const error = new Error('Pinecone query failed')
      mockQuery.mockRejectedValue(error)

      const result = await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(result).toEqual([])
    })

    it('should handle initialization errors', async () => {
      // Reset the singleton instance to test initialization failure
      ;(PineconeService as any).instance = null
      ;(pineconeService as any).index = null
      ;(pineconeService as any).pinecone = null

      vi.mocked(ContextCompressionPresenter.getDecryptedApiKey).mockReturnValue(null)

      const result = await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(result).toEqual([])
    })

    it('should call namespace with correct namespace parameter', async () => {
      await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(mockNamespace).toHaveBeenCalledWith(testNamespace)
    })

    it('should include metadata in query parameters', async () => {
      await pineconeService.queryNamespace(testNamespace, testVector, topK)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          includeMetadata: true
        })
      )
    })
  })

  describe('getInstance', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = PineconeService.getInstance()
      const instance2 = PineconeService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})
