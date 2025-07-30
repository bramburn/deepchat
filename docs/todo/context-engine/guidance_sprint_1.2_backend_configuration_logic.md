### Implementation Guidance: Sub-Sprint 1.2 - Backend Configuration Logic

This guide provides technical direction for implementing the backend logic to securely store and validate the context compression settings.

**Objective:** To implement the backend logic required to securely store and validate the Pinecone and Ollama configurations provided by the user.

**1. Secure Storage with `electron-store` and `electron-safe-storage`:**

Storing API keys in plain text is a major security risk. The recommended approach is to use `electron-safe-storage` to encrypt the key before saving it with `electron-store`.

**Installation:**
```bash
npm install electron-store electron-safe-storage
```

**Implementation:**
Create a dedicated presenter, e.g., `src/main/presenter/contextCompressionPresenter.ts`, to encapsulate all logic.

```typescript
// src/main/presenter/contextCompressionPresenter.ts
import { ipcMain, safeStorage } from 'electron';
import Store from 'electron-store';
import fetch from 'node-fetch';
import { Pinecone } from '@pinecone-database/pinecone';

// Define a schema for your settings for type safety
interface CompressionSettings {
  pineconeEnv?: string;
  ollamaModel?: string;
  pineconeApiKeyEncrypted?: string; // Store the encrypted key
}

const store = new Store<Record<string, CompressionSettings>>({
  name: 'config-compression',
  defaults: { settings: {} }
});

export class ContextCompressionPresenter {
  register() {
    ipcMain.handle('get-context-compression-settings', this.getSettings);
    ipcMain.handle('save-context-compression-settings', this.saveSettings);
  }

  private getSettings = () => {
    const settings = store.get('settings');
    // Exclude the encrypted key from being sent to the renderer
    return {
      pineconeEnv: settings.pineconeEnv,
      ollamaModel: settings.ollamaModel
    };
  };

  private saveSettings = async (_event, settings: { pineconeApiKey: string; pineconeEnv: string; ollamaModel: string }) => {
    // 1. Validate Ollama
    const ollamaCheck = await this.validateOllamaModel(settings.ollamaModel);
    if (!ollamaCheck.success) return ollamaCheck;

    // 2. Validate Pinecone
    const pineconeCheck = await this.validatePinecone(settings.pineconeApiKey, settings.pineconeEnv);
    if (!pineconeCheck.success) return pineconeCheck;

    // 3. Encrypt and save
    const encryptedApiKey = safeStorage.encryptString(settings.pineconeApiKey);
    store.set('settings', {
      pineconeEnv: settings.pineconeEnv,
      ollamaModel: settings.ollamaModel,
      pineconeApiKeyEncrypted: encryptedApiKey.toString('base64') // Store as base64 string
    });

    return { success: true };
  };

  private validatePinecone = async (apiKey: string, environment: string) => {
    if (!apiKey || !environment) {
        return { success: false, error: 'API Key and Environment are required.' };
    }
    try {
        const pinecone = new Pinecone({ apiKey, environment });
        await pinecone.listIndexes();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Pinecone validation failed. Check credentials.' };
    }
  };

  private validateOllamaModel = async (modelName: string) => {
     if (!modelName) {
        return { success: false, error: 'Ollama model name is required.' };
    }
    try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (!res.ok) throw new Error('Ollama server returned an error.');
        const data = await res.json();
        if (!data.models.some(m => m.name.includes(modelName))) {
            return { success: false, error: `Model '${modelName}' not found in Ollama.` };
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Could not connect to Ollama server at http://127.0.0.1:11434.' };
    }
  };

  // Method to get the decrypted key for internal use
  public static getDecryptedApiKey(): string | null {
    const encryptedKey = store.get('settings').pineconeApiKeyEncrypted;
    if (encryptedKey && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
    }
    return null;
  }
}
```

**2. Registering the Presenter:**
In your main process entry point (`src/main/presenter/index.ts` or similar):

```typescript
// src/main/presenter/index.ts
import { ContextCompressionPresenter } from './contextCompressionPresenter';

export function registerPresenters() {
  // ... other presenters
  new ContextCompressionPresenter().register();
}
```

**3. API Dependencies:**
-   **`@pinecone-database/pinecone`**: To interact with the Pinecone API.
-   **`node-fetch`**: To make HTTP requests to the local Ollama server.

**Installation:**
```bash
npm install @pinecone-database/pinecone node-fetch
```

**4. Key Considerations:**
-   **Error Handling:** Provide specific error messages back to the renderer process so the user knows exactly what went wrong (e.g., "Could not connect to Ollama," "Invalid Pinecone API Key," "Model not found").
-   **Decryption:** The `getDecryptedApiKey` method should be used carefully and only when making API calls to Pinecone. Never send the decrypted key back to the renderer process.
-   **Ollama URL:** The Ollama server URL (`http://127.0.0.1:11434`) is hardcoded for now. For future improvement, this could be made configurable.
