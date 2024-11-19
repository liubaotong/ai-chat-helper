<template>
  <div class="model-config">
    <h2>模型配置</h2>
    <div class="models-list">
      <div v-for="model in models" :key="model.id" class="model-item">
        <div class="model-form">
          <div class="form-group">
            <label>模型类型:</label>
            <select v-model="model.type">
              <option value="commercial">商业模型</option>
              <option value="local">本地模型</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>模型名称:</label>
            <input 
              v-model="model.name" 
              type="text" 
              class="model-name-input"
              placeholder="请输入模型名称"
            />
          </div>
          
          <template v-if="model.type === 'commercial'">
            <div class="form-group">
              <label>API域名:</label>
              <input 
                v-model="model.apiEndpoint" 
                type="text" 
                placeholder="例如: https://api.openai.com/v1"
              />
            </div>
            <div class="form-group">
              <label>API Key:</label>
              <input 
                v-model="model.apiKey" 
                type="password" 
                placeholder="输入API密钥"
              />
            </div>
          </template>
          
          <template v-if="model.type === 'local'">
            <div class="form-group">
              <label>本地服务地址:</label>
              <input 
                v-model="model.apiEndpoint" 
                type="text" 
                placeholder="例如: http://localhost:11434"
              />
            </div>
          </template>
          
          <div class="model-actions">
            <button @click="saveModel(model)" class="save-btn">保存</button>
            <button @click="removeModel(model.id)" class="delete-btn">删除</button>
          </div>
        </div>
        
        <div v-if="model.saveError" class="error-message">
          {{ model.saveError }}
        </div>
        <Transition name="fade">
          <div v-if="model.saveSuccess" class="success-message">
            配置已保存
          </div>
        </Transition>
      </div>
    </div>
    
    <button class="add-model" @click="addNewModel">添加新模型</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { AIModel } from '../types/model'
import { StorageService } from '../utils/storage'

interface ModelWithStatus extends AIModel {
  saveError?: string;
  saveSuccess?: boolean;
}

const models = ref<ModelWithStatus[]>([])

const emit = defineEmits<{
  (e: 'model-updated', models: AIModel[]): void
}>()

// 加载保存的模型配置时，确保不包含状态信息
onMounted(() => {
  const savedModels = StorageService.loadModels()
  if (savedModels.length > 0) {
    // 清除可能存在的状态信息
    models.value = savedModels.map(model => ({
      ...model,
      saveError: undefined,
      saveSuccess: false
    }))
  }
})

const addNewModel = () => {
  models.value.push({
    id: Date.now().toString(),
    name: '',
    type: 'commercial',
    apiEndpoint: '',
    apiKey: '',
    isActive: false
  })
}

const removeModel = (id: string) => {
  models.value = models.value.filter(model => model.id !== id)
  StorageService.saveModels(models.value)
  emit('model-updated', models.value)
}

const saveModel = async (model: ModelWithStatus) => {
  // 验证必填字段
  if (!model.name?.trim()) {
    model.saveError = '请输入模型名称'
    model.saveSuccess = false
    return
  }
  
  if (!model.apiEndpoint?.trim()) {
    model.saveError = '请输入API域名或服务地址'
    model.saveSuccess = false
    return
  }
  
  if (model.type === 'commercial' && !model.apiKey?.trim()) {
    model.saveError = '请输入API Key'
    model.saveSuccess = false
    return
  }
  
  try {
    // 清除状态消息
    model.saveError = undefined
    model.saveSuccess = true
    
    // 保存到本地存储时，去除状态信息
    const modelToSave = models.value.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      apiEndpoint: m.apiEndpoint,
      apiKey: m.apiKey,
      isActive: m.isActive
    }))
    
    StorageService.saveModels(modelToSave)
    emit('model-updated', modelToSave)
    
    // 2秒后清除成功消息
    setTimeout(() => {
      if (model.saveSuccess) {
        model.saveSuccess = false
      }
    }, 2000)
  } catch (error) {
    model.saveError = '保存失败'
    model.saveSuccess = false
  }
}

// 当模型配置发生变化时不再自动保存，需要用户手动点击保存按钮
watch(models, (newModels) => {
  emit('model-updated', newModels)
}, { deep: true })
</script>

<style scoped>
.model-config {
  padding: 1rem;
  color: #333;
  background: #fff;
  max-width: 1000px; /* 增加最大宽度 */
  margin: 0 auto;
  width: 100%; /* 确保占满可用空间 */
}

.model-item {
  border: 1px solid #ddd;
  margin: 1rem 0;
  padding: 2rem; /* 增加内边距 */
  border-radius: 8px;
  background: white;
}

.model-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: grid;
  grid-template-columns: 180px 1fr; /* 增加标签宽度 */
  align-items: center;
  gap: 1.5rem; /* 增加间距 */
}

.form-group label {
  color: #333;
  text-align: right;
  font-size: 0.95em;
}

.form-group input,
.form-group select {
  padding: 0.6rem; /* 增加输入框高度 */
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  background: white;
  color: #333;
  width: 100%;
  max-width: 600px; /* 限制输入框最大宽度 */
  box-sizing: border-box;
}

.model-actions {
  display: flex;
  gap: 1rem; /* 增加按钮间距 */
  justify-content: flex-end;
  margin-top: 1.5rem; /* 增加与表单的间距 */
  padding-top: 1rem; /* 添加上边距 */
  border-top: 1px solid #eee; /* 添加分隔线 */
}

.save-btn,
.delete-btn {
  padding: 0.6rem 2rem; /* 增加按钮大小 */
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  color: white;
}

.save-btn {
  background: #4CAF50;
}

.save-btn:hover {
  background: #45a049;
}

.delete-btn {
  background: #ff4444;
}

.delete-btn:hover {
  background: #ff6666;
}

.error-message {
  color: #ff4444;
  padding: 0.5rem;
  margin-top: 1rem;
  background: #ffebee;
  border-radius: 4px;
  text-align: center;
}

.success-message {
  color: #4CAF50;
  padding: 0.5rem;
  margin-top: 1rem;
  background: #E8F5E9;
  border-radius: 4px;
  text-align: center;
}

/* 添加淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .model-config {
    max-width: 90%;
  }
}

@media (max-width: 767px) {
  .model-config {
    max-width: 100%;
    padding: 0.5rem;
  }
  
  .form-group {
    grid-template-columns: 1fr;
  }
  
  .form-group label {
    text-align: left;
  }
  
  .form-group input,
  .form-group select {
    max-width: 100%;
  }
}
</style> 