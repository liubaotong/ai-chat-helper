export interface AIModel {
  id: string;
  name: string;
  type: 'commercial' | 'local';
  apiEndpoint?: string;
  apiKey?: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  modelId: string;
} 