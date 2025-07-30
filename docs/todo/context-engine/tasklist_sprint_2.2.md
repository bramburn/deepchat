### Task List: Sub-Sprint 2.2 - Conditional Context Strategy Logic

**Objective:** Implement the main process logic to dynamically switch between context truncation and context compression based on the model's setting.

---

#### **Part 1: Scaffolding the New Service (TDD Prep)**

- [ ] **Create Service File:** Create a new file `src/main/services/ContextCompressionService.ts`.
- [ ] **Create Service Class:** Inside the new file, define and export a class `ContextCompressionService`.
- [ ] **Create Placeholder Method:** Add a public `async` method `processContext(thread: any)`. For now, it can simply log that it was called and return the thread unmodified.
- [ ] **Create Test File:** Create a corresponding test file `src/test/main/services/ContextCompressionService.test.ts`.
- [ ] **Write Basic Test:** Write a simple test to ensure the service can be instantiated and the `processContext` method can be called.

#### **Part 2: Modifying the `threadPresenter`**

- [ ] **Locate the Presenter:** Open the file that manages conversation history before it's sent to an LLM, likely `src/main/presenter/threadPresenter.ts`.
- [ ] **Import Service:** Import the new `ContextCompressionService`.
- [ ] **Instantiate Service:** Create an instance of the service in the presenter's constructor or as a private member.
- [ ] **Find Context Handling Logic:** Identify the function that prepares the message list for the LLM (e.g., `handleMessage`, `prepareContext`).
- [ ] **Add Conditional Logic:**
    - [ ] Inside this function, first retrieve the full configuration for the model being used (e.g., via a `ConfigService` or store).
    - [ ] Add an `if` statement: `if (modelConfig?.contextCompressionEnabled)`.
    - [ ] **If true:** Call `await this.compressionService.processContext(thread)`.
    - [ ] **If false:** Call the existing, old truncation logic.
- [ ] **Add Logging:**
    - [ ] Import the project's shared logger.
    - [ ] Inside the `if` block, add a log entry: `logger.info({ threadId, strategy: 'compression' }, 'Applying context strategy.')`.
    - [ ] Inside the `else` block, add a similar log entry: `logger.info({ threadId, strategy: 'truncation' }, 'Applying context strategy.')`.

#### **Part 3: Testing the Integration (TDD)**

- [ ] **Open `threadPresenter` Test File:** Navigate to the test file for the `threadPresenter`.
- [ ] **Test Case 1: Compression Path:**
    - [ ] Write a test where you provide a mock model config with `contextCompressionEnabled: true`.
    - [ ] Mock the `ContextCompressionService` to spy on its `processContext` method.
    - [ ] Call the presenter's main handling function.
    - [ ] Assert that `compressionService.processContext` **was called**.
    - [ ] Assert that the old truncation logic **was not called**.
- [ ] **Test Case 2: Truncation Path:**
    - [ ] Write a test where the mock model config has `contextCompressionEnabled: false`.
    - [ ] Spy on the old truncation method and the `compressionService.processContext` method.
    - [ ] Call the presenter's main handling function.
    - [ ] Assert that `compressionService.processContext` **was not called**.
    - [ ] Assert that the old truncation logic **was called**.
- [ ] **Test Case 3: Default Behavior:**
    - [ ] Write a test where the mock model config does not have the `contextCompressionEnabled` property at all.
    - [ ] Assert that the old truncation logic is used (the `else` block is the default).

