import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      copyText(text: string): void
      copyImage(image: string): void
      getPathForFile(file: File): string
      getWindowId(): number | null
      getWebContentsId(): number
      getContextCompressionSettings(): Promise<{
        pineconeEnv?: string
        ollamaModel?: string
      }>
      saveContextCompressionSettings(settings: {
        pineconeApiKey: string
        pineconeEnv: string
        ollamaModel: string
      }): Promise<{
        success: boolean
        error?: string
      }>
      notifyThreadDeleted(threadId: string): void
    }
    floatingButtonAPI: typeof floatingButtonAPI
  }
}
