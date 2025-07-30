### Implementation Guidance: Sub-Sprint 8.2 - Data Flow for Context Visualization

This guide provides technical direction for plumbing the retrieved context data from the backend main process to the frontend Vue components.

**Objective:** To implement the data flow that makes the retrieved context available to the frontend UI components.

**1. `threadPresenter` - Attaching the Data**

The `threadPresenter` is the last point in the main process that has access to both the final context list and the AI's response. This is the ideal place to attach the data.

-   **File:** `src/main/presenter/threadPresenter.ts`
-   **Action:** Modify the end of the message handling flow.

```typescript
// src/main/presenter/threadPresenter.ts

// In the main message handling function...

// ... after the full RAG pipeline has run and you have `finalMessagesForPrompt`
// and the LLM has returned a response, `assistantResponseText`.

// Keep a copy of the context strings that were actually used.
const contextUsed = finalMessagesForPrompt.map(m => m.content);

const assistantMessage: ChatMessage = {
  id: uuidv4(),
  role: 'assistant',
  content: assistantResponseText,
  timestamp: Date.now(),
  // Attach the context here.
  retrievedContext: contextUsed,
};

// Now, when you send this message to the renderer, it will contain the context data.
// This assumes you have an IPC channel, e.g., 'add-assistant-message'
event.sender.send('add-assistant-message', assistantMessage);

// Also add the message to the thread in the main process state
this.threadService.addMessageToThread(thread.id, assistantMessage);
```

**2. Pinia Store - Receiving and Storing the Data**

The renderer's state management needs to be aware of the new `retrievedContext` property.

-   **File:** `src/renderer/src/store/chat.ts`
-   **Action:** Ensure the IPC listener and corresponding action correctly handle the new message shape.

```typescript
// src/renderer/src/store/chat.ts
import { defineStore } from 'pinia';
import type { ChatMessage, ChatThread } from '@/shared/chat.d';

export const useChatStore = defineStore('chat', {
  state: () => ({
    activeThread: null as ChatThread | null,
    // ...
  }),
  actions: {
    // This action would be called by an IPC listener
    addAssistantMessage(message: ChatMessage) {
      if (this.activeThread) {
        // The message object from the backend now includes `retrievedContext`,
        // and since it's part of the type, it will be added to the state automatically.
        this.activeThread.messages.push(message);
      }
    },

    // Example of setting up the listener (e.g., in your App.vue)
    // window.api.onAddAssistantMessage((message) => {
    //   this.addAssistantMessage(message);
    // });
  },
});
```

**3. Vue Component - Consuming the Data**

No changes are needed here if Sprint 8.1 was implemented correctly. The `MessageItemAssistant.vue` component will now automatically react to the presence of the `message.retrievedContext` data that is flowing from the Pinia store.

**Review of the Data Flow:**

1.  **Main Process (`threadPresenter`):**
    -   Gathers context strings.
    -   Gets AI response.
    -   Creates `assistantMessage` object.
    -   **Attaches `retrievedContext: string[]` to the object.**
    -   Sends the complete object over IPC.

2.  **IPC Channel (`ipcMain` -> `ipcRenderer`):**
    -   Transmits the serialized `assistantMessage` object.

3.  **Renderer Process (`chat.ts` store):**
    -   Receives the object from the IPC listener.
    -   Calls an action to push the complete object into the `activeThread.messages` array.

4.  **Renderer Process (`MessageItemAssistant.vue`):**
    -   The component is part of a `v-for` loop over the `activeThread.messages` array.
    -   Its `message` prop now contains the `retrievedContext` property.
    -   The `v-if="message.retrievedContext?.length"` condition for the icon now evaluates to `true`.
    -   The `:context` prop for the `<ContextViewer>` is now populated.

**4. Key Considerations:**

-   **Data Size:** Be mindful of the amount of data you're sending over IPC. Sending a few kilobytes of text per message is perfectly fine, but avoid sending excessively large payloads.
-   **Immutability:** When adding the message to the store, ensure you're not mutating state improperly. Using methods like `push` or creating new state objects (`...state`) is standard practice.
-   **Clean Handoff:** The `threadPresenter`'s job is done once it sends the message object. It shouldn't be involved in any UI logic. This separation of concerns is crucial.
