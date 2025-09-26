<script setup>
import { useGlobalMapStore } from '@/stores/globalMap.js'
import { onMounted } from 'vue'

const globalMapStore = useGlobalMapStore()

onMounted(() => {
  globalMapStore.init()
})
</script>

<template>
  <div class="app-container">
    <router-view  />
    <!-- Loading 指示器放在右上角 -->
    <div v-if="globalMapStore.loading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>
  </div>
</template>

<style lang="less">
/* 全局样式 */
.app-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 确保图层控制面板在最上层 */
.layer-control-panel {
  z-index: 1000;
}

/* Loading 指示器样式 - 右上角 */
.loading-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-weight: 500;
  white-space: nowrap;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
