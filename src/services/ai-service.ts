import type { AIModel, ChatMessage } from '../types/model'

export interface AIServiceResponse {
  content: string
  error?: string
}

export class AIService {
  private static async callCommercialAPI(
    model: AIModel,
    messages: ChatMessage[],
    onProgress?: (content: string) => void
  ): Promise<AIServiceResponse> {
    try {
      const requestUrl = `${model.apiEndpoint}/chat/completions`
      
      const requestBody = {
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        model: "grok-beta",
        stream: true,
        temperature: 0.7
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API调用失败: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''
              fullContent += content
              onProgress?.(fullContent)
            } catch (e) {
              console.warn('Failed to parse chunk:', data)
            }
          }
        }
      }

      return { content: fullContent }
    } catch (error) {
      console.error('API调用错误:', error)
      return {
        content: '',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  private static async callLocalAPI(
    model: AIModel,
    messages: ChatMessage[],
    onProgress?: (content: string) => void
  ): Promise<AIServiceResponse> {
    try {
      const response = await fetch(`${model.apiEndpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.name,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `本地API调用失败: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        try {
          const parsed = JSON.parse(chunk)
          const content = parsed.message?.content || ''
          fullContent += content
          onProgress?.(fullContent)
        } catch (e) {
          console.warn('Failed to parse chunk:', chunk)
        }
      }

      return { content: fullContent }
    } catch (error) {
      console.error('本地API调用错误:', error)
      return {
        content: '',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  static async sendMessage(
    model: AIModel,
    messages: ChatMessage[],
    onProgress?: (content: string) => void
  ): Promise<AIServiceResponse> {
    return model.type === 'commercial' 
      ? this.callCommercialAPI(model, messages, onProgress)
      : this.callLocalAPI(model, messages, onProgress)
  }
} 