<template>
  <div class="w-full h-full p-4">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Header -->
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-foreground">{{ t('settings.contextCompression.title') }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.contextCompression.description') }}
        </p>
      </div>

      <!-- Configuration Form -->
      <div class="space-y-6 bg-card p-6 rounded-lg border">
        <!-- Pinecone API Key -->
        <div class="space-y-2">
          <label for="pinecone-api-key" class="text-sm font-medium text-foreground">
            {{ t('settings.contextCompression.pineconeApiKey') }}
          </label>
          <Input
            id="pinecone-api-key"
            type="password"
            v-model="compressionSettings.pineconeApiKey"
            :placeholder="t('settings.contextCompression.pineconeApiKeyPlaceholder')"
            class="w-full"
          />
        </div>

        <!-- Pinecone Environment -->
        <div class="space-y-2">
          <label for="pinecone-env" class="text-sm font-medium text-foreground">
            {{ t('settings.contextCompression.pineconeEnvironment') }}
          </label>
          <Input
            id="pinecone-env"
            type="text"
            v-model="compressionSettings.pineconeEnv"
            :placeholder="t('settings.contextCompression.pineconeEnvironmentPlaceholder')"
            class="w-full"
          />
        </div>

        <!-- Pinecone Index Name -->
        <div class="space-y-2">
          <label for="pinecone-index" class="text-sm font-medium text-foreground">
            {{ t('settings.contextCompression.pineconeIndexName') }}
          </label>
          <Input
            id="pinecone-index"
            type="text"
            v-model="compressionSettings.pineconeIndexName"
            :placeholder="t('settings.contextCompression.pineconeIndexNamePlaceholder')"
            class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            {{ t('settings.contextCompression.pineconeIndexNameHint') }}
          </p>
        </div>

        <!-- Ollama Embedding Model -->
        <div class="space-y-2">
          <label for="ollama-model" class="text-sm font-medium text-foreground">
            {{ t('settings.contextCompression.ollamaModel') }}
          </label>
          <Input
            id="ollama-model"
            type="text"
            v-model="compressionSettings.ollamaModel"
            :placeholder="t('settings.contextCompression.ollamaModelPlaceholder')"
            class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            {{ t('settings.contextCompression.ollamaModelHint') }}
          </p>
        </div>

        <!-- Action Buttons and Status -->
        <div class="flex items-center gap-4">
          <Button
            @click="handleTest"
            :disabled="isSaving"
            variant="outline"
            class="px-6"
          >
            <Icon v-if="isSaving" icon="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
            Test Connection
          </Button>
          <Button
            @click="handleSave"
            :disabled="isSaving"
            class="px-6"
          >
            <Icon v-if="isSaving" icon="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSaving ? t('common.saving') : t('common.save') }}
          </Button>
          
          <div v-if="statusMessage" class="flex items-center gap-2">
            <Icon 
              :icon="statusType === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'" 
              :class="[
                'w-4 h-4',
                statusType === 'success' ? 'text-green-500' : 'text-red-500'
              ]"
            />
            <span 
              :class="[
                'text-sm',
                statusType === 'success' ? 'text-green-600' : 'text-red-600'
              ]"
            >
              {{ statusMessage }}
            </span>
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="bg-muted/50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-foreground mb-2">
          {{ t('settings.contextCompression.helpTitle') }}
        </h3>
        <ul class="text-xs text-muted-foreground space-y-1">
          <li>• {{ t('settings.contextCompression.helpPinecone') }}</li>
          <li>• {{ t('settings.contextCompression.helpOllama') }}</li>
          <li>• {{ t('settings.contextCompression.helpModel') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icon } from '@iconify/vue'

const { t } = useI18n()

// Reactive state
const compressionSettings = ref({
  pineconeApiKey: '',
  pineconeEnv: '',
  pineconeIndexName: 'deepchat-context-history',
  ollamaModel: 'nomic-embed-text'
})

const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')
const isSaving = ref(false)

// Load existing settings on mount
onMounted(async () => {
  try {
    const existingSettings = await window.api.getContextCompressionSettings()
    if (existingSettings) {
      compressionSettings.value.pineconeEnv = existingSettings.pineconeEnv || ''
      compressionSettings.value.pineconeIndexName = existingSettings.pineconeIndexName || 'deepchat-context-history'
      compressionSettings.value.ollamaModel = existingSettings.ollamaModel || 'nomic-embed-text'

      // Show placeholder if API key is already saved
      if (existingSettings.hasApiKey) {
        compressionSettings.value.pineconeApiKey = '••••••••••••••••••••••••••••••••'
      }
    }
  } catch (error) {
    console.error('Failed to load context compression settings:', error)
  }
})

// Handle save button click
const handleSave = async () => {
  if (isSaving.value) return

  // Basic validation
  if (!compressionSettings.value.pineconeApiKey.trim()) {
    statusMessage.value = t('settings.contextCompression.errors.pineconeApiKeyRequired')
    statusType.value = 'error'
    return
  }

  if (!compressionSettings.value.pineconeEnv.trim()) {
    statusMessage.value = t('settings.contextCompression.errors.pineconeEnvironmentRequired')
    statusType.value = 'error'
    return
  }

  if (!compressionSettings.value.pineconeIndexName.trim()) {
    statusMessage.value = 'Pinecone index name is required'
    statusType.value = 'error'
    return
  }

  if (!compressionSettings.value.ollamaModel.trim()) {
    statusMessage.value = t('settings.contextCompression.errors.ollamaModelRequired')
    statusType.value = 'error'
    return
  }

  isSaving.value = true
  statusMessage.value = t('settings.contextCompression.validating')
  statusType.value = 'success'

  try {
    console.log('Frontend: Attempting to save context compression settings:', {
      pineconeApiKey: compressionSettings.value.pineconeApiKey ? '[REDACTED]' : 'undefined',
      pineconeEnv: compressionSettings.value.pineconeEnv,
      pineconeIndexName: compressionSettings.value.pineconeIndexName,
      ollamaModel: compressionSettings.value.ollamaModel
    })

    // Create a plain object to avoid cloning issues with Vue reactive objects
    const settingsToSave = {
      pineconeApiKey: compressionSettings.value.pineconeApiKey,
      pineconeEnv: compressionSettings.value.pineconeEnv,
      pineconeIndexName: compressionSettings.value.pineconeIndexName,
      ollamaModel: compressionSettings.value.ollamaModel
    }

    const result = await window.api.saveContextCompressionSettings(settingsToSave)
    console.log('Frontend: Received result from backend:', result)

    if (result.success) {
      statusMessage.value = t('settings.contextCompression.saveSuccess')
      statusType.value = 'success'
      // Replace API key with placeholder to show it's been saved
      compressionSettings.value.pineconeApiKey = '••••••••••••••••••••••••••••••••'
    } else {
      console.error('Frontend: Backend returned error:', result.error)
      statusMessage.value = result.error || t('settings.contextCompression.saveError')
      statusType.value = 'error'
    }
  } catch (error) {
    console.error('Frontend: Exception occurred while saving context compression settings:', error)
    statusMessage.value = `${t('settings.contextCompression.saveError')} Error: ${error instanceof Error ? error.message : String(error)}`
    statusType.value = 'error'
  } finally {
    isSaving.value = false

    // Clear status message after 5 seconds
    setTimeout(() => {
      statusMessage.value = ''
    }, 5000)
  }
}

// Handle test connection button click
const handleTest = async () => {
  if (isSaving.value) return

  // Basic validation
  if (!compressionSettings.value.pineconeApiKey.trim()) {
    statusMessage.value = 'Pinecone API key is required for testing'
    statusType.value = 'error'
    return
  }
  if (!compressionSettings.value.pineconeEnv.trim()) {
    statusMessage.value = 'Pinecone environment is required for testing'
    statusType.value = 'error'
    return
  }
  if (!compressionSettings.value.pineconeIndexName.trim()) {
    statusMessage.value = 'Pinecone index name is required for testing'
    statusType.value = 'error'
    return
  }
  if (!compressionSettings.value.ollamaModel.trim()) {
    statusMessage.value = 'Ollama model is required for testing'
    statusType.value = 'error'
    return
  }

  isSaving.value = true
  statusMessage.value = ''

  try {
    console.log('Frontend: Testing connection with settings:', {
      pineconeApiKey: compressionSettings.value.pineconeApiKey ? '[REDACTED]' : 'undefined',
      pineconeEnv: compressionSettings.value.pineconeEnv,
      pineconeIndexName: compressionSettings.value.pineconeIndexName,
      ollamaModel: compressionSettings.value.ollamaModel
    })

    // Create a plain object to avoid cloning issues with Vue reactive objects
    const settingsToTest = {
      pineconeApiKey: compressionSettings.value.pineconeApiKey,
      pineconeEnv: compressionSettings.value.pineconeEnv,
      pineconeIndexName: compressionSettings.value.pineconeIndexName,
      ollamaModel: compressionSettings.value.ollamaModel
    }

    const result = await window.api.testContextCompressionConnection(settingsToTest)
    console.log('Frontend: Received test result from backend:', result)

    if (result.success) {
      statusMessage.value = 'Connection test successful! Both Ollama and Pinecone are working.'
      statusType.value = 'success'
    } else {
      console.error('Frontend: Backend returned test error:', result.error)
      statusMessage.value = result.error || 'Connection test failed'
      statusType.value = 'error'
    }
  } catch (error) {
    console.error('Frontend: Exception occurred during connection test:', error)
    statusMessage.value = `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
    statusType.value = 'error'
  } finally {
    isSaving.value = false

    // Clear status message after 5 seconds
    setTimeout(() => {
      statusMessage.value = ''
    }, 5000)
  }
}
</script>
