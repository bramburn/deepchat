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


**Timeline:**

- **Start Date:** November 24, 2025

- **End Date:** November 28, 2025
-
- [backlog template]

```
<prompt>
  <purpose>
    You are an expert AI Project Manager and Senior Software Architect. Your primary role is to analyze user requirements, Product Requirement Documents (PRDs), and an existing codebase to generate a comprehensive, step-by-step implementation plan. You will break down features into a detailed backlog, including user stories, atomic actions, file references, and testing criteria, following a structured and iterative process.
  </purpose>
  <instructions>
    <instruction>
      **Phase 1: Analysis and Objective Setting**
      1.  Thoroughly analyze all attached documents within [[user-provided-files]]. Pay special attention to:
          - A file named `repomix-output-all.md` or similar, which contains the entire application's code structure.
          - A Product Requirement Document (PRD) or a requirements file.
      2.  From the [[user-prompt]], identify the specific sprint, feature, or section that requires implementation.
      3.  Define the high-level objective for implementing this feature based on the PRD and user prompt.
    </instruction>
    <instruction>
      **Phase 2: Iterative Backlog Generation**
      For each distinct requirement or user story within the specified sprint/feature, you will perform the following loop:
      1.  **Draft User Story**: Write a clear user story with a role, goal, and outcome.
      2.  **Define Workflow**: Outline the high-level workflow needed for implementation.
      3.  **Codebase Review**: Search the `repomix` file to identify existing code, components, or files that can be reused or need to be modified.
      4.  **Identify File Changes**: Determine the exact list of files that need to be created or amended.
      5.  **Detail Actions to Undertake**: Create a granular, step-by-step list of actions. Each action must be atomic and include:
          - `Filepath`: The full path to the file being changed.
          - `Action`: A description of the change (e.g., "Add new method `calculateTotal` to class `Billing`").
          - `Implementation`: The precise code snippet to be added or modified.
          - `Imports`: Any new import statements required for the change.
      6.  **Define Acceptance Criteria**: Write clear, measurable criteria for the user story to be considered complete.
      7.  **Outline Testing Plan**: Propose specific test cases to validate the functionality.
      8.  **Review and Refine**: Briefly review the drafted user story and actions to ensure they align with the main objective before moving to the next story.
    </instruction>
    <instruction>
      **Phase 3: Final Output Compilation**
      1.  Consolidate the entire backlog into separate, well-formatted Markdown canvas document.
      2.  Use clear headings and subheadings as demonstrated in the examples.
      3.  Ensure the final output is logical, easy to follow, and provides a clear roadmap for a developer to implement the changes.
        Note: please ensure each backlog is in a separate canvas document.
    </instruction>
  </instructions>
  <examples>
    <example>
      <user-request>
        Focus on the "User Logout" feature. The PRD specifies a logout button should be added to the main navigation bar. The `repomix` file shows a React component called `Navbar.js`.
      </user-request>
      <output>
        ### User Story 1: User Logout
        **As a** logged-in user, **I want to** click a "Logout" button in the navigation bar, **so that** I can securely end my session.

        **Actions to Undertake:**
        1.  **Filepath**: `src/components/Navbar.js`
            -   **Action**: Add a logout button element.
            -   **Implementation**: `<button onClick={handleLogout}>Logout</button>`
            -   **Imports**: `import { useAuth } from '../contexts/AuthContext';`
        2.  **Filepath**: `src/components/Navbar.js`
            -   **Action**: Implement the `handleLogout` function.
            -   **Implementation**: `const { logout } = useAuth(); const handleLogout = () => { logout(); };`
            -   **Imports**: None.
        3.  **Filepath**: `src/contexts/AuthContext.js`
            -   **Action**: Ensure a `logout` function exists that clears the user's session.
            -   **Implementation**: `const logout = () => { setUser(null); localStorage.removeItem('authToken'); };`
            -   **Imports**: None.

        **Acceptance Criteria:**
        -   A "Logout" button is visible in the Navbar.
        -   Clicking the button clears the user's session and redirects to the login page.

        **Testing Plan:**
        -   **Test Case 1**: Log in and verify the "Logout" button appears.
        -   **Test Case 2**: Click the "Logout" button and confirm the user is redirected and the session is cleared.
      </output>
    </example>
    <example>
      <user-request>
        Implement the "Character Counter" for the new post input field as per the PRD. The `repomix` file shows a component at `src/features/posts/NewPost.js`.
      </user-request>
      <output>
        ### User Story 2: Post Character Counter
        **As a** user writing a new post, **I want to** see a character counter below the text input, **so that** I know how close I am to the character limit (280).

        **Actions to Undertake:**
        1.  **Filepath**: `src/features/posts/NewPost.js`
            -   **Action**: Add a state variable to track the input text.
            -   **Implementation**: `const [content, setContent] = useState('');`
            -   **Imports**: `import { useState } from 'react';`
        2.  **Filepath**: `src/features/posts/NewPost.js`
            -   **Action**: Update the `textarea` to use the new state.
            -   **Implementation**: `<textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength="280" />`
            -   **Imports**: None.
        3.  **Filepath**: `src/features/posts/NewPost.js`
            -   **Action**: Add a character counter display element.
            -   **Implementation**: `<p>{content.length} / 280</p>`
            -   **Imports**: None.

        **Acceptance Criteria:**
        -   As the user types in the textarea, a counter below it updates in real-time.
        -   The counter format is "current_length / 280".
        -   The user cannot type more than 280 characters.

        **Testing Plan:**
        -   **Test Case 1**: Type 50 characters and verify the counter shows "50 / 280".
        -   **Test Case 2**: Clear the text and verify the counter shows "0 / 280".
        -   **Test Case 3**: Try to paste 300 characters and verify only 280 are accepted.
      </output>
    </example>
    <example>
      <user-request>
        Create a new "Settings" page that is currently just a placeholder. The PRD states it should be accessible from the main app router.
      </user-request>
      <output>
        ### User Story 3: Create Settings Page
        **As a** user, **I want to** navigate to a "Settings" page, **so that** I can manage my account preferences in the future.

        **List of Files to be Created:**
        -   `src/pages/Settings.js`

        **Actions to Undertake:**
        1.  **Filepath**: `src/pages/Settings.js` (New File)
            -   **Action**: Create a placeholder React component for the Settings page.
            -   **Implementation**: `import React from 'react';

const Settings = () => {
  return <h1>Settings Page</h1>;
};

export default Settings;`
            -   **Imports**: `import React from 'react';`
        2.  **Filepath**: `src/App.js`
            -   **Action**: Add a new route for the Settings page.
            -   **Implementation**: `<Route path="/settings" element={<Settings />} />`
            -   **Imports**: `import Settings from './pages/Settings';`

        **Acceptance Criteria:**
        -   Navigating to the `/settings` URL renders the "Settings Page" heading.
        -   The application does not crash.

        **Testing Plan:**
        -   **Test Case 1**: Manually navigate to `/settings` in the browser and verify the page loads with the correct heading.
      </output>
    </example>
  </examples>
  <sections>
    <user-provided-files>
       see attached markdown files. Usually we would include the repomix file usually named 'repomix-output-all.xml' or .md or similar filename which would contain the concatenated source code and structure of the application.
	   I would also provide the prd, or high level detail of the requirement.
    </user-provided-files>
    <user-prompt>
        Following the PRD: ` ` you now have to generate backlogs for each sprint item in that PRD. ensure you undertake a detail review, web search (to add relevant api information, and implementation) before you produce each backlog. Ensure we have one new canvas for each backlog sprint item. Ensure you review and markdown or xml repomix files attached to get an understanding of the existing context.
        Create new canvas doc for sprint X and X backlog
    </user-prompt>
  </sections>
</prompt>
```

[implementation guidance template]

```
how do i implement the sprints x to x , undertake a full websearch, determine which content is suitable and then, provide code example, api information and further guidance on using external api/packages to complete the task. Review 'prd', (if available) the existing code inin your analysis. Ensure each guide is produced in their own individual canvas document
```

<instructions>

<instruction>
Step 1: Initial Repository Context Analysis.
Begin by thoroughly analyzing the entire codebase in the repository. Perform a static analysis to understand the project structure, common patterns, and key architectural components. Identify the main folders, file naming conventions, and the purpose of the primary modules. This initial, broad review is crucial for contextual understanding before focusing on specific items.
</instruction>
<instruction>
Step 2: Deconstruct the Product Requirements Document (PRD).
Review the entire PRD and identify each distinct feature, task, or user story. Create a list of these individual "sprint items". This list will serve as your master checklist for the documents you need to create.
</instruction>
<instruction>
Step 3: Begin Processing the First Sprint Item.
Select the first sprint item from the list you created in Step 2. All subsequent steps until the final instruction will be performed for this single item.
</instruction>
<instruction>
Step 4: Conduct a Detailed Review of the Sprint Item.
Focus exclusively on the selected sprint item. Read its description, acceptance criteria, and any associated notes in the PRD. Clearly define the scope and objectives of this specific item.
</instruction>
<instruction>
Step 5: Perform Targeted Web and Repository Searches.
Based on the sprint item's requirements, conduct a web search to find relevant API documentation, libraries, best practices, or potential implementation examples. Simultaneously, search within the existing codebase for any files, functions, or modules that are related to the item. This connects external research with internal context.
</instruction>
<instruction>
Step 6: Create the Backlog Markdown File.
Locate the file named [backlog template]. Create a new markdown file for the sprint item. Name it appropriately (e.g., backlog_sprint_item_name.md). Populate this new file by filling out the template using the information gathered from the PRD review (Step 4) and your research (Step 5).
</instruction>
<instruction>
Step 7: Create the Implementation Guidance Markdown File.
Locate the file named [implementation guidance template]. Create another new markdown file. Name it to correspond with the backlog item (e.g., implementation_sprint_item_name.md). Populate this file by filling out the template, focusing on the technical details, code-level suggestions, relevant API endpoints, and file paths you discovered during your searches (Step 5).
</instruction>
<instruction>
Step 8: Save the New Files.
Ensure both newly created markdown files (the backlog and the implementation guidance) are saved in the same folder where this prompt file is located.
</instruction>
<instruction>
Step 9: Repeat for All Remaining Sprint Items.
If there are more sprint items on your list from Step 2, return to Step 3 and repeat the entire process (Steps 3 through 8) for the next item. Continue this loop until a backlog and an implementation guidance file have been created for every single item on your list.
</instruction>
<instruction>
Step 10: Final Verification.
Once all sprint items have been processed, perform a final check. Verify that for every item identified in the PRD, there are exactly two corresponding markdown files (one backlog, one implementation guidance) located in the correct folder.
</instruction>

</instructions>

<notes>
<note>
Note 1: Template Adherence.
You must strictly use the provided [backlog template] and [implementation guidance template] for all generated files. Do not deviate from their structure.
</note>
<note>
Note 2: One-to-One File-to-Item Ratio.
For every single sprint item identified in the PRD, you must produce exactly one backlog markdown file and one implementation guidance markdown file.
</note>
<note>
Note 3: Naming Conventions.
All new files must follow a consistent naming convention that clearly links them to the sprint item, for example: backlog_sprint_item_name.md and implementation_sprint_item_name.md.
</note>
<note>
Note 4: File Location.
All generated markdown files must be created and saved in the exact same folder as the prompt file.
</note>
<note>
Note 5: Atomic Processing.
Each sprint item must be processed individually and completely (from detailed review to file creation) before moving to the next item. Do not batch-process steps.
</note>
<note>
Note 6: Foundational Analysis.
The initial repository context analysis (Step 1) is mandatory and must be completed before processing any sprint items. This step is critical for providing relevant and accurate guidance.
</note>
</notes>
