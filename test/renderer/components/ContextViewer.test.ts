import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ContextViewer from '@/components/ContextViewer.vue'

describe('ContextViewer', () => {
  const mockContext = [
    'This is the first context chunk from a previous conversation.',
    'This is the second context chunk with more information.',
    'This is the third context chunk containing relevant details.'
  ]

  it('should render correctly with context data', () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Check that the component renders
    expect(wrapper.exists()).toBe(true)

    // Check that the title is rendered
    expect(wrapper.find('h3').text()).toBe('Retrieved Context')

    // Check that all context chunks are rendered
    const contextChunks = wrapper.findAll('[data-testid="context-chunk"]')
    expect(contextChunks).toHaveLength(mockContext.length)

    // Check that the content of each chunk is correct
    mockContext.forEach((chunk, index) => {
      const chunkElement = wrapper.findAll('p')[index]
      expect(chunkElement.text()).toBe(chunk)
    })
  })

  it('should render empty state when no context provided', () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: []
      }
    })

    expect(wrapper.text()).toContain('No context available')
  })

  it('should emit close event when overlay is clicked', async () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Click on the overlay (the outermost div)
    await wrapper.find('.fixed.inset-0').trigger('click')

    // Check that close event was emitted
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should emit close event when close button is clicked', async () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Find and click the close button
    const closeButton = wrapper.find('button[aria-label="Close"]')
    await closeButton.trigger('click')

    // Check that close event was emitted
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should emit close event when footer close button is clicked', async () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Find and click the footer close button
    const footerCloseButton = wrapper.findAll('button').find(btn => btn.text() === 'Close')
    expect(footerCloseButton).toBeTruthy()
    
    await footerCloseButton!.trigger('click')

    // Check that close event was emitted
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should not emit close event when content area is clicked', async () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Click on the content area (should not close due to @click.stop)
    const contentArea = wrapper.find('.bg-white')
    await contentArea.trigger('click')

    // Check that close event was NOT emitted
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('should display context chunk numbers correctly', () => {
    const wrapper = mount(ContextViewer, {
      props: {
        context: mockContext
      }
    })

    // Check that chunk numbers are displayed correctly
    const chunkLabels = wrapper.findAll('.text-xs')
    mockContext.forEach((_, index) => {
      expect(chunkLabels[index].text()).toContain(`Context Chunk ${index + 1}`)
    })
  })
})
