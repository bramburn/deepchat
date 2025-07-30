import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageItemAssistant from '@/components/message/MessageItemAssistant.vue'
import type { AssistantMessage } from '@shared/chat'

// Mock the stores
vi.mock('@/stores/chat', () => ({
  useChatStore: () => ({
    getActiveThreadId: () => 'test-thread-123',
    generatingThreadIds: new Set(),
    forkThread: vi.fn()
  })
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({})
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    isDark: false
  })
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('MessageItemAssistant Context Viewer Integration', () => {
  const createMockMessage = (retrievedContext?: string[]): AssistantMessage => ({
    id: 'msg-123',
    role: 'assistant',
    content: [
      {
        type: 'content',
        content: 'This is a test response from the assistant.',
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
    retrievedContext
  })

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  it('should not show context icon when no retrieved context', () => {
    const message = createMockMessage()
    const wrapper = mount(MessageItemAssistant, {
      props: {
        message,
        isCapturingImage: false
      },
      global: {
        stubs: {
          'teleport': true,
          'Icon': true,
          'ModelIcon': true,
          'MessageInfo': true,
          'MessageBlockContent': true,
          'MessageToolbar': true,
          'Dialog': true,
          'DialogContent': true,
          'DialogHeader': true,
          'DialogTitle': true,
          'DialogDescription': true,
          'DialogFooter': true,
          'Button': true,
          'ContextViewer': true
        }
      }
    })

    // Context icon should not be visible
    const contextButton = wrapper.find('[title="View retrieved context"]')
    expect(contextButton.exists()).toBe(false)
  })

  it('should show context icon when retrieved context exists', () => {
    const retrievedContext = [
      'This is context chunk 1',
      'This is context chunk 2'
    ]
    const message = createMockMessage(retrievedContext)
    
    const wrapper = mount(MessageItemAssistant, {
      props: {
        message,
        isCapturingImage: false
      },
      global: {
        stubs: {
          'teleport': true,
          'Icon': true,
          'ModelIcon': true,
          'MessageInfo': true,
          'MessageBlockContent': true,
          'MessageToolbar': true,
          'Dialog': true,
          'DialogContent': true,
          'DialogHeader': true,
          'DialogTitle': true,
          'DialogDescription': true,
          'DialogFooter': true,
          'Button': true,
          'ContextViewer': true
        }
      }
    })

    // Context icon should be visible
    const contextButton = wrapper.find('[title="View retrieved context"]')
    expect(contextButton.exists()).toBe(true)
    
    // Should show the correct count
    expect(contextButton.text()).toContain('Context (2)')
  })

  it('should show context viewer when icon is clicked', async () => {
    const retrievedContext = [
      'This is context chunk 1',
      'This is context chunk 2'
    ]
    const message = createMockMessage(retrievedContext)
    
    const wrapper = mount(MessageItemAssistant, {
      props: {
        message,
        isCapturingImage: false
      },
      global: {
        stubs: {
          'teleport': true,
          'Icon': true,
          'ModelIcon': true,
          'MessageInfo': true,
          'MessageBlockContent': true,
          'MessageToolbar': true,
          'Dialog': true,
          'DialogContent': true,
          'DialogHeader': true,
          'DialogTitle': true,
          'DialogDescription': true,
          'DialogFooter': true,
          'Button': true,
          'ContextViewer': {
            template: '<div data-testid="context-viewer">Context Viewer</div>',
            props: ['context'],
            emits: ['close']
          }
        }
      }
    })

    // Initially, context viewer should not be visible
    expect(wrapper.find('[data-testid="context-viewer"]').exists()).toBe(false)

    // Click the context button
    const contextButton = wrapper.find('[title="View retrieved context"]')
    await contextButton.trigger('click')

    // Context viewer should now be visible
    expect(wrapper.find('[data-testid="context-viewer"]').exists()).toBe(true)
  })

  it('should hide context viewer when close event is emitted', async () => {
    const retrievedContext = ['Context chunk']
    const message = createMockMessage(retrievedContext)
    
    const wrapper = mount(MessageItemAssistant, {
      props: {
        message,
        isCapturingImage: false
      },
      global: {
        stubs: {
          'teleport': true,
          'Icon': true,
          'ModelIcon': true,
          'MessageInfo': true,
          'MessageBlockContent': true,
          'MessageToolbar': true,
          'Dialog': true,
          'DialogContent': true,
          'DialogHeader': true,
          'DialogTitle': true,
          'DialogDescription': true,
          'DialogFooter': true,
          'Button': true,
          'ContextViewer': {
            template: '<div data-testid="context-viewer" @click="$emit(\'close\')">Context Viewer</div>',
            props: ['context'],
            emits: ['close']
          }
        }
      }
    })

    // Click to show context viewer
    const contextButton = wrapper.find('[title="View retrieved context"]')
    await contextButton.trigger('click')
    expect(wrapper.find('[data-testid="context-viewer"]').exists()).toBe(true)

    // Emit close event
    const contextViewer = wrapper.find('[data-testid="context-viewer"]')
    await contextViewer.trigger('click')

    // Context viewer should be hidden
    expect(wrapper.find('[data-testid="context-viewer"]').exists()).toBe(false)
  })

  it('should handle empty retrieved context array', () => {
    const message = createMockMessage([])
    
    const wrapper = mount(MessageItemAssistant, {
      props: {
        message,
        isCapturingImage: false
      },
      global: {
        stubs: {
          'teleport': true,
          'Icon': true,
          'ModelIcon': true,
          'MessageInfo': true,
          'MessageBlockContent': true,
          'MessageToolbar': true,
          'Dialog': true,
          'DialogContent': true,
          'DialogHeader': true,
          'DialogTitle': true,
          'DialogDescription': true,
          'DialogFooter': true,
          'Button': true,
          'ContextViewer': true
        }
      }
    })

    // Context icon should not be visible for empty array
    const contextButton = wrapper.find('[title="View retrieved context"]')
    expect(contextButton.exists()).toBe(false)
  })
})
