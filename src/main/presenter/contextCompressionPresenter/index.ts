import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'

// Define the interface for compression settings
interface CompressionSettings {
  pineconeEnv?: string
  ollamaModel?: string
  pineconeApiKeyEncrypted?: string // Store the encrypted key
}

// Define the interface for incoming settings from renderer
interface IncomingSettings {
  pineconeApiKey: string
  pineconeEnv: string
  ollamaModel: string
}

// Define the interface for validation results
interface ValidationResult {
  success: boolean
  error?: string
}

// Create a store instance for context compression settings
const store = new Store<{ settings: CompressionSettings }>({
  name: 'context-compression',
  defaults: { settings: {} }
})

export class ContextCompressionPresenter {
  /**
   * Register IPC handlers for context compression
   */
  register(): void {
    ipcMain.handle('get-context-compression-settings', this.getSettings)
    ipcMain.handle('save-context-compression-settings', this.saveSettings)
    ipcMain.on('thread-deleted', this.handleThreadDeleted)
  }

  /**
   * Get stored settings (excluding encrypted API key)
   */
  private getSettings = (): Partial<CompressionSettings> => {
    const settings = store.get('settings')
    // Exclude the encrypted key from being sent to the renderer
    return {
      pineconeEnv: settings.pineconeEnv,
      ollamaModel: settings.ollamaModel
    }
  }

  /**
   * Save and validate settings
   */
  private saveSettings = async (
    _event: Electron.IpcMainInvokeEvent,
    settings: IncomingSettings
  ): Promise<ValidationResult> => {
    try {
      // 1. Validate input
      if (!settings.pineconeApiKey?.trim()) {
        return { success: false, error: 'Pinecone API key is required' }
      }
      if (!settings.pineconeEnv?.trim()) {
        return { success: false, error: 'Pinecone environment is required' }
      }
      if (!settings.ollamaModel?.trim()) {
        return { success: false, error: 'Ollama model is required' }
      }

      // 2. Validate Ollama model availability
      const ollamaCheck = await this.validateOllamaModel(settings.ollamaModel)
      if (!ollamaCheck.success) {
        return ollamaCheck
      }

      // 3. Validate Pinecone credentials
      const pineconeCheck = await this.validatePinecone(settings.pineconeApiKey, settings.pineconeEnv)
      if (!pineconeCheck.success) {
        return pineconeCheck
      }

      // 4. Encrypt and save settings
      if (!safeStorage.isEncryptionAvailable()) {
        return { success: false, error: 'Encryption is not available on this system' }
      }

      const encryptedApiKey = safeStorage.encryptString(settings.pineconeApiKey)
      store.set('settings', {
        pineconeEnv: settings.pineconeEnv,
        ollamaModel: settings.ollamaModel,
        pineconeApiKeyEncrypted: encryptedApiKey.toString('base64')
      })

      return { success: true }
    } catch (error) {
      console.error('Error saving context compression settings:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Validate Pinecone credentials by making a test API call
   */
  private validatePinecone = async (apiKey: string, environment: string): Promise<ValidationResult> => {
    try {
      // For now, we'll do a basic validation without the Pinecone SDK
      // This will be enhanced in future iterations
      if (!apiKey.startsWith('pc-') && !apiKey.startsWith('sk-')) {
        return { success: false, error: 'Invalid Pinecone API key format' }
      }

      // Basic environment validation
      if (!environment.includes('-')) {
        return { success: false, error: 'Invalid Pinecone environment format (should be like us-west1-gcp)' }
      }

      // TODO: Add actual Pinecone API validation when @pinecone-database/pinecone is available
      // For now, we'll just validate the format
      console.log('Pinecone validation passed (format check only)')
      return { success: true }
    } catch (error) {
      console.error('Pinecone validation error:', error)
      return { 
        success: false, 
        error: 'Failed to validate Pinecone credentials' 
      }
    }
  }

  /**
   * Validate Ollama model availability by querying the local server
   */
  private validateOllamaModel = async (modelName: string): Promise<ValidationResult> => {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        return { 
          success: false, 
          error: `Ollama server returned error: ${response.status} ${response.statusText}` 
        }
      }

      const data = await response.json() as { models: Array<{ name: string }> }
      
      if (!data.models || !Array.isArray(data.models)) {
        return { 
          success: false, 
          error: 'Invalid response from Ollama server' 
        }
      }

      // Check if the model exists (partial match to handle version tags)
      const modelExists = data.models.some(model => 
        model.name.includes(modelName) || modelName.includes(model.name.split(':')[0])
      )

      if (!modelExists) {
        const availableModels = data.models.map(m => m.name).join(', ')
        return { 
          success: false, 
          error: `Model '${modelName}' not found. Available models: ${availableModels}` 
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ollama validation error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        return { 
          success: false, 
          error: 'Ollama server connection timeout. Make sure Ollama is running.' 
        }
      }
      return { 
        success: false, 
        error: 'Could not connect to Ollama server at http://127.0.0.1:11434. Make sure Ollama is running.' 
      }
    }
  }

  /**
   * Get the decrypted API key for internal use
   * This method should only be used by other presenters that need to make Pinecone API calls
   */
  static getDecryptedApiKey(): string | null {
    try {
      const settings = store.get('settings')
      const encryptedKey = settings.pineconeApiKeyEncrypted
      
      if (!encryptedKey) {
        return null
      }

      if (!safeStorage.isEncryptionAvailable()) {
        console.error('Encryption is not available, cannot decrypt API key')
        return null
      }

      return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'))
    } catch (error) {
      console.error('Error decrypting Pinecone API key:', error)
      return null
    }
  }

  /**
   * Get the stored settings for internal use by other presenters
   */
  static getStoredSettings(): CompressionSettings {
    return store.get('settings')
  }

  /**
   * Check if context compression is properly configured
   */
  static isConfigured(): boolean {
    const settings = store.get('settings')
    return !!(settings.pineconeApiKeyEncrypted && settings.pineconeEnv && settings.ollamaModel)
  }

  /**
   * Get the configured Ollama model
   */
  static getOllamaModel(): string | null {
    const settings = store.get('settings')
    return settings.ollamaModel || null
  }

  /**
   * Get the configured Pinecone environment
   */
  static getPineconeEnv(): string | null {
    const settings = store.get('settings')
    return settings.pineconeEnv || null
  }

  /**
   * Handle thread deletion notification from renderer process
   * This triggers cleanup of associated vector data in Pinecone
   */
  private handleThreadDeleted = async (_event: any, threadId: string): Promise<void> => {
    if (!threadId || typeof threadId !== 'string') {
      console.warn('Received thread-deleted event with invalid threadId:', threadId)
      return
    }

    console.log(`Received notification to delete context for thread: ${threadId}`)

    try {
      // Import the ContextCompressionService to handle the deletion
      const { ContextCompressionService } = await import('../../services/ContextCompressionService')

      // Create a service instance and delete the conversation vectors
      const compressionService = new ContextCompressionService()
      const success = await compressionService.deleteConversationVectors(threadId)

      if (success) {
        console.log(`Successfully deleted context vectors for thread: ${threadId}`)
      } else {
        console.warn(`Failed to delete context vectors for thread: ${threadId}`)
      }
    } catch (error) {
      console.error('Error occurred while trying to delete thread context:', {
        error: error instanceof Error ? error.message : String(error),
        threadId
      })
    }
  }
}
