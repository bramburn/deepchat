<template>
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
    @click="$emit('close')"
  >
    <div 
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          Retrieved Context
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto flex-1 p-6">
        <div v-if="context.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-8">
          No context available
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="(chunk, index) in context"
            :key="index"
            :data-testid="'context-chunk'"
            class="text-sm text-gray-700 dark:text-gray-300 border-l-4 border-blue-200 dark:border-blue-600 pl-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-r-md"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Context Chunk {{ index + 1 }}
              </span>
            </div>
            <p class="whitespace-pre-wrap">{{ chunk }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

defineProps({
  context: {
    type: Array as PropType<string[]>,
    required: true,
    default: () => []
  }
})

defineEmits<{
  close: []
}>()
</script>

<style scoped>
/* Additional custom styles if needed */
.context-viewer-overlay {
  backdrop-filter: blur(2px);
}
</style>
