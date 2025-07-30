### User Story: Display Retrieved Context in UI

**As a** Power User, **I want** the context data that was used to generate an AI response to be available to the frontend, **so that** I can click the visualization icon and see the relevant information.

**Workflow:**
1.  In the `threadPresenter`, after the `ContextCompressionService` has retrieved and finalized the context messages, this list of context strings is stored.
2.  When the LLM provides its final response, the `threadPresenter` creates the assistant's `ChatMessage` object.
3.  It attaches the stored list of context strings to the `retrievedContext` property of this new message object.
4.  This complete `ChatMessage` object is sent to the renderer process via the existing IPC channel.
5.  The `chat.ts` Pinia store receives the new message and adds it to the active thread's state.
6.  Because the `retrievedContext` property is now in the state, the Vue component (`MessageItemAssistant.vue`) automatically becomes reactive to it, showing the visualization icon.
7.  When the icon is clicked, the component passes the `message.retrievedContext` array to the `ContextViewer` prop.

**File Changes:**
-   **Modify**: `src/main/presenter/threadPresenter.ts`
-   **Modify**: `src/renderer/src/store/chat.ts`

**Actions to Undertake:**
1.  **Filepath**: `src/main/presenter/threadPresenter.ts`
    -   **Action**: Modify the main message handler to attach the context data to the final AI message.
    -   **Implementation**:
        ```typescript
        // In the main message handling function

        // ... after retrieving and truncating the context into `finalMessages`
        const contextStrings = finalMessages.map(m => m.content);

        // ... after the LLM provider returns the assistant's response text (`responseText`)

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
          // Attach the context used for this specific response
          retrievedContext: contextStrings,
        };

        // Send the complete assistantMessage object to the renderer
        event.sender.send('llm-response-chunk', { message: assistantMessage, done: true });
        ```
2.  **Filepath**: `src/renderer/src/store/chat.ts`
    -   **Action**: Ensure the store action that handles incoming AI messages correctly processes the new property.
    -   **Implementation**:
        ```typescript
        // In the chat Pinia store, inside the action that handles 'llm-response-chunk'

        // When `done` is true:
        const existingMessage = findMessageById(payload.message.id);
        if (existingMessage) {
          // Update the final properties of the message
          existingMessage.content = payload.message.content;
          existingMessage.retrievedContext = payload.message.retrievedContext; // Make sure to set this
        } else {
          // Add the new message to the state
          this.activeThread.messages.push(payload.message);
        }
        ```

**Acceptance Criteria:**
-   The retrieved context (as an array of strings) is successfully passed from the main process to the renderer process with the final AI message object.
-   The context data is correctly stored in the Pinia store, associated with the correct message.
-   The context icon is only displayed for assistant messages that have a non-empty `retrievedContext` array.
-   The visualization component receives and displays the correct context data when opened.
-   The data flow is efficient and does not cause noticeable performance degradation.

**Testing Plan:**
-   **Test Case 1 (Presenter Logic)**: In the `threadPresenter` test, after mocking the full RAG pipeline, assert that the final `assistantMessage` object passed to the renderer includes the `retrievedContext` property with the expected content.
-   **Test Case 2 (Pinia Store)**: In the chat store test, simulate receiving a final message payload containing the `retrievedContext` array. Verify that the property is correctly added to the message in the store's state.
-   **Test Case 3 (End-to-End Data Flow)**: Manually run the application. Trigger a response that uses context retrieval. Verify the icon appears. Click the icon and confirm that the displayed context matches what was logged in the main process.
