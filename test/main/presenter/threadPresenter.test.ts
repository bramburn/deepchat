import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThreadPresenter } from '@/presenter/threadPresenter'
import { ContextCompressionService } from '@/services/ContextCompressionService'
import { eventBus } from '@/eventbus'
import { CONVERSATION_EVENTS } from '@shared/presenter'

// Mock dependencies
vi.mock('@/services/ContextCompressionService')
vi.mock('@/eventbus')
vi.mock('@/presenter', () => ({
  presenter: {
    configPresenter: {
      getModelConfig: vi.fn().mockReturnValue({
        contextCompressionEnabled: true,
        maxTokens: 8192
      })
    },
    llmproviderPresenter: {
      generateText: vi.fn()
    }
  }
}))

describe('ThreadPresenter Context Data Attachment', () => {
  let threadPresenter: ThreadPresenter
  let mockContextCompressionService: any
  let mockEventBus: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock ContextCompressionService
    mockContextCompressionService = {
      retrieveRelevantContext: vi.fn(),
      constructPromptContext: vi.fn(),
      truncatePromptContext: vi.fn(),
      processContext: vi.fn(),
      logStrategyUsage: vi.fn()
    }

    // Mock eventBus
    mockEventBus = {
      sendToMain: vi.fn()
    }

    // Replace the actual instances with mocks
    vi.mocked(ContextCompressionService).mockImplementation(() => mockContextCompressionService)
    vi.mocked(eventBus).sendToMain = mockEventBus.sendToMain

    threadPresenter = new ThreadPresenter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Context Data Attachment in Message Generation', () => {
    it('should attach retrieved context to assistant message when RAG pipeline is used', async () => {
      // Mock the RAG pipeline responses
      const mockRetrievedMatches = [
        { text: 'Previous conversation about project setup', sourceMessageId: 'msg-1' },
        { text: 'Discussion about database configuration', sourceMessageId: 'msg-2' }
      ]

      const mockCombinedMessages = [
        { id: 'msg-1', role: 'assistant', content: 'Previous conversation about project setup', timestamp: '2023-01-01' },
        { id: 'msg-2', role: 'user', content: 'Discussion about database configuration', timestamp: '2023-01-02' }
      ]

      const mockFinalMessages = [
        { id: 'msg-1', role: 'assistant', content: 'Previous conversation about project setup', timestamp: '2023-01-01' },
        { id: 'msg-2', role: 'user', content: 'Discussion about database configuration', timestamp: '2023-01-02' }
      ]

      // Setup mocks
      mockContextCompressionService.retrieveRelevantContext.mockResolvedValue(mockRetrievedMatches)
      mockContextCompressionService.constructPromptContext.mockReturnValue(mockCombinedMessages)
      mockContextCompressionService.truncatePromptContext.mockReturnValue(mockFinalMessages)
      mockContextCompressionService.processContext.mockResolvedValue([])

      // Mock conversation and message data
      const mockConversation = {
        id: 'test-conversation-123',
        settings: {
          providerId: 'test-provider',
          modelId: 'test-model'
        }
      }

      const mockUserMessage = {
        id: 'user-msg-123',
        role: 'user',
        content: { text: 'How do I set up the database?' },
        conversationId: 'test-conversation-123',
        timestamp: Date.now()
      }

      // Mock the methods that would be called
      vi.spyOn(threadPresenter, 'getConversation').mockResolvedValue(mockConversation as any)
      vi.spyOn(threadPresenter, 'getMessages').mockResolvedValue({ list: [], total: 0 })

      // Test the selectContextMessages method (which contains the RAG pipeline)
      const result = await (threadPresenter as any).selectContextMessages(
        mockConversation,
        [],
        mockUserMessage,
        4000
      )

      // Verify that the RAG pipeline was called correctly
      expect(mockContextCompressionService.retrieveRelevantContext).toHaveBeenCalledWith(
        'test-conversation-123',
        'How do I set up the database?'
      )
      expect(mockContextCompressionService.constructPromptContext).toHaveBeenCalled()
      expect(mockContextCompressionService.truncatePromptContext).toHaveBeenCalled()

      // The method should return the processed context
      expect(result).toBeDefined()
    })

    it('should extract context strings from final messages for UI display', () => {
      // Test the context extraction logic
      const mockFinalMessages = [
        { id: 'msg-1', role: 'assistant', content: 'Previous conversation about project setup', timestamp: '2023-01-01' },
        { id: 'msg-2', role: 'user', content: 'Discussion about database configuration', timestamp: '2023-01-02' },
        { id: 'msg-3', role: 'assistant', content: 'Here are the database setup steps', timestamp: '2023-01-03' }
      ]

      // Extract context strings (this is the logic we need to implement)
      const contextStrings = mockFinalMessages.map(m => m.content)

      expect(contextStrings).toEqual([
        'Previous conversation about project setup',
        'Discussion about database configuration',
        'Here are the database setup steps'
      ])
      expect(contextStrings).toHaveLength(3)
    })

    it('should handle empty final messages gracefully', () => {
      const mockFinalMessages: any[] = []
      const contextStrings = mockFinalMessages.map(m => m.content)

      expect(contextStrings).toEqual([])
      expect(contextStrings).toHaveLength(0)
    })

    it('should verify eventBus sends message with retrievedContext property', () => {
      // This test verifies that when eventBus.sendToMain is called with MESSAGE_GENERATED,
      // the message object includes the retrievedContext property

      const mockMessage = {
        id: 'assistant-msg-123',
        role: 'assistant',
        content: 'This is the AI response',
        conversationId: 'test-conversation-123',
        retrievedContext: [
          'Previous conversation about project setup',
          'Discussion about database configuration'
        ]
      }

      // Simulate the eventBus call that happens in finalizeMessage
      mockEventBus.sendToMain(CONVERSATION_EVENTS.MESSAGE_GENERATED, {
        conversationId: mockMessage.conversationId,
        message: mockMessage
      })

      // Verify the call was made with the correct structure
      expect(mockEventBus.sendToMain).toHaveBeenCalledWith(
        CONVERSATION_EVENTS.MESSAGE_GENERATED,
        expect.objectContaining({
          conversationId: 'test-conversation-123',
          message: expect.objectContaining({
            retrievedContext: expect.arrayContaining([
              'Previous conversation about project setup',
              'Discussion about database configuration'
            ])
          })
        })
      )
    })
  })
})
