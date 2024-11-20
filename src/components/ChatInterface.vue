<template>
  <div class="chat-interface">
    <div class="chat-header">
      <select v-model="selectedModelId" @change="handleModelSelect">
        <option 
          v-for="model in availableModels" 
          :key="model.id" 
          :value="model.id"
        >
          {{ model.name }}
        </option>
      </select>
    </div>
    
    <div class="messages-container" ref="messagesContainer">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      <div 
        v-for="message in filteredMessages" 
        :key="message.id"
        :class="['message-item', message.role]"
      >
        <div class="avatar-container">
          <img :src="message.role === 'user' ? userAvatar : assistantAvatar" :alt="message.role">
          <span class="name">{{ message.role === 'user' ? '我' : '助手' }}</span>
        </div>
        <div class="message-content" :class="{ streaming: message === currentStreamingMessage }">
          <div class="markdown-content" v-html="renderMarkdown(message.content)"></div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      <div v-if="loading" class="loading-message">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
    
    <div class="chat-input">
      <textarea 
        v-model="inputMessage"
        @keydown.enter.prevent="sendMessage"
        :disabled="loading"
        placeholder="输入消息..."
        @input="autoResizeTextarea"
      ></textarea>
      <button 
        v-if="!loading"
        @click="sendMessage"
        :disabled="!inputMessage.trim()"
      >
        发送
      </button>
      <button 
        v-else
        @click="stopGeneration"
        class="stop-button"
      >
        停止
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { AIModel, ChatMessage } from '../types/model'
import { AIService } from '../services/ai-service'
import { StorageService } from '../utils/storage'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { debounce } from 'lodash-es'

// 导入头像
import { userAvatar, assistantAvatar } from '../assets/avatars'

const props = defineProps<{
  activeModel: AIModel | null
  availableModels: AIModel[]
}>()

const emit = defineEmits<{
  (e: 'model-change', model: AIModel): void
}>()

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const selectedModelId = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const currentStreamingMessage = ref<ChatMessage | null>(null)

// 只显示当前选中模型的消息
const filteredMessages = computed(() => 
  messages.value.filter(msg => msg.modelId === selectedModelId.value)
)

// 加载保存的消息历史
onMounted(() => {
  messages.value = StorageService.loadMessages()
  if (props.activeModel) {
    selectedModelId.value = props.activeModel.id
  }
})

const handleModelSelect = () => {
  const selectedModel = props.availableModels.find(
    model => model.id === selectedModelId.value
  )
  if (selectedModel) {
    emit('model-change', selectedModel)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || !props.activeModel) return
  
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: inputMessage.value,
    role: 'user',
    timestamp: Date.now(),
    modelId: props.activeModel.id
  }
  
  messages.value.push(userMessage)
  const currentInput = inputMessage.value
  inputMessage.value = ''
  loading.value = true
  error.value = null
  
  // 创建一个空的助手消息
  const assistantMessage: ChatMessage = {
    id: (Date.now() + 1).toString(),
    content: '',
    role: 'assistant',
    timestamp: Date.now(),
    modelId: props.activeModel.id,
    status: 'streaming'
  }
  
  // 添加到消息列表
  messages.value.push(assistantMessage)
  currentStreamingMessage.value = assistantMessage
  
  try {
    const result = await AIService.sendMessage(
      props.activeModel,
      filteredMessages.value,
      (content: string) => {
        if (currentStreamingMessage.value) {
          currentStreamingMessage.value.content = content
        }
      }
    )
    
    if (result.error === 'CANCELED') {
      // 用户主动取消，不需要显示错误
      return
    }
    
    // 保存消息历史
    StorageService.saveMessages(messages.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发送消息失败'
    inputMessage.value = currentInput
    // 移除失败的助手消息
    messages.value = messages.value.filter(msg => msg.id !== assistantMessage.id)
  } finally {
    loading.value = false
    currentStreamingMessage.value = null
  }
}

// 监听消息变化自动滚动到底部
watch(() => filteredMessages.value.length, () => {
  scrollToBottom()
}, { flush: 'post' })

const scrollToBottom = debounce(() => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, 100)

watch(() => props.activeModel, (newModel) => {
  if (newModel) {
    selectedModelId.value = newModel.id
  }
})

// 添加 markdown 渲染函数
const renderMarkdown = (content: string) => {
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: false, RETURN_DOM: false })
}

// 添加时间格式化函数
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 添加输入框自动增高
const autoResizeTextarea = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

// 添加停止生成的方法
const stopGeneration = () => {
  AIService.cancelStream()
  if (currentStreamingMessage.value && currentStreamingMessage.value.role === 'assistant') {
    currentStreamingMessage.value.status = 'completed'
  }
  loading.value = false
  currentStreamingMessage.value = null
}
</script>

<style>
/* 基础样式变量 */
:root {
  --font-mono: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  --border-radius-sm: 4px;
  --border-radius-lg: 8px;
  --spacing-base: 1rem;
  --font-size-sm: 0.9em;
  --font-size-code: 13px;
}

/* 基础 Markdown 样式 */
.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: inherit;
}

/* 代码相关样式统一 */
.code-base {
  font-family: var(--font-mono) !important;
  line-height: 1.5 !important;
}

/* 代码块样式 */
.markdown-content pre {
  background-color: #1e1e1e !important;
  border-radius: var(--border-radius-lg) !important;
  padding: var(--spacing-base) !important;
  margin: 12px 0 !important;
  overflow-x: auto !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.markdown-content pre code {
  font-family: var(--font-mono) !important;
  line-height: 1.5 !important;
  color: #d4d4d4 !important;
  font-size: var(--font-size-code) !important;
  padding: 0 !important;
  background: none !important;
}

/* 行内代码样式 */
.markdown-content code:not(pre code) {
  font-family: var(--font-mono) !important;
  line-height: 1.5 !important;
  background: rgba(175, 184, 193, 0.2) !important;
  padding: 0.2em 0.4em !important;
  border-radius: var(--border-radius-sm) !important;
  font-size: var(--font-size-sm) !important;
  color: #476582 !important;
}

/* 列表基础样式 */
.list-base {
  padding-left: 1.5em !important;
  margin: 0.5em 0 !important;
  list-style-position: outside !important;
}

.list-item-base {
  margin: 0.3em 0 !important;
  padding-left: 0.3em !important;
}

/* 用户消息样式覆盖 */
.user-message-theme {
  --text-color: white;
  --bg-color-code: rgba(0, 0, 0, 0.3);
  --border-color: rgba(255, 255, 255, 0.1);
  --code-color: #e6e9ec;
  --link-color: #79b8ff;
}

.user .markdown-content {
  color: var(--text-color) !important;
}

.user .markdown-content pre {
  background-color: var(--bg-color-code) !important;
  border-color: var(--border-color) !important;
}

.user .markdown-content pre code,
.user .markdown-content code:not(pre code) {
  color: var(--code-color) !important;
}

/* 打字机效果 */
.typing-cursor {
  content: '▋';
  display: inline-block;
  animation: blink 1s infinite;
  margin-left: 0.1em;
  vertical-align: baseline;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header select {
  width: 200px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.messages-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0 1rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.avatar-container img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid white;
  padding: 4px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.avatar-container img:hover {
  transform: scale(1.05);
}

.name {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.message-content {
  position: relative;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  max-width: calc(100% - 100px);
}

.message-content::before {
  content: '';
  position: absolute;
  top: 15px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
}

.assistant .message-content {
  min-width: calc(100% - 100px);
}

.assistant .message-content::before {
  left: -15px;
  border-right-color: white;
}

.user {
  flex-direction: row-reverse;
}

.user .message-content {
  color: white;
  min-width: 50px;
  background: #1976D2;
}

.user .message-content::before {
  right: -15px;
  border-left-color: #1976D2;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 6px;
  text-align: right;
  opacity: 0.8;
}

.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

/* 打字机效果优化 */
.message-content.streaming .markdown-content::after {
  content: '▋';
  display: inline-block;
  animation: blink 1s infinite;
  margin-left: 4px;
  color: #666;
  font-weight: 200;
}

.user .message-content.streaming::after {
  color: rgba(255, 255, 255, 0.8);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 加载动画优化 */
.loading-message {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
}

.typing-indicator {
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #90a4ae;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
  opacity: 0.6;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* 输入框优化 */
.chat-input {
  padding: 1rem;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.02);
}

textarea {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

textarea:focus {
  border-color: #1976D2;
  background: white;
  outline: none;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

button {
  padding: 10px 24px;
  background: #1976D2;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

button:hover:not(:disabled) {
  background: #1565C0;
  transform: translateY(-1px);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.stop-button {
  background: #d32f2f;
}

.stop-button:hover:not(:disabled) {
  background: #b71c1c;
}
</style> 