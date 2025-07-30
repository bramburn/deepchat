### User Story: Securely Save and Validate Configuration

**As a** Power User, **I want** the application to securely store my credentials and validate them, **so that** I know my settings are correct and my data is safe.

**Workflow:**
1.  The renderer process sends the configuration data (Pinecone API key, environment; Ollama model) to the main process via an IPC channel.
2.  The main process receives the data.
3.  It securely stores the Pinecone API key using `electron-store`.
4.  It attempts to validate the Pinecone credentials by making a test API call.
5.  It attempts to validate the Ollama model's availability by querying the local Ollama server.
6.  It sends a response back to the renderer process indicating success or failure with a clear error message if applicable.

**File Changes:**
-   **Create**: `src/main/presenter/contextCompressionPresenter.ts` (New file to handle all logic related to this feature).
-   **Modify**: `src/main/presenter/index.ts` (To register the new presenter and its IPC handlers).
-   **Modify**: `src/preload/index.ts` (To expose the IPC channel to the renderer).

**Actions to Undertake:**
1.  **Filepath**: `src/main/presenter/contextCompressionPresenter.ts` (New File)
    -   **Action**: Create a new class or module to manage settings. Implement a method to save settings to `electron-store`, ensuring the API key is encrypted.
    -   **Implementation**:
        ```typescript
        import Store from 'electron-store';

        // It's highly recommended to use encryption for sensitive data.
        // const store = new Store({ encryptionKey: 'your-secure-key' });
        const store = new Store(); // Basic usage

        export function saveSettings(settings) {
          // NEVER store API keys in plain text. Use electron-safe-storage or a similar library.
          // For this example, we'll just store non-sensitive parts.
          store.set('contextCompression.pineconeEnv', settings.pineconeEnv);
          store.set('contextCompression.ollamaModel', settings.ollamaModel);
          // Securely store the API key (see guidance).
        }
        ```
    -   **Imports**: `import Store from 'electron-store';`
2.  **Filepath**: `src/main/presenter/contextCompressionPresenter.ts`
    -   **Action**: Implement a function to validate Pinecone credentials.
    -   **Implementation**:
        ```typescript
        import { Pinecone } from '@pinecone-database/pinecone';

        export async function validatePinecone(apiKey, environment) {
          try {
            const pinecone = new Pinecone({ apiKey, environment });
            await pinecone.listIndexes(); // A simple call to check connectivity and auth.
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
        ```
    -   **Imports**: `import { Pinecone } from '@pinecone-database/pinecone';`
3.  **Filepath**: `src/main/presenter/contextCompressionPresenter.ts`
    -   **Action**: Implement a function to validate the Ollama model's availability.
    -   **Implementation**:
        ```typescript
        import fetch from 'node-fetch';

        export async function validateOllamaModel(modelName) {
          try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            const data = await response.json();
            const modelExists = data.models.some(m => m.name.includes(modelName));
            return { success: modelExists, error: modelExists ? null : 'Model not found' };
          } catch (error) {
            return { success: false, error: 'Ollama server not reachable.' };
          }
        }
        ```
    -   **Imports**: `import fetch from 'node-fetch';`
4.  **Filepath**: `src/main/presenter/index.ts`
    -   **Action**: Register the IPC handler for saving and validating settings.
    -   **Implementation**:
        ```typescript
        import { ipcMain } from 'electron';
        import { saveSettings, validatePinecone, validateOllamaModel } from './contextCompressionPresenter';

        ipcMain.handle('save-context-compression-settings', async (event, settings) => {
          const pineconeResult = await validatePinecone(settings.pineconeApiKey, settings.pineconeEnv);
          if (!pineconeResult.success) return pineconeResult;

          const ollamaResult = await validateOllamaModel(settings.ollamaModel);
          if (!ollamaResult.success) return ollamaResult;

          saveSettings(settings); // This should handle secure storage
          return { success: true };
        });
        ```
    -   **Imports**: `import { ipcMain } from 'electron';`

**Acceptance Criteria:**
-   Pinecone API keys are stored securely (e.g., using `electron-safe-storage` or encryption) and are not in plain text on disk.
-   The application successfully validates Pinecone credentials against the Pinecone API.
-   The application can confirm that the specified Ollama model is available on the user's local server.
-   The frontend receives a specific success or failure message after attempting to save the configuration.
-   Errors during validation are logged in the main process and a clear message is sent to the user.

**Testing Plan:**
-   **Test Case 1 (Happy Path)**: Provide valid Pinecone and Ollama details. Verify the settings are saved and a success message is returned.
-   **Test Case 2 (Invalid Pinecone Key)**: Provide an invalid Pinecone API key. Verify a "Pinecone validation failed" error is returned.
-   **Test Case 3 (Invalid Ollama Model)**: Provide a model name that doesn't exist in the local Ollama instance. Verify a "Model not found" error is returned.
-   **Test Case 4 (Ollama Offline)**: Stop the Ollama server. Try to save. Verify an "Ollama server not reachable" error is returned.
-   **Test Case 5 (Security)**: After saving, inspect the `electron-store` file to ensure the API key is not stored in plain text.
