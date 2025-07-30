### Task List: Sub-Sprint 4.1 - Deletion Event and Namespace Identification

**Objective:** Create the event-driven pipeline to trigger context deletion when a user deletes a chat thread.

---

#### **Part 1: Frontend Trigger (Pinia Store)**

- [ ] **Locate Chat Store:** Open the Pinia store that manages the state of chat threads (e.g., `src/renderer/src/store/chat.ts`).
- [ ] **Find Deletion Action:** Locate the action responsible for deleting a thread, e.g., `deleteThread(threadId: string)`.
- [ ] **Add IPC Call:**
    - [ ] Inside this action, immediately after the line that removes the thread from the state array (e.g., `this.threads.splice(...)`),
    - [ ] Add the IPC call: `window.api.notifyThreadDeleted(threadId)`.
    - [ ] Add a log entry to confirm the notification is being sent from the renderer.

#### **Part 2: Exposing the IPC Channel**

- [ ] **Open Preload Script:** Navigate to `src/preload/index.ts`.
- [ ] **Add to `contextBridge`:**
    - [ ] In the `contextBridge.exposeInMainWorld('api', ...)` object, add a new function.
    - [ ] `notifyThreadDeleted: (threadId: string) => ipcRenderer.send('thread-deleted', threadId)`.
    - **Note:** This uses `ipcRenderer.send` because it's a one-way, fire-and-forget notification. The renderer does not need a response.

#### **Part 3: Main Process Listener**

- [ ] **Locate Presenter:** Open the `src/main/presenter/contextCompressionPresenter.ts` file.
- [ ] **Add IPC Listener:**
    - [ ] In the `register()` method of the presenter class, add a new listener.
    - [ ] `ipcMain.on('thread-deleted', this.handleThreadDeleted);`
- [ ] **Implement Handler Method:**
    - [ ] Create a new private `async` method `handleThreadDeleted = (_event, threadId: string) => { ... }`.
    - [ ] **Input Check:** Add a check to ensure `threadId` is not null or empty.
    - [ ] **Log Reception:** Add a log entry: `logger.info({ threadId }, 'Received notification to delete context.')`.
    - [ ] **Get Service Instance:** Get the singleton instance of the `PineconeService`.
    - [ ] **Call Deletion:** Call `await pineconeService.deleteNamespace(threadId)`. The `threadId` is the namespace.
    - [ ] **Wrap in `try...catch`:** Enclose the service call in a `try...catch` block to log any errors without crashing the listener.

#### **Part 4: Testing (TDD)**

- [ ] **Write Pinia Store Test:**
    - [ ] In the test file for the chat store, write a test for the `deleteThread` action.
    - [ ] Mock `window.api.notifyThreadDeleted`.
    - [ ] Call the action and assert that the mock function was called exactly once with the correct `threadId`.
- [ ] **Write Presenter Test:**
    - [ ] In the test file for `contextCompressionPresenter.ts`, write a new test for the listener.
    - [ ] Mock the `PineconeService.getInstance().deleteNamespace` method.
    - [ ] Simulate the IPC event by emitting `ipcMain.emit('thread-deleted', 'some-thread-id')`.
    - [ ] Assert that the mocked `deleteNamespace` method was called with `'some-thread-id'`.
