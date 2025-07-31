import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'

// Define the interface for compression settings
interface CompressionSettings {
  pineconeEnv?: string
  pineconeIndexName?: string
  ollamaModel?: string
  pineconeApiKeyEncrypted?: string // Store the encrypted key
}

// Define the interface for incoming settings from renderer
interface IncomingSettings {
  pineconeApiKey: string
  pineconeEnv: string
  pineconeIndexName: string
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
    ipcMain.handle('test-context-compression-connection', this.testConnection)
    ipcMain.on('thread-deleted', this.handleThreadDeleted)
  }

  /**
   * Get stored settings (excluding encrypted API key)
   */
  private getSettings = (): Partial<CompressionSettings> & { hasApiKey: boolean } => {
    const settings = store.get('settings')
    // Exclude the encrypted key from being sent to the renderer
    return {
      pineconeEnv: settings.pineconeEnv,
      pineconeIndexName: settings.pineconeIndexName,
      ollamaModel: settings.ollamaModel,
      hasApiKey: !!settings.pineconeApiKeyEncrypted
    }
  }

  /**
   * Save and validate settings
   */
  private saveSettings = async (
    _event: Electron.IpcMainInvokeEvent,
    settings: IncomingSettings
  ): Promise<ValidationResult> => {
    console.log('ContextCompressionPresenter: Starting settings save process')
    console.log('ContextCompressionPresenter: Received settings:', {
      pineconeApiKey: settings.pineconeApiKey ? '[REDACTED]' : 'undefined',
      pineconeEnv: settings.pineconeEnv,
      ollamaModel: settings.ollamaModel
    })

    try {
      // 1. Validate input
      console.log('ContextCompressionPresenter: Step 1 - Validating input')
      if (!settings.pineconeApiKey?.trim()) {
        console.log('ContextCompressionPresenter: Validation failed - Pinecone API key missing')
        return { success: false, error: 'Pinecone API key is required' }
      }
      if (!settings.pineconeEnv?.trim()) {
        console.log('ContextCompressionPresenter: Validation failed - Pinecone environment missing')
        return { success: false, error: 'Pinecone environment is required' }
      }
      if (!settings.pineconeIndexName?.trim()) {
        console.log('ContextCompressionPresenter: Validation failed - Pinecone index name missing')
        return { success: false, error: 'Pinecone index name is required' }
      }
      if (!settings.ollamaModel?.trim()) {
        console.log('ContextCompressionPresenter: Validation failed - Ollama model missing')
        return { success: false, error: 'Ollama model is required' }
      }

      // 2. Validate Ollama model availability
      console.log('ContextCompressionPresenter: Step 2 - Validating Ollama model:', settings.ollamaModel)
      const ollamaCheck = await this.validateOllamaModel(settings.ollamaModel)
      if (!ollamaCheck.success) {
        console.log('ContextCompressionPresenter: Ollama validation failed:', ollamaCheck.error)
        return ollamaCheck
      }
      console.log('ContextCompressionPresenter: Ollama validation passed')

      // 3. Validate Pinecone credentials
      console.log('ContextCompressionPresenter: Step 3 - Validating Pinecone credentials')
      const pineconeCheck = await this.validatePinecone(settings.pineconeApiKey, settings.pineconeEnv)
      if (!pineconeCheck.success) {
        console.log('ContextCompressionPresenter: Pinecone validation failed:', pineconeCheck.error)
        return pineconeCheck
      }
      console.log('ContextCompressionPresenter: Pinecone validation passed')

      // 4. Encrypt and save settings
      console.log('ContextCompressionPresenter: Step 4 - Encrypting and saving settings')
      if (!safeStorage.isEncryptionAvailable()) {
        console.log('ContextCompressionPresenter: Encryption not available')
        return { success: false, error: 'Encryption is not available on this system' }
      }

      const encryptedApiKey = safeStorage.encryptString(settings.pineconeApiKey)
      store.set('settings', {
        pineconeEnv: settings.pineconeEnv,
        pineconeIndexName: settings.pineconeIndexName,
        ollamaModel: settings.ollamaModel,
        pineconeApiKeyEncrypted: encryptedApiKey.toString('base64')
      })

      console.log('ContextCompressionPresenter: Settings saved successfully')
      return { success: true }
    } catch (error) {
      console.error('ContextCompressionPresenter: Error saving context compression settings:', error)
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
      // Basic format validation first
      if (!apiKey || !apiKey.trim()) {
        return { success: false, error: 'Pinecone API key is required' }
      }

      if (!environment || !environment.trim()) {
        return { success: false, error: 'Pinecone environment is required' }
      }

      // Basic API key format validation (Pinecone keys can have various formats)
      if (apiKey.length < 10) {
        return { success: false, error: 'Pinecone API key appears to be too short. Please check your key.' }
      }

      // Test actual Pinecone connection
      console.log('Testing Pinecone connection...')
      const { Pinecone } = await import('@pinecone-database/pinecone')

      const pinecone = new Pinecone({
        apiKey: apiKey.trim()
      })

      // Try to list indexes as a connectivity test
      const indexes = await pinecone.listIndexes()
      console.log(`Pinecone validation successful. Found ${indexes.indexes?.length || 0} indexes.`)

      return { success: true }
    } catch (error: any) {
      console.error('Pinecone validation error:', error)

      // Provide more specific error messages based on the error type
      const errorMessage = error.message || error.toString() || 'Unknown error'
      const errorCode = error.status || error.code

      console.error('Pinecone validation detailed error:', {
        message: errorMessage,
        code: errorCode,
        stack: error.stack
      })

      if (errorCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid API key')) {
        return {
          success: false,
          error: 'Invalid Pinecone API key. Please check your credentials.'
        }
      } else if (errorCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        return {
          success: false,
          error: 'Pinecone API key does not have sufficient permissions.'
        }
      } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: 'Cannot connect to Pinecone. Please check your internet connection.'
        }
      } else if (errorMessage.includes('timeout')) {
        return {
          success: false,
          error: 'Pinecone connection timed out. Please try again.'
        }
      } else {
        return {
          success: false,
          error: `Pinecone validation failed: ${errorMessage}`
        }
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
    return !!(settings.pineconeApiKeyEncrypted && settings.pineconeEnv && settings.pineconeIndexName && settings.ollamaModel)
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
   * Get the configured Pinecone index name
   */
  static getPineconeIndexName(): string | null {
    const settings = store.get('settings')
    return settings.pineconeIndexName || 'deepchat-context-history'
  }

  /**
   * Test connection to both Ollama and Pinecone services
   */
  private testConnection = async (
    _event: Electron.IpcMainInvokeEvent,
    settings: IncomingSettings
  ): Promise<ValidationResult> => {
    console.log('ContextCompressionPresenter: Testing connection with settings')

    try {
      // Test Ollama first
      console.log('Testing Ollama connection...')
      const ollamaResult = await this.validateOllamaModel(settings.ollamaModel)
      if (!ollamaResult.success) {
        return { success: false, error: `Ollama: ${ollamaResult.error}` }
      }

      // Test Pinecone
      console.log('Testing Pinecone connection...')
      const pineconeResult = await this.validatePinecone(settings.pineconeApiKey, settings.pineconeEnv)
      if (!pineconeResult.success) {
        return { success: false, error: `Pinecone: ${pineconeResult.error}` }
      }

      return { success: true }
    } catch (error) {
      console.error('Connection test failed:', error)
      return {
        success: false,
        error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
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
