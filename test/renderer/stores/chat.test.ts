import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import type { AssistantMessage } from '@shared/chat'

// Mock the usePresenter composable
vi.mock('@/composables/usePresenter', () => ({
  usePresenter: vi.fn(() => ({
    getMessages: vi.fn(),
    getMessage: vi.fn(),
    sendMessage: vi.fn(),
    startStreamCompletion: vi.fn()
  }))
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

// Mock router
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { name: 'chat' } },
    push: vi.fn()
  }
}))

// Mock sound store
vi.mock('@/stores/sound', () => ({
  useSoundStore: () => ({
    playSound: vi.fn()
  })
}))

// Mock window.api and window.electron
global.window = {
  ...global.window,
  api: {
    getWebContentsId: () => 1,
    getWindowId: () => 1
  },
  electron: {
    ipcRenderer: {
      on: vi.fn(),
      off: vi.fn(),
      send: vi.fn()
    }
  }
} as any

describe('Chat Store - Retrieved Context Handling', () => {
  let chatStore: ReturnType<typeof useChatStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    chatStore = useChatStore()
    vi.clearAllMocks()
  })

  describe('Message Handling with Retrieved Context', () => {
    it('should handle messages with retrievedContext property', () => {
      // Create a mock assistant message with retrieved context
      const mockMessage: AssistantMessage = {
        id: 'assistant-msg-123',
        role: 'assistant',
        content: [
          {
            type: 'content',
            content: 'Based on our previous discussion about database setup, here are the steps...',
            status: 'success',
            timestamp: Date.now()
          }
        ],
        timestamp: Date.now(),
        avatar: 'assistant-avatar',
        name: 'Assistant',
        model_name: 'test-model',
        model_id: 'test-model-id',
        model_provider: 'test-provider',
        status: 'sent',
        error: '',
        usage: {
          context_usage: 0,
          tokens_per_second: 0,
          total_tokens: 100,
          generation_time: 1000,
          first_token_time: 100,
          reasoning_start_time: 0,
          reasoning_end_time: 0,
          input_tokens: 50,
          output_tokens: 50
        },
        conversationId: 'test-conversation',
        is_variant: 0,
        // Sprint 8.2: Retrieved context for UI visualization
        retrievedContext: [
          'Previous conversation about project setup',
          'Discussion about database configuration',
          'User asked about connection strings'
        ]
      }

      // Set the message in the store
      chatStore.setMessages([mockMessage])

      // Get the messages from the store
      const messages = chatStore.getMessages()

      // Verify the message is stored correctly with retrievedContext
      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual(mockMessage)
      expect(messages[0].retrievedContext).toBeDefined()
      expect(messages[0].retrievedContext).toHaveLength(3)
      expect(messages[0].retrievedContext).toContain('Previous conversation about project setup')
    })

    it('should handle messages without retrievedContext property', () => {
      // Create a mock assistant message without retrieved context
      const mockMessage: AssistantMessage = {
        id: 'assistant-msg-456',
        role: 'assistant',
        content: [
          {
            type: 'content',
            content: 'This is a regular response without context.',
            status: 'success',
            timestamp: Date.now()
          }
        ],
        timestamp: Date.now(),
        avatar: 'assistant-avatar',
        name: 'Assistant',
        model_name: 'test-model',
        model_id: 'test-model-id',
        model_provider: 'test-provider',
        status: 'sent',
        error: '',
        usage: {
          context_usage: 0,
          tokens_per_second: 0,
          total_tokens: 50,
          generation_time: 500,
          first_token_time: 50,
          reasoning_start_time: 0,
          reasoning_end_time: 0,
          input_tokens: 25,
          output_tokens: 25
        },
        conversationId: 'test-conversation',
        is_variant: 0
        // No retrievedContext property
      }

      // Set the message in the store
      chatStore.setMessages([mockMessage])

      // Get the messages from the store
      const messages = chatStore.getMessages()

      // Verify the message is stored correctly without retrievedContext
      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual(mockMessage)
      expect(messages[0].retrievedContext).toBeUndefined()
    })

    it('should handle mixed messages with and without retrievedContext', () => {
      const messageWithContext: AssistantMessage = {
        id: 'msg-with-context',
        role: 'assistant',
        content: [{ type: 'content', content: 'Response with context', status: 'success', timestamp: Date.now() }],
        timestamp: Date.now(),
        avatar: 'assistant-avatar',
        name: 'Assistant',
        model_name: 'test-model',
        model_id: 'test-model-id',
        model_provider: 'test-provider',
        status: 'sent',
        error: '',
        usage: {
          context_usage: 0,
          tokens_per_second: 0,
          total_tokens: 50,
          generation_time: 500,
          first_token_time: 50,
          reasoning_start_time: 0,
          reasoning_end_time: 0,
          input_tokens: 25,
          output_tokens: 25
        },
        conversationId: 'test-conversation',
        is_variant: 0,
        retrievedContext: ['Context chunk 1', 'Context chunk 2']
      }

      const messageWithoutContext: AssistantMessage = {
        id: 'msg-without-context',
        role: 'assistant',
        content: [{ type: 'content', content: 'Response without context', status: 'success', timestamp: Date.now() }],
        timestamp: Date.now(),
        avatar: 'assistant-avatar',
        name: 'Assistant',
        model_name: 'test-model',
        model_id: 'test-model-id',
        model_provider: 'test-provider',
        status: 'sent',
        error: '',
        usage: {
          context_usage: 0,
          tokens_per_second: 0,
          total_tokens: 50,
          generation_time: 500,
          first_token_time: 50,
          reasoning_start_time: 0,
          reasoning_end_time: 0,
          input_tokens: 25,
          output_tokens: 25
        },
        conversationId: 'test-conversation',
        is_variant: 0
      }

      // Set both messages in the store
      chatStore.setMessages([messageWithContext, messageWithoutContext])

      // Get the messages from the store
      const messages = chatStore.getMessages()

      // Verify both messages are stored correctly
      expect(messages).toHaveLength(2)
      
      // First message should have context
      expect(messages[0].retrievedContext).toBeDefined()
      expect(messages[0].retrievedContext).toHaveLength(2)
      
      // Second message should not have context
      expect(messages[1].retrievedContext).toBeUndefined()
    })

    it('should handle empty retrievedContext array', () => {
      const mockMessage: AssistantMessage = {
        id: 'msg-empty-context',
        role: 'assistant',
        content: [{ type: 'content', content: 'Response with empty context', status: 'success', timestamp: Date.now() }],
        timestamp: Date.now(),
        avatar: 'assistant-avatar',
        name: 'Assistant',
        model_name: 'test-model',
        model_id: 'test-model-id',
        model_provider: 'test-provider',
        status: 'sent',
        error: '',
        usage: {
          context_usage: 0,
          tokens_per_second: 0,
          total_tokens: 50,
          generation_time: 500,
          first_token_time: 50,
          reasoning_start_time: 0,
          reasoning_end_time: 0,
          input_tokens: 25,
          output_tokens: 25
        },
        conversationId: 'test-conversation',
        is_variant: 0,
        retrievedContext: [] // Empty array
      }

      // Set the message in the store
      chatStore.setMessages([mockMessage])

      // Get the messages from the store
      const messages = chatStore.getMessages()

      // Verify the message is stored correctly with empty retrievedContext
      expect(messages).toHaveLength(1)
      expect(messages[0].retrievedContext).toBeDefined()
      expect(messages[0].retrievedContext).toHaveLength(0)
    })
  })
})
