### User Story: Visualize Retrieved Context

**As a** Power User, **I want** to see what historical context was provided to the LLM for a specific response, **so that** I can understand its reasoning and verify the effectiveness of the retrieval system.

**Workflow:**
1.  The user sees an AI-generated message in the chat window.
2.  If that message was generated using retrieved context, a small icon (e.g., a brain, a book) appears next to it.
3.  The user clicks on this icon.
4.  A pop-up, modal, or drawer component appears.
5.  This component displays a list of the text chunks that were retrieved from Pinecone and used in the prompt for that specific response.
6.  The user can close this view to return to the chat.

**File Changes:**
-   **Modify**: `src/renderer/src/components/MessageItemAssistant.vue` (or equivalent component for an AI message).
-   **Create**: `src/renderer/src/components/ContextViewer.vue` (a new component to display the context).
-   **Modify**: `src/shared/chat.d.ts` (to add the context data to the message type).

**Actions to Undertake:**
1.  **Filepath**: `src/shared/chat.d.ts`
    -   **Action**: Add a new optional property to the `ChatMessage` interface to hold the retrieved context.
    -   **Implementation**:
        ```typescript
        export interface ChatMessage {
          id: string;
          role: 'user' | 'assistant';
          content: string;
          // ... other properties
          retrievedContext?: string[];
        }
        ```
2.  **Filepath**: `src/renderer/src/components/ContextViewer.vue` (New File)
    -   **Action**: Create a new component to display a list of strings.
    -   **Implementation**:
        ```html
        <template>
          <div class="context-viewer-overlay" @click="$emit('close')">
            <div class="context-viewer-content" @click.stop>
              <h3>Retrieved Context</h3>
              <ul>
                <li v-for="(chunk, index) in context" :key="index">
                  <p>{{ chunk }}</p>
                </li>
              </ul>
              <button @click="$emit('close')">Close</button>
            </div>
          </div>
        </template>

        <script setup>
        defineProps({ context: { type: Array, required: true } });
        defineEmits(['close']);
        </script>

        <style scoped>
        /* Add appropriate styling for a modal/overlay */
        </style>
        ```
3.  **Filepath**: `src/renderer/src/components/MessageItemAssistant.vue`
    -   **Action**: Add the icon and the context viewer component to the template.
    -   **Implementation**:
        ```html
        <template>
          <div class="assistant-message">
            <!-- Existing message content -->
            <div v-html="message.content"></div>

            <!-- Context Icon -->
            <button v-if="message.retrievedContext?.length" @click="showContext = true">
              <Icon name="brain-circuit" /> <!-- Or similar icon -->
            </button>

            <!-- Context Viewer Modal -->
            <ContextViewer 
              v-if="showContext"
              :context="message.retrievedContext"
              @close="showContext = false"
            />
          </div>
        </template>

        <script setup>
        import { ref } from 'vue';
        import ContextViewer from './ContextViewer.vue';
        // ... other imports

        defineProps({ message: Object });
        const showContext = ref(false);
        </script>
        ```

**Acceptance Criteria:**
-   The context icon appears next to messages that were generated using retrieved context.
-   The icon does *not* appear for regular messages or user messages.
-   Clicking the icon opens the context visualization component as a modal or drawer.
-   The component correctly displays the list of text chunks that were used as context.
-   The visualization component can be closed easily by the user.

**Testing Plan:**
-   **Test Case 1 (Component Rendering)**: Write a unit test for `ContextViewer.vue` that passes it a sample array of strings and asserts that they are rendered correctly.
-   **Test Case 2 (Icon Visibility)**: Write a component test for `MessageItemAssistant.vue`. Pass it a message object *with* a `retrievedContext` array and assert the icon is visible. Pass it another message *without* the property and assert the icon is hidden.
-   **Test Case 3 (Modal Interaction)**: In the component test, simulate a click on the icon. Assert that the `ContextViewer` component becomes visible. Then, simulate the `close` event and assert that it becomes hidden.
