[prd]
### PRD 2: Advanced Context Retrieval and Compression Strategies

**1\. Title & Overview**

- **Project:** Advanced Context Management - Phase 2

- **Summary:** This phase builds upon the foundational vector-based context storage by introducing intelligent retrieval and summarization strategies. The goal is to move from simply storing context to actively using it to provide more relevant and concise information to the LLM, further reducing token usage and improving response quality.


**2\. Goals & Success Metrics**

- **Business Objectives:**

    - Establish DeepChat as a leader in advanced, user-configurable context management.

    - Significantly improve the "memory" and long-term coherence of conversations.

    - Provide a more cost-effective solution for users of large context models.

- **User Success Metrics:**

    - 50% of users with context compression enabled report a noticeable improvement in response relevance.

    - A further 20% reduction in average token usage for long conversations compared to Phase 1.

    - High user satisfaction with the accuracy and relevance of the retrieved context.


**3\. User Personas**

- **Power User:** Wants to have fine-grained control over how context is managed and retrieved to optimize for specific tasks.

- **Researcher/Analyst:** Needs the AI to recall specific facts and figures from earlier in a long conversation or from provided documents.


**4\. Requirements Breakdown** | Phase | Sprint | User Story | Acceptance Criteria | Duration | |---|---|---|---|---| | Phase 2: Advanced Retrieval | Sprint 5 | As a Power User, I want the application to perform a semantic search on my conversation history in Pinecone before sending a prompt to the LLM. | 1. When I send a new message, it is first embedded using the Ollama model with the `search_query:` prefix.<br>2. This embedding is used to query the Pinecone namespace for the current thread.<br>3. The top N most relevant chunks of conversation history are returned.<br>4. The retrieved context is then passed to the next stage of processing.<br>5. The retrieval process is fast enough to not introduce noticeable latency. | 2 weeks | | Phase 2: Advanced Retrieval | Sprint 6 | As a Researcher/Analyst, I want the retrieved context to be intelligently combined with the most recent messages to form the final context for the LLM. | 1. The system retrieves the last M messages from the current conversation (sliding window).<br>2. The semantically retrieved context from Pinecone is combined with the recent messages.<br>3. A de-duplication process ensures that the same message does not appear twice.<br>4. The combined context is then truncated to fit within the model's context window.<br>5. The final, combined context is sent to the LLM. | 2 weeks | | Phase 2: Advanced Retrieval | Sprint 7 | As a Power User, I want the option to have old conversation history summarized before it is embedded and stored in Pinecone. | 1. A new setting is available to enable "Recursive Summarization".<br>2. When a conversation exceeds a certain length, the oldest messages are sent to an LLM for summarization.<br>3. The resulting summary is then embedded and stored in Pinecone, replacing the original messages.<br>4. This process runs in the background to avoid impacting chat responsiveness.<br>5. The summaries are clearly marked as such in the Pinecone metadata. | 3 weeks | | Phase 2: Advanced Retrieval | Sprint 8 | As a user, I want to see a visual indicator of what context was retrieved and used to generate a response. | 1. After a response is generated, a small, clickable icon appears next to the message.<br>2. Clicking the icon opens a pop-up or drawer that displays the exact text chunks retrieved from Pinecone.<br>3. The UI clearly distinguishes between semantically retrieved context and recent conversation history.<br>4. This feature can be enabled or disabled in the settings.<br>5. The visual indicator is unobtrusive and does not clutter the main chat interface. | 2 weeks |

**5\. Timeline**

- **Sprint 5:** September 29, 2025 - October 10, 2025

- **Sprint 6:** October 13, 2025 - October 24, 2025

- **Sprint 7:** October 27, 2025 - November 14, 2025

- **Sprint 8:** November 17, 2025 - November 28, 2025

- **Total Duration for Phase 2:** 9 Weeks


**6\. Risks & Assumptions**

- **Technical Risks:**

    - The summarization process could introduce hallucinations or lose critical information.

    - The logic for combining retrieved and recent context may be complex to get right, potentially leading to incoherent prompts.

- **Assumptions:**

    - Users will understand the trade-offs between different context management strategies.

    - The performance of the semantic search will be adequate for a real-time chat application.

- **Dependencies:**

    - The foundational infrastructure from Phase 1 must be complete and stable.

    - Requires a reliable and fast LLM for the summarization feature.


**7\. Success Metrics**

- **Primary Metric:** User satisfaction scores related to conversation quality and "memory".

- **Secondary Metrics:**

    - The average relevance score of the retrieved context (measured internally).

    - The number of times users inspect the retrieved context using the new UI feature.

    - A reduction in user complaints about the AI "forgetting" previous parts of the conversation.

### Sub-Sprint 5.1: Semantic Search Implementation

**Objective:** To implement the core semantic search functionality that retrieves relevant conversation history from Pinecone based on the user's latest message.

**Parent Sprint:** Sprint 5: Semantic Search **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Create a function** that takes the user's current message as input.

2. **Embed the message** using the Ollama `nomic-embed-text` model, ensuring the `search_query:` prefix is used.

3. **Use the generated embedding to query** the appropriate Pinecone namespace for the current chat thread.

4. **Configure the query** to retrieve the top N most similar vectors, including their metadata.

5. **Return the text content** from the metadata of the retrieved vectors.


**Acceptance Criteria:**

- The user's message is correctly embedded with the `search_query:` prefix.

- The Pinecone query returns the expected number of results.

- The retrieved results are the most semantically similar to the user's query.

- The function returns a clean list of text chunks from the conversation history.

- The entire process is completed within an acceptable latency for a chat application.


**Dependencies:**

- The Pinecone and Ollama infrastructure from Phase 1.


**Timeline:**

- **Start Date:** September 29, 2025

- **End Date:** October 3, 2025

### Sub-Sprint 6.1: Context Combination Logic

**Objective:** To develop the logic for combining the semantically retrieved context from Pinecone with the most recent messages from the current conversation.

**Parent Sprint:** Sprint 6: Context Combination **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Create a function** that retrieves the last M messages from the active conversation history (sliding window).

2. **Implement a de-duplication mechanism** to prevent messages from appearing in both the recent history and the semantically retrieved context.

3. **Combine the two sets of context** into a single, ordered list of messages.

4. **Prioritize the most recent messages** in the final combined context.

5. **Ensure the final context** is in a format that can be easily passed to the LLM.


**Acceptance Criteria:**

- The function correctly retrieves the last M messages.

- Duplicate messages are effectively removed from the combined context.

- The final context is ordered chronologically, with the most recent messages at the end.

- The combined context is a clean array of message objects.

- The logic is efficient and does not add significant overhead.


**Dependencies:**

- The semantic search function from Sprint 5.


**Timeline:**

- **Start Date:** October 13, 2025

- **End Date:** October 17, 2025

### Sub-Sprint 6.2: Final Truncation and Prompt Assembly

**Objective:** To truncate the combined context to fit within the model's context window and assemble the final prompt to be sent to the LLM.

**Parent Sprint:** Sprint 6: Context Combination **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Tokenize the combined context** to calculate its total length.

2. **If the token count exceeds the model's limit**, truncate the oldest messages from the combined context until it fits.

3. **Assemble the final prompt**, including the system message, the combined context, and the user's latest query.

4. **Pass the final prompt** to the `llmProviderPresenter` for processing.

5. **Log the final token count** and the number of messages included in the prompt.


**Acceptance Criteria:**

- The final context sent to the LLM never exceeds the model's maximum context window.

- The truncation process correctly removes the oldest messages from the combined context.

- The final prompt is correctly formatted and includes all necessary components.

- The `llmProviderPresenter` receives the final, correctly formatted prompt.

- Logs provide clear data on the final prompt's size and composition.


**Dependencies:**

- The context combination logic from the previous sub-sprint.

- A reliable token counting utility.


**Timeline:**

- **Start Date:** October 20, 2025

- **End Date:** October 24, 2025

### Sub-Sprint 7.1: Summarization Service

**Objective:** To create a background service that can summarize old conversation history using an LLM.

**Parent Sprint:** Sprint 7: Recursive Summarization **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Develop a function** that identifies when a conversation has exceeded a configurable length threshold.

2. **When the threshold is met**, the function should take the oldest N messages and send them to an LLM with a summarization prompt.

3. **The summarization prompt** should instruct the LLM to preserve key facts, decisions, and user preferences.

4. **The service should run asynchronously** to avoid blocking the main chat thread.

5. **The generated summary** should be returned for further processing.


**Acceptance Criteria:**

- The service correctly identifies when a conversation needs to be summarized.

- The summarization prompt is effective at creating concise and accurate summaries.

- The summarization process does not introduce noticeable latency for the user.

- The service can handle errors from the summarization LLM gracefully.

- The generated summary is a single, coherent piece of text.


**Dependencies:**

- Access to a configured LLM for summarization (this could be the same as the main chat model or a different one).


**Timeline:**

- **Start Date:** October 27, 2025

- **End Date:** October 31, 2025

### Sub-Sprint 7.2: Embedding and Storing Summaries


**Objective:** To embed the generated summaries and store them in Pinecone, replacing the original, longer messages.

**Parent Sprint:** Sprint 7: Recursive Summarization **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Take the summary text** from the summarization service.

2. **Embed the summary** using the Ollama `nomic-embed-text` model.

3. **Upsert the summary embedding** into the appropriate Pinecone namespace.

4. **The metadata for the summary vector** should clearly indicate that it is a summary and the range of messages it covers.

5. **Delete the original message vectors** that have been replaced by the summary.


**Acceptance Criteria:**

- Summaries are correctly embedded and stored in Pinecone.

- The metadata for summary vectors is accurate and informative.

- The original message vectors are successfully deleted from Pinecone after being summarized.

- The application can distinguish between summary vectors and regular message vectors.

- The entire process is atomic, ensuring that original messages are not deleted unless the summary is successfully stored.


**Dependencies:**

- The summarization service from the previous sub-sprint.

- The Pinecone service from Phase 1.


**Timeline:**

- **Start Date:** November 3, 2025

- **End Date:** November 7, 2025


### Sub-Sprint 8.1: UI for Context Visualization

**Objective:** To create the user interface components that display the retrieved context to the user.

**Parent Sprint:** Sprint 8: Context Visualization **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Design a small, clickable icon** that will be displayed next to AI-generated messages.

2. **Create a pop-up or drawer component** that will be used to display the context.

3. **The component should be able to display** a list of text chunks.

4. **The UI should differentiate** between semantically retrieved context and recent messages.

5. **Ensure the component is well-styled** and does not disrupt the main chat interface.


**Acceptance Criteria:**

- The context icon appears next to messages that were generated using retrieved context.

- Clicking the icon opens the context visualization component.

- The component correctly displays the text of the retrieved context chunks.

- The UI is clear, easy to understand, and visually appealing.

- The component can be closed easily by the user.


**Dependencies:**

- The main chat view component (`ChatView.vue`).


**Timeline:**

- **Start Date:** November 17, 2025

- **End Date:** November 21, 2025
-
-
-### Sub-Sprint 8.2: Data Flow for Context Visualization

**Objective:** To implement the data flow that makes the retrieved context available to the frontend UI components.

**Parent Sprint:** Sprint 8: Context Visualization **Parent PRD:** PRD 2: Advanced Context Retrieval and Compression Strategies

**Tasks:**

1. **Modify the `threadPresenter`** to attach the retrieved context as metadata to the AI's response message.

2. **Update the `chat.ts` Pinia store** to handle this new metadata.

3. **The `MessageItemAssistant.vue` component** should be updated to check for the presence of this metadata.

4. **If the metadata exists**, the component should render the context visualization icon.

5. **When the icon is clicked**, the component should pass the context data to the visualization pop-up/drawer.


**Acceptance Criteria:**

- The retrieved context is successfully passed from the main process to the renderer process.

- The context data is correctly stored in the Pinia store.

- The context icon is only displayed for messages that have retrieved context metadata.

- The visualization component receives and displays the correct context data when opened.

- The data flow is efficient and does not cause performance issues.


**Dependencies:**

- The UI components from the previous sub-sprint.

- The `threadPresenter` and `chat.ts` store.

