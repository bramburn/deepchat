import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OllamaService } from '@/services/OllamaService'
import { ContextCompressionPresenter } from '@/presenter/contextCompressionPresenter'

// Mock the ContextCompressionPresenter
vi.mock('@/presenter/contextCompressionPresenter', () => ({
  ContextCompressionPresenter: {
    getOllamaModel: vi.fn()
  }
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('OllamaService', () => {
  let ollamaService: OllamaService
  const mockModel = 'nomic-embed-text'

  beforeEach(() => {
    ollamaService = new OllamaService()
    vi.mocked(ContextCompressionPresenter.getOllamaModel).mockReturnValue(mockModel)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateEmbedding', () => {
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
    const testText = 'This is a test message'

    beforeEach(() => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          embedding: mockEmbedding,
          model: mockModel
        })
      })
    })

    it('should generate embedding with search_query prefix for query type', async () => {
      const result = await ollamaService.generateEmbedding(testText, 'query')

      expect(result).toEqual(mockEmbedding)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/api/embed',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: mockModel,
            prompt: `search_query: ${testText}`
          })
        })
      )
    })

    it('should generate embedding with search_document prefix for document type', async () => {
      const result = await ollamaService.generateEmbedding(testText, 'document')

      expect(result).toEqual(mockEmbedding)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/api/embed',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: mockModel,
            prompt: `search_document: ${testText}`
          })
        })
      )
    })

    it('should return null when model is not configured', async () => {
      vi.mocked(ContextCompressionPresenter.getOllamaModel).mockReturnValue(null)

      const result = await ollamaService.generateEmbedding(testText, 'query')

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return null when text is empty', async () => {
      const result = await ollamaService.generateEmbedding('', 'query')

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('{"error": "Model not found"}')
      })

      const result = await ollamaService.generateEmbedding(testText, 'query')

      expect(result).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await ollamaService.generateEmbedding(testText, 'query')

      expect(result).toBeNull()
    })

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing embedding field
          model: mockModel
        })
      })

      const result = await ollamaService.generateEmbedding(testText, 'query')

      expect(result).toBeNull()
    })
  })

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          model: mockModel
        })
      })

      const result = await ollamaService.testConnection()

      expect(result).toBe(true)
    })

    it('should return false when model is not configured', async () => {
      vi.mocked(ContextCompressionPresenter.getOllamaModel).mockReturnValue(null)

      const result = await ollamaService.testConnection()

      expect(result).toBe(false)
    })

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'))

      const result = await ollamaService.testConnection()

      expect(result).toBe(false)
    })
  })
})
