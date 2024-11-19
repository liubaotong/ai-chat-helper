import type { AIModel, ChatMessage } from '../types/model'

export const StorageService = {
  saveModels(models: AIModel[]): void {
    localStorage.setItem('ai-chat-models', JSON.stringify(models))
  },

  loadModels(): AIModel[] {
    const stored = localStorage.getItem('ai-chat-models')
    return stored ? JSON.parse(stored) : []
  },

  saveMessages(messages: ChatMessage[]): void {
    localStorage.setItem('ai-chat-messages', JSON.stringify(messages))
  },

  loadMessages(): ChatMessage[] {
    const stored = localStorage.getItem('ai-chat-messages')
    return stored ? JSON.parse(stored) : []
  }
} 