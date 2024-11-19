<template>
  <div class="app-container">
    <nav class="sidebar">
      <ModelConfig @model-updated="handleModelUpdate" />
    </nav>
    <main class="main-content">
      <ChatInterface 
        :active-model="activeModel"
        :available-models="availableModels"
        @model-change="handleModelChange"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModelConfig from './components/ModelConfig.vue'
import ChatInterface from './components/ChatInterface.vue'
import type { AIModel } from './types/model'

const availableModels = ref<AIModel[]>([])
const activeModel = ref<AIModel | null>(null)

const handleModelUpdate = (models: AIModel[]) => {
  availableModels.value = models
  if (!activeModel.value && models.length > 0) {
    activeModel.value = models[0]
  }
}

const handleModelChange = (model: AIModel) => {
  activeModel.value = model
}
</script>

<style>
/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

#app {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f5f5f5;
}

.sidebar {
  width: 40%; /* 增加侧边栏宽度 */
  min-width: 500px; /* 设置最小宽度 */
  max-width: 800px; /* 设置最大宽度 */
  border-right: 1px solid #eee;
  background: #fff;
  overflow-y: auto; /* 内容过多时可滚动 */
}

.main-content {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

/* 响应式布局 */
@media (max-width: 1400px) {
  .sidebar {
    width: 45%;
    min-width: 400px;
  }
}

@media (max-width: 1200px) {
  .sidebar {
    width: 50%;
    min-width: 350px;
  }
}

@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    max-width: 100%;
    height: auto;
    min-height: 50vh;
  }
  
  .main-content {
    height: 50vh;
  }
}
</style> 