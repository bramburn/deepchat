### Task List: Sub-Sprint 8.1 - UI for Context Visualization

**Objective:** Create the Vue components necessary to display the retrieved context in a modal.

---

#### **Part 1: Data Structure Update**

- [ ] **Open Shared Type:** Navigate to `src/shared/chat.d.ts`.
- [ ] **Add Property:** Add `retrievedContext?: string[];` to the `ChatMessage` interface. This makes the change available to both the main and renderer processes.

#### **Part 2: Context Viewer Component (TDD)**

- [ ] **Create Component File:** Create `src/renderer/src/components/ContextViewer.vue`.
- [ ] **Create Test File:** Create a corresponding test file for the new component.
- [ ] **Write Component Test:**
    - [ ] Write a test that mounts the component.
    - [ ] Pass an array of strings to its `context` prop.
    - [ ] Assert that the component renders a list (`<ul>`) with the correct number of `<li>` elements, and that the text content matches the prop.
    - [ ] Write a test that simulates a click on the overlay or the close button and asserts that a `close` event is emitted.
- [ ] **Implement Component:**
    - [ ] In `ContextViewer.vue`, create the template with an overlay `<div>`, a content `<div>`, a title, a `v-for` loop to render the context chunks, and a close button.
    - [ ] In the script, define the `context` prop and the `close` event emitter.
    - [ ] Add basic CSS scoping to style the component as a modal.

#### **Part 3: Message Component Integration (TDD)**

- [ ] **Open Component Test File:** Open the test file for `MessageItemAssistant.vue`.
- [ ] **Write Visibility Tests:**
    - [ ] **Test Case 1 (Icon Hidden):** Mount the component with a message prop that does *not* have the `retrievedContext` property. Assert that the context icon button is not rendered.
    - [ ] **Test Case 2 (Icon Visible):** Mount the component with a message prop that *does* have a non-empty `retrievedContext` array. Assert that the icon button *is* rendered.
- [ ] **Write Interaction Test:**
    - [ ] Mount the component with context data.
    - [ ] Simulate a click on the icon button.
    - [ ] Assert that the `ContextViewer` component is now visible (e.g., `v-if` is true).
    - [ ] Simulate the `close` event from the `ContextViewer` and assert it becomes hidden again.
- [ ] **Implement in Component:**
    - [ ] Open `src/renderer/src/components/MessageItemAssistant.vue`.
    - [ ] Import `ref` from `vue` and the new `ContextViewer` component.
    - [ ] Add `const showContext = ref(false);` to the script.
    - [ ] In the template, add the icon button with a `v-if="message.retrievedContext?.length"` and a `@click="showContext = true"`.
    - [ ] Add the `<ContextViewer>` component, binding its visibility to `showContext`, its `context` prop to `message.retrievedContext`, and its `@close` event to `showContext = false`.
    - [ ] Wrap the `<ContextViewer>` in a `<teleport to="body">` tag for proper modal behavior.
