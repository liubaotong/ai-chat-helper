export interface AIModel {
  id: string;
  name: string;
  type: 'commercial' | 'local';
  apiEndpoint?: string;
  apiKey?: string;
  isActive: boolean;
}

// 增强类型定义
interface MessageBase {
  id: string
  timestamp: number
  modelId: string
}

interface UserMessage extends MessageBase {
  role: 'user'
  content: string
}

interface AssistantMessage extends MessageBase {
  role: 'assistant'
  content: string
  status: 'streaming' | 'completed' | 'failed'
}

type ChatMessage = UserMessage | AssistantMessage 
export type { ChatMessage }