### Implementation Guidance: Sub-Sprint 8.1 - UI for Context Visualization

This guide provides technical direction for creating the UI elements that allow a user to inspect the context used for a specific AI response.

**Objective:** To create the user interface components that display the retrieved context to the user.

**1. Shared Data Structure (`chat.d.ts`)**

First, the core `ChatMessage` type must be updated to support the new data. This is a critical step that affects both the main and renderer processes.

-   **File:** `src/shared/chat.d.ts`
-   **Action:** Add an optional `retrievedContext` property.

```typescript
// src/shared/chat.d.ts

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // ... any other existing properties

  // Holds the text of the context chunks retrieved from Pinecone for this response.
  retrievedContext?: string[];
}
```

**2. The `ContextViewer` Component**

This should be a simple, reusable component whose only job is to display a list of strings in a modal or drawer.

-   **File:** `src/renderer/src/components/ContextViewer.vue` (Create this new file)
-   **Action:** Implement a self-contained modal component.

```html
<!-- src/renderer/src/components/ContextViewer.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" @click="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" @click.stop>
      <h3 class="text-lg font-medium text-gray-900 mb-4">Retrieved Context</h3>
      <div class="overflow-y-auto space-y-4 pr-2">
        <div v-for="(chunk, index) in context" :key="index" class="text-sm text-gray-700 border-l-4 border-gray-200 pl-4 py-2">
          <p>{{ chunk }}</p>
        </div>
      </div>
      <div class="mt-6 text-right">
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-200 rounded-md">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  context: {
    type: Array as PropType<string[]>,
    required: true,
  },
});

defineEmits(['close']);
</script>
```

**3. The Message Component (`MessageItemAssistant.vue`)**

This component needs to be modified to conditionally render the icon and the `ContextViewer` modal.

-   **File:** `src/renderer/src/components/MessageItemAssistant.vue` (or similar)
-   **Action:** Add the icon, the modal instance, and the controlling logic.

```html
<!-- src/renderer/src/components/MessageItemAssistant.vue -->
<template>
  <div class="assistant-message-wrapper relative group">
    <!-- Existing message bubble -->
    <div class="message-bubble">
      <div v-html="renderMarkdown(message.content)"></div>
    </div>

    <!-- Context Icon - appears on hover/focus within the group -->
    <div v-if="message.retrievedContext && message.retrievedContext.length > 0" class="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button @click="isContextViewerOpen = true" class="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
        <!-- Find a suitable icon from a library like lucide-vue-next -->
        <BrainCircuitIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Context Viewer Modal -->
    <teleport to="body">
      <ContextViewer
        v-if="isContextViewerOpen"
        :context="message.retrievedContext || []"
        @close="isContextViewerOpen = false"
      />
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ChatMessage } from '@/shared/chat.d';
import ContextViewer from './ContextViewer.vue';
import { BrainCircuitIcon } from 'lucide-vue-next'; // Example icon library

defineProps<{ message: ChatMessage }>();

const isContextViewerOpen = ref(false);

// Assume renderMarkdown is a utility function you have
const renderMarkdown = (text: string) => { /* ... */ };
</script>
```

**4. Key Considerations:**

-   **Icon Choice:** Use a clear and intuitive icon. A brain, a book, a magnifying glass, or a history icon are all good choices.
-   **Modal vs. Drawer:** A modal is a good choice for desktop, but a drawer that slides up from the bottom might be better for a mobile-responsive design.
-   **`<teleport>`:** Using Vue's `<teleport to="body">` for the modal is best practice. It prevents z-index and styling issues by rendering the modal at the top level of the DOM, outside the nested structure of the chat window.
-   **UX:** The icon should be subtle and not clutter the UI. Making it appear on hover (using `group-hover` with Tailwind CSS, as in the example) is a good way to achieve this.
