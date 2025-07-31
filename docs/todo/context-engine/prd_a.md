[prd]
### PRD 1: Foundational Vector-Based Context Compression

**1\. Title & Overview**

- **Project:** Advanced Context Management with Vector-Based Compression
    
- **Summary:** This phase focuses on building the foundational infrastructure to enable chat history compression using Pinecone for vector storage and a locally-run Ollama model for embeddings. It includes adding the necessary UI for configuration and the core backend logic for embedding, storing, and deleting chat context.
    

**2\. Goals & Success Metrics**

- **Business Objectives:**
    
    - Introduce a powerful, cost-effective context management feature to differentiate DeepChat.
        
    - Reduce token consumption for users on paid LLM plans.
        
    - Enhance the performance of local models by providing more relevant context.
        
- **User Success Metrics:**
    
    - 10% of users enable and configure the context compression feature within the first month of release.
        
    - A measurable reduction in the average number of tokens sent per turn in long conversations.
        
    - Successful creation and deletion of Pinecone namespaces corresponding to chat threads.
        

**3\. User Personas**

- **Power User:** A user who frequently engages in long, complex conversations and wants to optimize token usage and improve the relevance of AI responses.
    
- **Local Model Enthusiast:** A user who primarily uses local models via Ollama and wants to overcome the context limitations of smaller models.
    

**4\. Requirements Breakdown** | Phase | Sprint | User Story | Acceptance Criteria | Duration | |---|---|---|---|---| | Phase 1: Foundation | Sprint 1 | As a Power User, I want to configure my Pinecone and Ollama settings in the application so that I can use them for context compression. | 1. A new section is added to the main settings page for "Context Compression".<br>2. I can input and save my Pinecone API key and environment.<br>3. I can specify the Ollama model to be used for embeddings (e.g., `nomic-embed-text`).<br>4. The application validates the credentials and model availability upon saving.<br>5. All sensitive information is securely stored. | 2 weeks | | Phase 1: Foundation | Sprint 2 | As a Power User, I want to enable or disable context compression for each individual model in the model settings pop-up. | 1. A new toggle switch labeled "Enable Context Compression" is present in the model configuration dialog.<br>2. The toggle is only enabled if the Pinecone and Ollama settings are correctly configured.<br>3. The state of the toggle is saved and persists for each model configuration.<br>4. When enabled, the application uses the new context compression workflow for this model.<br>5. When disabled, the application uses the existing truncation strategy. | 2 weeks | | Phase 1: Foundation | Sprint 3 | As a Local Model Enthusiast, I want my chat history to be automatically chunked, embedded, and stored in Pinecone when context compression is enabled. | 1. When a message is sent or received, it is processed by a new "Context Compression Service".<br>2. The service chunks the message content into appropriate sizes.<br>3. Each chunk is sent to the configured Ollama model to generate an embedding.<br>4. The embedding and its corresponding text are `upserted` into a Pinecone index.<br>5. A unique Pinecone namespace is created for each chat thread to ensure data isolation. | 2 weeks | | Phase 1: Foundation | Sprint 4 | As a user, I want the compressed context for a chat thread to be deleted from Pinecone when I delete the thread in the application. | 1. When a user deletes a chat thread, an event is triggered to the "Context Compression Service".<br>2. The service identifies the Pinecone namespace associated with the deleted thread.<br>3. A `delete` operation is performed on the Pinecone index to remove all vectors in that namespace.<br>4. The deletion is confirmed, and there is no orphaned data in Pinecone.<br>5. The operation is handled gracefully if the namespace does not exist. | 2 weeks |

**5\. Timeline**

- **Sprint 1:** August 5, 2025 - August 16, 2025
    
- **Sprint 2:** August 19, 2025 - August 30, 2025
    
- **Sprint 3:** September 1, 2025 - September 12, 2025
    
- **Sprint 4:** September 15, 2025 - September 26, 2025
    
- **Total Duration for Phase 1:** 8 Weeks
    

**6\. Risks & Assumptions**

- **Technical Risks:**
    
    - The performance of the local Ollama embedding model may be a bottleneck, leading to delays in chat responsiveness.
        
    - Handling Pinecone API rate limits and errors gracefully is crucial to avoid data loss.
        
- **Assumptions:**
    
    - Users will have a running Ollama instance with the `nomic-embed-text` model pulled.
        
    - Users will have a Pinecone account and be able to provide the necessary credentials.
        
- **Dependencies:**
    
    - Requires a stable interface with the Ollama API for generating embeddings.
        
    - Depends on the Pinecone API for all vector storage and retrieval operations.
        

**7\. Success Metrics**

- **Primary Metric:** Percentage of active users who have successfully configured and enabled the context compression feature.
    
- **Secondary Metrics:**
    
    - Average token reduction per conversation turn for users with the feature enabled.
        
    - User feedback on the perceived improvement in response relevance and conversation quality.
        
    - Number of support tickets related to the configuration or functionality of the new feature.

### Sub-Sprint 1.1: Configuration UI

**Objective:** To create the user interface components within the main settings page that allow users to configure their Pinecone and Ollama credentials for the context compression feature.

**Parent Sprint:** Sprint 1: Configuration UI **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Create a new "Context Compression" section** in the `SettingsTabView.vue` component.
    
2. **Add input fields** for the Pinecone API key and environment.
    
3. **Add a text input or dropdown** for the user to specify the Ollama embedding model (e.g., `nomic-embed-text`).
    
4. **Implement a "Save" button** that triggers the configuration saving logic.
    
5. **Develop a validation mechanism** that checks the format of the inputs and provides feedback to the user.
    

**Acceptance Criteria:**

- The new "Context Compression" section is clearly visible on the settings page.
    
- Users can input and save their Pinecone API key and environment.
    
- Users can specify the Ollama model they want to use for embeddings.
    
- The application provides clear validation messages for incorrect or missing inputs.
    
- Saved credentials are not displayed in plain text after being saved.
    

**Dependencies:**

- Access to the `SettingsTabView.vue` component and its underlying data store.
    

**Timeline:**

- **Start Date:** August 5, 2025
    
- **End Date:** August 9, 2025

### Sub-Sprint 1.2: Backend Configuration Logic

**Objective:** To implement the backend logic required to securely store and validate the Pinecone and Ollama configurations provided by the user.

**Parent Sprint:** Sprint 1: Configuration UI **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Create a new module** in the main process to handle context compression settings.
    
2. **Implement a method to securely store** the Pinecone API key using `electron-store` or a similar secure storage mechanism.
    
3. **Develop a function to validate** the Pinecone credentials by making a test API call.
    
4. **Implement a function to check the availability** of the specified Ollama model by querying the local Ollama server.
    
5. **Create an IPC channel** for the renderer process to send the configuration data to the main process for saving and validation.
    

**Acceptance Criteria:**

- Pinecone API keys are stored securely and are not accessible in plain text.
    
- The application can successfully validate Pinecone credentials against the Pinecone API.
    
- The application can confirm that the specified Ollama model is available on the user's local server.
    
- The frontend receives a success or failure message after attempting to save the configuration.
    
- Errors during validation are logged and communicated to the user.
    

**Dependencies:**

- `electron-store` for secure storage.
    
- `node-fetch` or a similar library for making API calls to Pinecone and Ollama.
    

**Timeline:**

- **Start Date:** August 12, 2025
    
- **End Date:** August 16, 2025

### Sub-Sprint 2.1: Model-Specific Toggle UI

**Objective:** To add a toggle switch to the model settings pop-up that allows users to enable or disable context compression for individual models.

**Parent Sprint:** Sprint 2: Model-Specific Toggle **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Modify the `ModelConfigDialog.vue` component** to include a new "Enable Context Compression" toggle switch.
    
2. **Implement logic to disable the toggle** if the main Pinecone and Ollama settings have not been configured.
    
3. **Ensure the state of the toggle** is saved as part of the model's configuration.
    
4. **Update the UI to visually indicate** whether context compression is active for a given model.
    
5. **Connect the toggle's state** to the application's central state management (Pinia store).
    

**Acceptance Criteria:**

- The "Enable Context Compression" toggle is visible in the model settings dialog.
    
- The toggle is disabled with a tooltip explaining why if the main settings are incomplete.
    
- The on/off state of the toggle is correctly saved and loaded for each model.
    
- The UI clearly reflects the current state of the context compression setting for the model.
    
- The application's state is updated in real-time when the toggle is changed.
    

**Dependencies:**

- Access to the `ModelConfigDialog.vue` component and the `settings.ts` Pinia store.
    

**Timeline:**

- **Start Date:** August 19, 2025
    
- **End Date:** August 23, 2025

### Sub-Sprint 2.1: Model-Specific Toggle UI

**Objective:** To add a toggle switch to the model settings pop-up that allows users to enable or disable context compression for individual models.

**Parent Sprint:** Sprint 2: Model-Specific Toggle **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Modify the `ModelConfigDialog.vue` component** to include a new "Enable Context Compression" toggle switch.
    
2. **Implement logic to disable the toggle** if the main Pinecone and Ollama settings have not been configured.
    
3. **Ensure the state of the toggle** is saved as part of the model's configuration.
    
4. **Update the UI to visually indicate** whether context compression is active for a given model.
    
5. **Connect the toggle's state** to the application's central state management (Pinia store).
    

**Acceptance Criteria:**

- The "Enable Context Compression" toggle is visible in the model settings dialog.
    
- The toggle is disabled with a tooltip explaining why if the main settings are incomplete.
    
- The on/off state of the toggle is correctly saved and loaded for each model.
    
- The UI clearly reflects the current state of the context compression setting for the model.
    
- The application's state is updated in real-time when the toggle is changed.
    

**Dependencies:**

- Access to the `ModelConfigDialog.vue` component and the `settings.ts` Pinia store.
    

**Timeline:**

- **Start Date:** August 19, 2025
    
- **End Date:** August 23, 2025


### Sub-Sprint 2.2: Conditional Context Strategy Logic

**Objective:** To implement the backend logic that conditionally applies the new context compression workflow based on the model-specific toggle setting.

**Parent Sprint:** Sprint 2: Model-Specific Toggle **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Modify the `threadPresenter`** to check if context compression is enabled for the current model before processing a new message.
    
2. **Create a new "Context Compression Service"** that will be called if the feature is enabled.
    
3. **Ensure that if the feature is disabled**, the application falls back to the existing truncation strategy without any errors.
    
4. **Implement the routing logic** that directs the conversation flow to the appropriate context management strategy.
    
5. **Add logging to track** which context strategy is being used for each conversation turn.
    

**Acceptance Criteria:**

- The `threadPresenter` correctly identifies whether context compression is enabled for the active model.
    
- If enabled, the conversation is passed to the new "Context Compression Service".
    
- If disabled, the existing truncation logic is executed as normal.
    
- The application can seamlessly switch between context management strategies based on the model's settings.
    
- Logs clearly indicate which context strategy was used for a given request.
    

**Dependencies:**

- Access to the model configuration data within the `threadPresenter`.
    

**Timeline:**

- **Start Date:** August 26, 2025
    
- **End Date:** August 30, 2025

### Sub-Sprint 3.1: Message Chunking and Embedding

**Objective:** To implement the core logic for chunking chat messages and generating embeddings using the user-configured Ollama model.

**Parent Sprint:** Sprint 3: Embedding and Storage **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Implement a text chunking utility** that can split long messages into smaller, semantically meaningful chunks.
    
2. **Create a function that takes a text chunk** and sends it to the local Ollama server's `/api/embed` endpoint.
    
3. **Ensure the function uses the `nomic-embed-text` model** with the correct `search_document:` prefix.
    
4. **Handle potential errors** from the Ollama API, such as the model not being available or the server not running.
    
5. **Return the generated embedding** for each chunk to be used in the next step.
    

**Acceptance Criteria:**

- Text is correctly chunked into segments of a configurable size.
    
- The application can successfully generate embeddings for text chunks using the specified Ollama model.
    
- The correct prefix is used for the embedding request to ensure optimal performance.
    
- The system gracefully handles errors from the Ollama API and provides informative logs.
    
- The generated embeddings are in the expected format and dimensionality (768 for `nomic-embed-text`).
    

**Dependencies:**

- A running Ollama instance with the `nomic-embed-text` model.
    

**Timeline:**

- **Start Date:** September 1, 2025
    
- **End Date:** September 5, 2025

### Sub-Sprint 3.2: Pinecone Integration and Storage

**Objective:** To integrate with the Pinecone API to store the generated embeddings in a way that isolates each chat thread.

**Parent Sprint:** Sprint 3: Embedding and Storage **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Implement a Pinecone service** that can `upsert` vectors into a specified index.
    
2. **Generate a unique namespace** for each new chat thread.
    
3. **Construct the payload for the `upsert` operation**, including the vector, its ID, and relevant metadata (e.g., the original text, role, timestamp).
    
4. **Ensure that all embeddings for a given thread** are stored in the correct namespace.
    
5. **Implement error handling** for Pinecone API requests, including connection issues and rate limiting.
    

**Acceptance Criteria:**

- The application can successfully `upsert` embeddings and metadata into a Pinecone index.
    
- Each chat thread is assigned a unique and correctly formatted Pinecone namespace.
    
- The metadata stored with each vector is accurate and complete.
    
- The system can handle and log errors from the Pinecone API without crashing.
    
- Data for different chat threads is correctly isolated and not mixed.
    

**Dependencies:**

- A valid Pinecone API key and environment configuration.
    

**Timeline:**

- **Start Date:** September 8, 2025
    
- **End Date:** September 12, 2025

### Sub-Sprint 4.1: Deletion Event and Namespace Identification

**Objective:** To create the event handling mechanism that triggers the context deletion process and correctly identifies the Pinecone namespace associated with a deleted chat thread.

**Parent Sprint:** Sprint 4: Context Deletion **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Modify the `chat.ts` Pinia store** to emit an event when a thread is deleted.
    
2. **Create an IPC listener** in the main process that listens for the "thread-deleted" event.
    
3. **Pass the `threadId`** from the renderer to the main process as part of the event payload.
    
4. **Implement a mapping or lookup mechanism** to associate a `threadId` with its corresponding Pinecone namespace.
    
5. **Ensure the correct namespace** is identified and passed to the Pinecone deletion service.
    

**Acceptance Criteria:**

- Deleting a thread in the UI correctly triggers the "thread-deleted" event.
    
- The main process receives the event with the correct `threadId`.
    
- The system can accurately look up the Pinecone namespace for any given `threadId`.
    
- The correct namespace is passed to the deletion logic.
    
- The system handles cases where a `threadId` might not have an associated namespace (e.g., if context compression was never enabled for that thread).
    

**Dependencies:**

- Access to the `chat.ts` store and the main process's IPC handling logic.
    

**Timeline:**

- **Start Date:** September 15, 2025
    
- **End Date:** September 19, 2025

### Sub-Sprint 4.2: Pinecone Deletion Logic

**Objective:** To implement the logic that deletes all vectors associated with a specific namespace in Pinecone.

**Parent Sprint:** Sprint 4: Context Deletion **Parent PRD:** PRD 1: Foundational Vector-Based Context Compression

**Tasks:**

1. **Create a function in the Pinecone service** that takes a namespace as input.
    
2. **Implement the `delete` operation** using the Pinecone SDK, with `delete_all=True` and the specified namespace.
    
3. **Add robust error handling** to manage potential issues with the Pinecone API during the deletion process.
    
4. **Include logging to confirm** that the deletion operation was initiated and completed successfully.
    
5. **Ensure the function handles cases** where the namespace might not exist in Pinecone without throwing an error.
    

**Acceptance Criteria:**

- Calling the deletion function with a valid namespace removes all vectors from that namespace in Pinecone.
    
- The application does not crash or enter an error state if the Pinecone API is unavailable.
    
- Success and failure of the deletion operation are clearly logged.
    
- Attempting to delete a non-existent namespace is handled gracefully.
    
- The function returns a clear status indicating the outcome of the deletion attempt.
    

**Dependencies:**

- A configured Pinecone client and a valid index.
    

**Timeline:**

- **Start Date:** September 22, 2025
    
- **End Date:** September 26, 2025
